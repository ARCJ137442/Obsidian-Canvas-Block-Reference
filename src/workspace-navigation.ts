import type { App, TFile, WorkspaceLeaf } from "obsidian";

type FileLeaf = Pick<WorkspaceLeaf, "getViewState"> & { view?: unknown };

export type FileNavigationResult = "focused-existing" | "opened-new";

type LeafNavigationResult = {
	leaf: WorkspaceLeaf;
	mode: FileNavigationResult;
};

/** Canvas 视图的最小结构化类型；Obsidian 未公开完整 CanvasView 类型。 */
type CanvasNodeLike = {
	id: string;
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	getBBox?(): { minX: number; minY: number; maxX: number; maxY: number };
};
type CanvasLike = {
	nodes: Map<string, CanvasNodeLike>;
	selectOnly(node: CanvasNodeLike): void;
	zoomToSelection(): void;
	zoomToBbox?(bbox: { minX: number; minY: number; maxX: number; maxY: number }): void;
	panTo?(x: number, y: number): void;
	requestFrame?(): void;
	getViewportBBox?(): { minX: number; minY: number; maxX: number; maxY: number };
	selection?: Set<CanvasNodeLike>;
};
type CanvasViewLike = { getViewType(): string; canvas: CanvasLike; file?: { path: string } };

const CANVAS_RENDER_TIMEOUT_MS = 6_000;
const CANVAS_RENDER_POLL_MS = 50;

export function findOpenFileLeaf<T extends FileLeaf>(leaves: Iterable<T>, path: string): T | undefined {
	const targetPath = normalizeVaultPath(path);
	for (const leaf of leaves) {
		const viewPath = filePathFromView(leaf.view);
		if (viewPath && normalizeVaultPath(viewPath) === targetPath) return leaf;
		const state = leaf.getViewState().state;
		if (!isRecord(state) || typeof state.file !== "string") continue;
		if (normalizeVaultPath(state.file) === targetPath) return leaf;
	}
	return undefined;
}

export function isCanvasLeafAtPath(app: App, leaf: WorkspaceLeaf | undefined, path: string): boolean {
	if (!leaf || !app.workspace.getLeavesOfType("canvas").includes(leaf)) return false;
	const view = leaf.view as unknown as CanvasViewLike | undefined;
	return view?.getViewType() === "canvas" && view.file?.path === path;
}

/**
 * 轮换聚焦的核心导航：确定目标后「聚焦窗口 → 聚焦／新开标签页 → 聚焦节点」。
 * 打开白板后等待其渲染出目标节点，再选中并缩放到它。
 */
