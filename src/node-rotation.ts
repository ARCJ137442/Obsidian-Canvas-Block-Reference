import { Notice, TFile, normalizePath, type App } from "obsidian";
import type { Canvas } from "obsidian/canvas";
import {
	buildRotationSequence,
	matchesRotationColor,
	parseRotationDocument,
	rotationTargetIndex,
	type RotationAnchor,
	type RotationColorCondition,
	type RotationDocument,
	type RotationTarget,
} from "./rotation-model";
import { openCanvasAndFocusNode } from "./workspace-navigation";

/**
 * 轮换的画布集合来源：
 * - `"current"` 当前聚焦白板内；
 * - `"open"` 所有窗口内已打开的白板（去重）；
 * - 自定义路径数组（供外部插件如 life-panel 的「关注白板」传入关注集合）。
 */
export type RotationMode = "current" | "open" | string[];

/** 一次轮换所基于的画布上下文。普通命令从当前焦点解析；白板内快捷键从事件/画布解析。 */
export type CanvasFocusContext = {
	path: string;
	selectedIds: string[];
	viewport?: { minX: number; minY: number; maxX: number; maxY: number };
	selectOnly(nodeId: string): void;
};

export type NodeRotationSettings = {
	rotationColor: RotationColorCondition;
};

/** Canvas 视图的最小结构化类型；Obsidian 未公开完整 CanvasView 类型。 */
type ActiveCanvasView = {
	getViewType(): string;
	file?: { path: string };
	canvas?: {
		selection?: Set<{ id: string }>;
		nodes: Map<string, { id: string }>;
		getViewportBBox?(): { minX: number; minY: number; maxX: number; maxY: number };
		selectOnly(node: { id: string }): void;
	};
};

/**
 * 节点轮换聚焦服务。
 *
 * 行为约定：
 * - 跨白板固定顺序：按修改时间「旧→新」升序。
 * - 白板内固定顺序：节点中心点 x 升序为主、y 升序为次。
 * - 无持久游标：每次轮换前先解析「当前焦点状态」作为锚点——
 *   ① 当前白板有匹配节点选中 → 从该节点继续；
 *   ② 聚焦了白板但无匹配选中 → 第一次触发只选中离视口中心最近的匹配节点并停下，
 *      （「上一个」「下一个」行为相同），之后以该选中项为锚点继续；
 *   ③ 该白板没有任何匹配节点 → 按板界锚定；
 *   ④ 未聚焦白板 → 从集合第一个开始。
 * - 无匹配节点静默跳过；全部为空才提示。切换目标在导航前确定。
 */
export class NodeRotationService {
	constructor(
		private readonly app: App,
		private readonly getSettings: () => NodeRotationSettings,
	) {}

	/**
	 * 前进（direction=1）或后退（direction=-1）到下一个匹配节点并聚焦。
	 * 传 context 时（白板内快捷键）以它为准；否则从当前焦点状态解析。
	 */
	async advance(direction: -1 | 1, mode: RotationMode, context?: CanvasFocusContext): Promise<void> {
		if (mode === "current" && !context?.path && !this.activeCanvasPath()) {
			new Notice("⚠️ 当前未聚焦白板：无法进行白板内轮换");
			return;
		}
		const { sequence, ranges } = await this.buildSequence(mode, context);
		if (sequence.length === 0) {
			new Notice("⚠️ 没有匹配的节点：当前轮换颜色在参与白板中不存在");
			return;
		}

		const { anchor, justSelected } = await this.resolveAnchor(sequence, ranges, context);
		// 第一次触发：只选中离视口中心最近的匹配节点，停下不动（不前进、不后退）。
		if (justSelected) return;
		const targetIndex = rotationTargetIndex(anchor, direction, sequence.length);
		if (targetIndex === undefined) return;

		const target = sequence[targetIndex];
		const focused = await openCanvasAndFocusNode(this.app, target.canvasPath, target.nodeId);
		if (!focused) {
			// 📌 目标节点可能在导航间隙被删除／白板渲染超时；按「静默跳过」约定不弹提示，仅留日志便于定位。
			console.warn(`[WhiteboardArc] 轮换聚焦未命中目标节点：${target.canvasPath}#${target.nodeId}`);
		}
	}

