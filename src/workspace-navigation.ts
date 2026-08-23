import type { App, TFile, WorkspaceLeaf } from "obsidian";

type FileLeaf = Pick<WorkspaceLeaf, "getViewState"> & { view?: unknown };

export type FileNavigationResult = "focused-existing" | "opened-new";

type LeafNavigationResult = {
	leaf: WorkspaceLeaf;
	mode: FileNavigationResult;
};

/** Canvas 视图的最小结构化类型；Obsidian 未公开完整 CanvasView 类型。 */
type CanvasNodeLike = { id: string };
type CanvasLike = {
	nodes: Map<string, CanvasNodeLike>;
	selectOnly(node: CanvasNodeLike): void;
	zoomToSelection(): void;
};
type CanvasViewLike = { getViewType(): string; canvas: CanvasLike };

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

/**
 * 轮换聚焦的核心导航：确定目标后「聚焦窗口 → 聚焦／新开标签页 → 聚焦节点」。
 * 打开白板后等待其渲染出目标节点，再选中并缩放到它。
 */
export async function openCanvasAndFocusNode(app: App, canvasPath: string, nodeId: string): Promise<boolean> {
	const file = app.vault.getAbstractFileByPath(canvasPath);
	// 📌 用结构守卫而非 instanceof TFile，保持「obsidian 仅类型导入」。
	if (!isCanvasFile(file)) return false;

	const result = await openOrFocusFileLeaf(app, file as TFile);
	if (!result) return false;

	const canvas = await waitForCanvasNode(result.leaf, nodeId);
	if (!canvas) return false;

	const node = canvas.nodes.get(nodeId);
	if (!node) return false;

	canvas.selectOnly(node);
	canvas.zoomToSelection();
	return true;
}

async function openOrFocusFileLeaf(app: App, file: TFile): Promise<LeafNavigationResult | undefined> {
	const leaves = new Set<WorkspaceLeaf>();
	const viewType = fileViewType(file);
	if (viewType) {
		for (const leaf of app.workspace.getLeavesOfType(viewType)) leaves.add(leaf);
	}
	app.workspace.iterateAllLeaves((leaf) => leaves.add(leaf));
	const existing = findOpenFileLeaf(leaves, file.path);
	if (existing) {
		await app.workspace.revealLeaf(existing);
		app.workspace.setActiveLeaf(existing, { focus: true });
		existing.getContainer().win.focus();
		return { leaf: existing, mode: "focused-existing" };
	}

	const leaf = app.workspace.getLeaf("tab");
	if (!leaf) return undefined;
	await leaf.openFile(file);
	await app.workspace.revealLeaf(leaf);
	app.workspace.setActiveLeaf(leaf, { focus: true });
	leaf.getContainer().win.focus();
	return { leaf, mode: "opened-new" };
}

async function waitForCanvasNode(leaf: WorkspaceLeaf, nodeId: string): Promise<CanvasLike | undefined> {
	const deadline = Date.now() + CANVAS_RENDER_TIMEOUT_MS;
	while (Date.now() < deadline) {
		const view = leaf.view as unknown as CanvasViewLike | undefined;
		if (view && view.getViewType() === "canvas") {
			const canvas = view.canvas;
			if (canvas && canvas.nodes.has(nodeId)) return canvas;
		}
		await sleep(CANVAS_RENDER_POLL_MS);
	}
	return undefined;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
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