export async function openCanvasAndFocusNode(
	app: App,
	canvasPath: string,
	nodeId: string,
	preferOtherWindow = false,
	sourceWindowArg?: Window | null,
	replaceLeaf?: WorkspaceLeaf,
): Promise<boolean> {
	const file = app.vault.getAbstractFileByPath(canvasPath);
	// 📌 用结构守卫而非 instanceof TFile，保持「obsidian 仅类型导入」。
	if (!isCanvasFile(file)) return false;

	const result = await openCanvasAndWait(app, canvasPath, preferOtherWindow, sourceWindowArg, replaceLeaf);
	if (!result) return false;

	// 📌 等节点出现在 canvas.nodes 后，从 leaf 取「活」的 canvas 与节点，
	// 避免捕获到被替换的视图/对象（新开标签页尤其容易踩到）。
	const waitCanvas = await waitForCanvasNode(app, result.leaf, canvasPath, nodeId);
	if (!waitCanvas) return false;
	const liveView = result.leaf.view as unknown as CanvasViewLike | undefined;
	const liveCanvas = liveView?.getViewType() === "canvas" && liveView.canvas ? liveView.canvas : waitCanvas;
	const node = liveCanvas.nodes.get(nodeId);
	if (!node) return false;

	// 📌 Obsidian canvas 懒渲染：新开标签页里目标节点可能还没渲染出来，
	// 未渲染节点 select 不生效。先缩放到节点所在区域触发渲染。
	const bbox = rotationNodeBBox(node);
	if (bbox && typeof liveCanvas.zoomToBbox === "function") {
		liveCanvas.zoomToBbox(bbox);
	} else if (typeof liveCanvas.panTo === "function") {
		liveCanvas.panTo(node.x ?? 0, node.y ?? 0);
	}

	// 📌 事件驱动：渲染帧循环里「缩放节点区域 + 选中」直至生效（新标签页需反复触发渲染）。
	let selected = false;
	for (let attempt = 0; attempt < 60 && !selected; attempt++) {
		if (!isCurrentCanvas(app, result.leaf, canvasPath, liveCanvas)) return false;
		if (bbox && typeof liveCanvas.zoomToBbox === "function") liveCanvas.zoomToBbox(bbox);
		liveCanvas.selectOnly(node);
		selected = (liveCanvas.selection?.size ?? 0) > 0;
		if (!selected) await nextWindowFrame(app, result.leaf);
	}
	if (!selected) return false;
	// Native Canvas animation is suspended in hidden windows. Commit the pan through its API
	// so the selected entry is centered now; the requested zoom can render when the window shows.
	if (bbox && leafWindow(result.leaf)?.document?.hidden && typeof liveCanvas.panTo === "function") {
		liveCanvas.panTo((bbox.minX + bbox.maxX) / 2, (bbox.minY + bbox.maxY) / 2);
		return true;
	}

	// 📌 选中成功后，用 canvas 自身的渲染循环缩放聚焦整个视图到节点（F 键同款 zoomToSelection），
	// 并用「视口宽度是否收窄到节点附近」校验；未聚焦则继续重试，直到生效。
	for (let zoomAttempt = 0; zoomAttempt < 24; zoomAttempt++) {
		await nextWindowFrame(app, result.leaf, liveCanvas);
		if (!isCurrentCanvas(app, result.leaf, canvasPath, liveCanvas)) return false;
		liveCanvas.zoomToSelection();
		await nextWindowFrame(app, result.leaf);
		if (!isCurrentCanvas(app, result.leaf, canvasPath, liveCanvas)) return false;
		const viewport = liveCanvas.getViewportBBox?.();
		const nodeBBox = typeof node.getBBox === "function" ? node.getBBox() : undefined;
		if (!viewport || !nodeBBox) continue;
		const viewWidth = viewport.maxX - viewport.minX;
		const nodeWidth = nodeBBox.maxX - nodeBBox.minX;
		if (viewWidth > 0 && viewWidth < nodeWidth * 8) return true;
	}
	return true;
}

/** 打开白板并等待其成为活动 Canvas；不要求目标节点存在。 */
export async function openCanvasAndWait(
	app: App,
	canvasPath: string,
	preferOtherWindow = false,
	sourceWindowArg?: Window | null,
	replaceLeaf?: WorkspaceLeaf,
): Promise<LeafNavigationResult | undefined> {
	const file = app.vault.getAbstractFileByPath(canvasPath);
	if (!isCanvasFile(file)) return undefined;
	const result = await openOrFocusFileLeaf(app, file as TFile, preferOtherWindow, sourceWindowArg, replaceLeaf);
	if (!result) return undefined;
	if (!await waitForActiveCanvas(app, result.leaf, canvasPath)) return undefined;
	return result;
}

/** 用节点数据坐标（x/y/width/height）构造包围盒。 */
function rotationNodeBBox(node: CanvasNodeLike): { minX: number; minY: number; maxX: number; maxY: number } | undefined {
	if (node.x === undefined || node.y === undefined) return undefined;
	return {
		minX: node.x,
		minY: node.y,
		maxX: node.x + (node.width ?? 0),
		maxY: node.y + (node.height ?? 0),
	};
}

/**
 * 打开/聚焦文件标签页。
 * preferOtherWindow：从仪表盘等「锚定窗口」跳转时，优先使用「不在源窗口」的已开标签页，
 * 无已开时尽量在其他窗口新建标签页——避免反复切换仪表盘所在窗口的聚焦。
 */