	/** 白板内快捷键入口：从事件解析出的画布直接在当前白板内轮换。 */
	advanceFromCanvas(canvas: Canvas, direction: -1 | 1): Promise<void> {
		return this.advance(direction, "current", canvasContextFromArcCanvas(canvas));
	}

	/** 由当前焦点状态解析锚点；传入 context 时（白板内快捷键）以它为准。 */
	private async resolveAnchor(
		sequence: RotationTarget[],
		ranges: Map<string, { start: number; end: number }>,
		context?: CanvasFocusContext,
	): Promise<{ anchor: RotationAnchor; justSelected: boolean }> {
		const active = context ?? this.activeCanvas();
		if (!active) return { anchor: { kind: "none" }, justSelected: false };
		const canvasRange = ranges.get(active.path);
		if (canvasRange === undefined) return { anchor: { kind: "none" }, justSelected: false };

		// ① 选中了匹配节点：多选按轮换顺序取第一个。
		const selectedIds = new Set(active.selectedIds);
		for (let index = 0; index < sequence.length; index++) {
			const target = sequence[index];
			if (target.canvasPath === active.path && selectedIds.has(target.nodeId)) {
				return { anchor: { kind: "selected", index }, justSelected: false };
			}
		}

		// ② 聚焦白板但无匹配选中：第一次触发只选中离视口中心最近的匹配节点，停下不动。
		const nearestIndex = await this.nearestMatchingNodeIndex(sequence, active);
		if (nearestIndex !== undefined) {
			active.selectOnly(sequence[nearestIndex].nodeId);
			return { anchor: { kind: "selected", index: nearestIndex }, justSelected: true };
		}

		// ③ 该白板没有匹配节点：按板界锚定。
		return { anchor: { kind: "canvas", start: canvasRange.start }, justSelected: false };
	}