async function openOrFocusFileLeaf(
	app: App,
	file: TFile,
	preferOtherWindow = false,
	sourceWindowArg?: Window | null,
	replaceLeaf?: WorkspaceLeaf,
): Promise<LeafNavigationResult | undefined> {
	if (replaceLeaf) {
		try {
			await replaceLeaf.openFile(file);
			await app.workspace.revealLeaf(replaceLeaf);
			app.workspace.setActiveLeaf(replaceLeaf, { focus: true });
			replaceLeaf.getContainer().win.focus();
			return { leaf: replaceLeaf, mode: "opened-new" };
		} catch {
			return undefined;
		}
	}
	const sourceWin = sourceWindowArg ?? sourceWindow(app);
	const leaves = new Set<WorkspaceLeaf>();
	const viewType = fileViewType(file);
	if (viewType) {
		for (const leaf of app.workspace.getLeavesOfType(viewType)) leaves.add(leaf);
	}
	app.workspace.iterateAllLeaves((leaf) => leaves.add(leaf));

	// 优先：已打开的标签页；preferOtherWindow 时优先选择不在源窗口的标签页。
	let existing = findOpenFileLeaf(leaves, file.path);
	if (existing && preferOtherWindow && leafWindow(existing) === sourceWin) {
		const otherLeaf = [...leaves].find((leaf) => leafWindow(leaf) !== sourceWin && findOpenFileLeaf([leaf], file.path));
		if (otherLeaf) existing = otherLeaf;
	}
	if (existing) {
		await app.workspace.revealLeaf(existing);
		app.workspace.setActiveLeaf(existing, { focus: true });
		existing.getContainer().win.focus();
		return { leaf: existing, mode: "focused-existing" };
	}

	// 新建标签页；preferOtherWindow 且有其他窗口时，在其他窗口创建。
	if (preferOtherWindow) {
		const otherWin = findOtherWindow(app, sourceWin);
		const otherLeaf = otherWin ? createLeafInWindow(app, otherWin) : undefined;
		if (otherLeaf) {
			await otherLeaf.openFile(file);
			await app.workspace.revealLeaf(otherLeaf);
			app.workspace.setActiveLeaf(otherLeaf, { focus: true });
			otherLeaf.getContainer().win.focus();
			return { leaf: otherLeaf, mode: "opened-new" };
		}
	}

	const leaf = app.workspace.getLeaf("tab");
	if (!leaf) return undefined;
	await leaf.openFile(file);
	await app.workspace.revealLeaf(leaf);
	app.workspace.setActiveLeaf(leaf, { focus: true });
	leaf.getContainer().win.focus();
	return { leaf, mode: "opened-new" };
}

/**
 * 导航的源窗口：取活动 leaf 所在窗口（仪表盘等可能位于 popout 窗口，不能从
 * app.workspace.containerEl 推断主窗口），兜底用工作区窗口。
 */
function sourceWindow(app: App): Window | null {
	try {
		const win = app.workspace.activeLeaf?.getContainer().win;
		if (win) return win;
	} catch {
		// fall through
	}
	return app.workspace.containerEl?.ownerDocument?.defaultView ?? null;
}

/** 返回 leaf 所属窗口。 */
function leafWindow(leaf: WorkspaceLeaf): Window | null {
	try {
		return leaf.getContainer().win ?? null;
	} catch {
		return null;
	}
}

/** 找一个「非 excludeWin」的窗口（跨窗口跳转用）；源非主窗口时优先主窗口。 */
function findOtherWindow(app: App, excludeWin: Window | null): Window | null {
	const mainWin = app.workspace.containerEl?.ownerDocument?.defaultView ?? null;
	if (mainWin && mainWin !== excludeWin) return mainWin;
	let other: Window | null = null;
	app.workspace.iterateAllLeaves((leaf) => {
		if (other) return;
		const win = leafWindow(leaf);
		if (win && win !== excludeWin) other = win;
	});
	return other;
}

/** 在指定窗口创建标签页：先激活该窗口里的一个 leaf，再 getLeaf("tab") 就落在该窗口。 */
function createLeafInWindow(app: App, win: Window): WorkspaceLeaf | undefined {
	try {
		let targetLeaf: WorkspaceLeaf | undefined;
		app.workspace.iterateAllLeaves((leaf) => {
			if (targetLeaf) return;
			if (leafWindow(leaf) === win) targetLeaf = leaf;
		});
		if (targetLeaf) app.workspace.setActiveLeaf(targetLeaf, { focus: true });
		return app.workspace.getLeaf("tab") ?? undefined;
	} catch {
		return undefined;
	}
}

/**
 * 事件驱动：等目标 canvas 成为活动视图。
 * 判断活动 leaf 的视图是否为该 canvas（不能用 getActiveFile——仪表盘等无文件视图会返回旧文件，导致误判已激活）。
 * 等待目标窗口动画帧；隐藏窗口的计时器回退保证等待有界。
 */
async function waitForActiveCanvas(app: App, leaf: WorkspaceLeaf, canvasPath: string): Promise<boolean> {
	const isActiveCanvas = () => {
		return app.workspace.activeLeaf === leaf && isCanvasLeafAtPath(app, leaf, canvasPath);
	};
	const deadline = Date.now() + CANVAS_RENDER_TIMEOUT_MS;
	while (!isActiveCanvas() && Date.now() < deadline) {
		await nextWindowFrame(app, leaf);
	}
	return isActiveCanvas();
}

async function waitForCanvasNode(app: App, leaf: WorkspaceLeaf, canvasPath: string, nodeId: string): Promise<CanvasLike | undefined> {
	const deadline = Date.now() + CANVAS_RENDER_TIMEOUT_MS;
	while (Date.now() < deadline) {
		if (!app.workspace.getLeavesOfType("canvas").includes(leaf)) return undefined;
		const view = leaf.view as unknown as CanvasViewLike | undefined;
		if (view?.getViewType() === "canvas" && view.file?.path === canvasPath) {
			const canvas = view.canvas;
			if (canvas && canvas.nodes.has(nodeId)) return canvas;
		}
		// 事件驱动：等下一渲染帧，而非固定 sleep。
		await nextWindowFrame(app, leaf);
	}
	return undefined;
}

function isCurrentCanvas(app: App, leaf: WorkspaceLeaf, path: string, canvas: CanvasLike): boolean {
	const view = leaf.view as unknown as CanvasViewLike | undefined;
	return isCanvasLeafAtPath(app, leaf, path) && view?.canvas === canvas;
}

/** Hidden windows can suspend animation frames; the timer keeps navigation bounded. */
function nextWindowFrame(app: App, leaf: WorkspaceLeaf, canvas?: CanvasLike): Promise<void> {
	const win = leafWindow(leaf) ?? app.workspace.containerEl.ownerDocument.defaultView ?? globalThis;
	return new Promise((resolve) => {
		let done = false;
		let animationFrame: number | undefined;
		const timeout = globalThis.setTimeout(() => finish(), CANVAS_RENDER_POLL_MS);
		const finish = () => {
			if (done) return;
			done = true;
			globalThis.clearTimeout(timeout);
			if (animationFrame !== undefined) win.cancelAnimationFrame(animationFrame);
			resolve();
		};
		if (typeof win.requestAnimationFrame === "function") animationFrame = win.requestAnimationFrame(finish);
		if (!done && typeof canvas?.requestFrame === "function") canvas.requestFrame();
	});
}

function isCanvasFile(file: unknown): file is { path: string; extension: string } {
	return isRecord(file)
		&& typeof file.path === "string"
		&& typeof file.extension === "string"
		&& file.extension.toLowerCase() === "canvas";
}

function fileViewType(file: TFile): string | undefined {
	const extension = file.extension.toLowerCase();
	if (extension === "md") return "markdown";
	if (extension === "canvas") return "canvas";
	return undefined;
}

function filePathFromView(view: unknown): string | undefined {
	if (!isRecord(view) || !("file" in view)) return undefined;
	const file = view.file;
	return isRecord(file) && typeof file.path === "string" ? file.path : undefined;
}

function normalizeVaultPath(path: string): string {
	return path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