	/** 当前所聚焦窗口的活动白板及其选中节点、视口。 */
	private activeCanvas(): CanvasFocusContext | undefined {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile || activeFile.extension.toLowerCase() !== "canvas") return undefined;
		const leaf = this.app.workspace.activeLeaf as { view?: unknown } | null;
		const view = leaf?.view as ActiveCanvasView | null;
		if (view && view.getViewType() === "canvas" && view.canvas && view.file && view.file.path === activeFile.path) {
			return {
				path: activeFile.path,
				selectedIds: view.canvas.selection ? Array.from(view.canvas.selection).map((node) => node.id) : [],
				viewport: view.canvas.getViewportBBox ? view.canvas.getViewportBBox() : undefined,
				selectOnly: (nodeId) => {
					const node = view.canvas?.nodes.get(nodeId);
					if (node) view.canvas?.selectOnly(node);
				},
			};
		}
		return undefined;
	}

	/** 当前活动白板中，离视口中心最近（欧氏距离平方）的匹配节点在序列中的下标。 */
	private async nearestMatchingNodeIndex(
		sequence: RotationTarget[],
		active: CanvasFocusContext,
	): Promise<number | undefined> {
		if (!active.viewport) return undefined;
		const centerX = (active.viewport.minX + active.viewport.maxX) / 2;
		const centerY = (active.viewport.minY + active.viewport.maxY) / 2;

		const document = await this.readDocument(active.path);
		if (!document) return undefined;

		const condition = this.getSettings().rotationColor;
		let nearestId: string | undefined;
		let nearestDistance = Infinity;
		for (const node of document.nodes) {
			if (!matchesRotationColor(node.color, condition)) continue;
			const cx = (node.x ?? 0) + (node.width ?? 0) / 2;
			const cy = (node.y ?? 0) + (node.height ?? 0) / 2;
			const distance = (cx - centerX) ** 2 + (cy - centerY) ** 2;
			if (distance < nearestDistance) {
				nearestDistance = distance;
				nearestId = node.id;
			}
		}
		if (nearestId === undefined) return undefined;

		const index = sequence.findIndex((target) => target.canvasPath === active.path && target.nodeId === nearestId);
		return index < 0 ? undefined : index;
	}

	private async buildSequence(mode: RotationMode, context?: CanvasFocusContext): Promise<{
		sequence: RotationTarget[];
		ranges: Map<string, { start: number; end: number }>;
	}> {
		const files = await this.resolveCanvases(mode, context);
		const documents: RotationDocument[] = [];
		for (const file of files) {
			const document = await this.readDocument(file.path);
			if (document) documents.push(document);
		}
		const condition = this.getSettings().rotationColor;
		const sequence = buildRotationSequence(documents, condition);
		// 记录每块白板在扁平序列中的区间（无匹配节点时 start===end，便于按板界锚定）。
		const ranges = new Map<string, { start: number; end: number }>();
		let offset = 0;
		for (const document of documents) {
			const count = document.nodes.filter((node) => matchesRotationColor(node.color, condition)).length;
			ranges.set(document.path, { start: offset, end: offset + count });
			offset += count;
		}
		return { sequence, ranges };
	}

	private async readDocument(path: string): Promise<RotationDocument | undefined> {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile) || file.extension.toLowerCase() !== "canvas") return undefined;
		try {
			const raw = await this.app.vault.cachedRead(file);
			return parseRotationDocument(raw, file.path);
		} catch (error) {
			console.warn(`[WhiteboardArc] 读取白板失败：${path}`, error);
			return undefined;
		}
	}

	private async resolveCanvases(mode: RotationMode, context?: CanvasFocusContext): Promise<TFile[]> {
		const paths = typeof mode === "string"
			? mode === "open"
				? this.openCanvasPaths()
				: (context?.path ? [context.path] : this.currentCanvasPaths())
			: mode;
		return paths
			.map((path) => this.app.vault.getAbstractFileByPath(normalizePath(path)))
			.filter((file): file is TFile => file instanceof TFile && file.extension.toLowerCase() === "canvas")
			// 旧→新升序；mtime 相同时用路径做确定性兜底排序。
			.sort((left, right) => left.stat.mtime - right.stat.mtime
				|| left.path.localeCompare(right.path, "zh-CN"));
	}

	private activeCanvasPath(): string | undefined {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile || activeFile.extension.toLowerCase() !== "canvas") return undefined;
		return activeFile.path;
	}

	private currentCanvasPaths(): string[] {
		const path = this.activeCanvasPath();
		return path ? [path] : [];
	}

	private openCanvasPaths(): string[] {
		const paths = new Set<string>();
		this.app.workspace.iterateAllLeaves((leaf) => {
			const view = leaf.view as { getViewType(): string; file?: TFile } | null;
			if (!view || view.getViewType() !== "canvas") return;
			if (view.file instanceof TFile && view.file.extension.toLowerCase() === "canvas") {
				paths.add(view.file.path);
			}
		});
		return [...paths];
	}
}

/** 从 arc 的 Canvas 运行时对象构建轮换画布上下文。 */
function canvasContextFromArcCanvas(canvas: Canvas): CanvasFocusContext {
	const view = canvas.view as { file?: { path: string } };
	return {
		path: view.file?.path ?? "",
		selectedIds: canvas.selection ? Array.from(canvas.selection).map((node) => node.id) : [],
		viewport: typeof canvas.getViewportBBox === "function" ? canvas.getViewportBBox() : undefined,
		selectOnly: (nodeId) => {
			const node = canvas.nodes.get(nodeId);
			if (node) canvas.selectOnly(node);
		},
	};
}
