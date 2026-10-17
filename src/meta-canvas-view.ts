import { ItemView, Notice, setIcon, TFile, type App, type WorkspaceLeaf } from "obsidian";
import { canvasReferenceEdgeKey, layoutCanvasReferenceGraph, resolveCanvasCardPosition, resolveMetaCanvasNodeSize, META_CANVAS_NODE_HEIGHT, META_CANVAS_NODE_WIDTH, type CanvasGraphLayout, type CanvasGraphNodeSize, type CanvasGraphNodeSizeMap, type CanvasGraphPositionMap, type MetaCanvasLayoutMode, type MetaCanvasNodeShapeMode } from "./canvas-reference-layout";
import type { CanvasReferenceGraph, CanvasReferenceService } from "./canvas-reference-service";
import type { CanvasReferenceGraphEdge, CanvasReferenceOccurrence } from "./canvas-reference-model";
import { canvasSnapshotAspectRatio, renderCanvasThumbnail } from "./canvas-thumbnail";
import { showMetaCanvasLayoutMenu } from "./meta-canvas-layout-menu";
import { CompatibilityClickGuard, MetaCanvasInteractionController, ViewportMotion, type CanvasPoint, type PointerTarget, type ViewportTransform } from "./meta-canvas-interaction";

export const META_CANVAS_VIEW_TYPE = "arc-meta-canvas";
const MIN_ZOOM = 0.28;
const MAX_ZOOM = 2.4;
const ZOOM_STEP = 1.16;

type MetaCanvasActions = {
	getPositions(): CanvasGraphPositionMap;
	setPositions(positions: CanvasGraphPositionMap): Promise<void>;
	getLayoutMode(): MetaCanvasLayoutMode;
	setLayoutMode(mode: MetaCanvasLayoutMode): Promise<void>;
	getNodeShapeMode(): MetaCanvasNodeShapeMode;
	setNodeShapeMode(mode: MetaCanvasNodeShapeMode): Promise<void>;
	openReferences(entries: readonly CanvasReferenceOccurrence[], fromPath: string, sourceLeaf: WorkspaceLeaf): void;
};

type PointerPoint = CanvasPoint;

export class MetaCanvasView extends ItemView {
	private graph?: CanvasReferenceGraph;
	private layout?: CanvasGraphLayout;
	private positions: CanvasGraphPositionMap = {};
	private manualPositions: CanvasGraphPositionMap = {};
	private selectedPath?: string;
	private selectedEdgeKey?: string;
	private hoveredPath?: string;
	private hoveredEdgeKey?: string;
	private viewport?: HTMLElement;
	private world?: HTMLElement;
	private scene?: HTMLElement;
	private edgeSvg?: SVGSVGElement;
	private detailEl?: HTMLElement;
	private detailToggleEl?: HTMLButtonElement;
	private detailCollapsed = true;
	private renderRevision = 0;
	private zoom = 0.7;
	private panX = 32;
	private panY = 32;
	private interaction?: MetaCanvasInteractionController;
	private motion?: ViewportMotion;
	private fitFrame?: number;
	private windowInteractionCleanup?: () => void;
	private readonly compatibilityClicks = new CompatibilityClickGuard<Element>();
	private unsubscribe?: () => void;
	private saveTimer?: number;
	private readonly boardElements = new Map<string, HTMLButtonElement>();
	private readonly edgeElements = new Map<string, SVGPathElement>();
	private readonly edgeHitElements = new Map<string, SVGPathElement>();
	private readonly pointerTargets = new Map<number, Exclude<PointerTarget, { kind: "excluded" }>>();
	private lastTouchTap?: { key: string; point: PointerPoint; at: number };

	constructor(
		leaf: WorkspaceLeaf,
		private readonly references: CanvasReferenceService,
		private readonly actions: MetaCanvasActions,
	) {
		super(leaf);
		this.icon = "git-fork";
	}

	getViewType(): string { return META_CANVAS_VIEW_TYPE; }
	getDisplayText(): string { return "元白板"; }

	refreshLayoutOptions(): void {
		this.manualPositions = this.actions.getPositions();
		this.renderView(true);
	}

	async onOpen(): Promise<void> {
		this.unsubscribe = this.references.onChange(() => this.scheduleRefresh());
		this.register(() => this.unsubscribe?.());
		this.positions = this.actions.getPositions();
		await this.refreshGraph(true);
	}

	async onClose(): Promise<void> {
		this.renderRevision += 1;
		this.cleanupViewportInteraction();
		if (this.saveTimer !== undefined) this.contentEl.ownerDocument.defaultView?.clearTimeout(this.saveTimer);
		this.unsubscribe?.();
		this.unsubscribe = undefined;
		this.boardElements.clear();
		this.edgeElements.clear();
		this.edgeHitElements.clear();
		this.detailEl = undefined;
		this.detailToggleEl = undefined;
		this.contentEl.empty();
	}

	private scheduleRefresh(): void {
		const win = this.contentEl.ownerDocument.defaultView;
		if (this.saveTimer !== undefined) win?.clearTimeout(this.saveTimer);
		this.saveTimer = win?.setTimeout(() => {
			this.saveTimer = undefined;
			void this.refreshGraph(false);
		}, 120);
	}

	private async refreshGraph(initial: boolean): Promise<void> {
		const revision = ++this.renderRevision;
		try {
			const graph = await this.references.getGraph();
			if (revision !== this.renderRevision) return;
			const fitAfterRender = initial || !this.graph;
			this.graph = graph;
			this.manualPositions = this.actions.getPositions();
			this.renderView(fitAfterRender);
		} catch (error) {
			if (revision !== this.renderRevision) return;
			console.error("[WhiteboardArc] 元白板渲染失败。", error);
			new Notice(`元白板读取失败：${error instanceof Error ? error.message : String(error)}`);
			this.renderError(error);
		}
	}

	private renderView(initial: boolean): void {
		this.cleanupViewportInteraction();
		this.contentEl.empty();
		this.contentEl.addClass("arc-meta-canvas-view");
		const graph = this.graph;
		if (!graph) return;
		const root = this.contentEl.createDiv({ cls: "arc-meta-canvas-root" });
		const viewport = root.createDiv({
			cls: "arc-meta-canvas-viewport",
			attr: { tabindex: "0", role: "application", "aria-label": "全局引用；中键或右键拖动平移，触摸拖动，双指缩放", "data-ignore-swipe": "true" },
		});
		this.viewport = viewport;
		if (graph.boards.length === 0) {
			const empty = viewport.createDiv({ cls: "arc-meta-canvas-empty" });
			empty.createEl("strong", { text: "还没有白板" });
			empty.createEl("span", { text: "Vault 中没有可加入元白板的 .canvas 文件。" });
			return;
		}

		const canvasPaths = new Set(graph.boards.map((board) => board.path));
		const cleanedManualPositions: CanvasGraphPositionMap = {};
		for (const [path, position] of Object.entries(this.manualPositions)) {
			if (canvasPaths.has(path)) cleanedManualPositions[path] = position;
		}
		if (Object.keys(cleanedManualPositions).length !== Object.keys(this.manualPositions).length) {
			this.manualPositions = cleanedManualPositions;
			void this.actions.setPositions(cleanedManualPositions).catch((error) => new Notice(`元白板位置清理失败：${error instanceof Error ? error.message : String(error)}`));
		}
		const nodeSizes: CanvasGraphNodeSizeMap = {};
		const shapeMode = this.actions.getNodeShapeMode();
		for (const board of graph.boards) {
			nodeSizes[board.path] = resolveMetaCanvasNodeSize(canvasSnapshotAspectRatio(board.snapshot.nodes), shapeMode);
		}
		const layout = layoutCanvasReferenceGraph(
			graph.boards.map((board) => board.path),
			graph.edges,
			this.manualPositions,
			{ mode: this.actions.getLayoutMode(), nodeSizes },
		);
		this.layout = layout;
		this.positions = layout.positions;
		this.boardElements.clear();
		this.edgeElements.clear();
		this.edgeHitElements.clear();
		const scene = viewport.createDiv({ cls: "arc-meta-canvas-scene" });
		scene.style.width = `${layout.width}px`;
		scene.style.height = `${layout.height}px`;
		const world = scene.createDiv({ cls: "arc-meta-canvas-world" });
		world.style.width = `${layout.width}px`;
		world.style.height = `${layout.height}px`;
		this.scene = scene;
		this.world = world;
		this.edgeSvg = this.contentEl.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
		this.edgeSvg.classList.add("arc-meta-canvas-edges");
		this.edgeSvg.setAttribute("width", String(layout.width));
		this.edgeSvg.setAttribute("height", String(layout.height));
		this.edgeSvg.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
		world.appendChild(this.edgeSvg);
		for (const board of graph.boards) this.renderBoardCard(world, board.path, board.name, board.snapshot, board.taskHue, graph.edges, layout.positions[board.path], layout.nodeSizes[board.path]);
		this.drawEdges(graph.edges, layout.positions, layout.edgeRoutes, graph.boards);

		const title = root.createDiv({ cls: "arc-meta-canvas-title" });
		title.createEl("strong", { text: "全局引用" });
		title.createEl("span", { text: `${graph.boards.length} 张白板 · ${graph.edges.length} 组关系` });
		const controls = root.createDiv({ cls: "arc-meta-canvas-controls" });
		this.addControl(controls, "−", "缩小", () => this.setZoom(this.zoom / ZOOM_STEP));
		this.addControl(controls, "+", "放大", () => this.setZoom(this.zoom * ZOOM_STEP));
		this.addControl(controls, "⛶", "适配全部白板", () => this.fitGraph());
		this.addControl(controls, "↻", "重新读取白板关系", () => this.references.invalidate());
		this.addLayoutMenuControl(controls);
		this.detailEl = root.createDiv({ cls: "arc-meta-canvas-detail" });
		this.renderDetails();
		this.detailToggleEl = root.createEl("button", {
			cls: "arc-meta-canvas-detail-toggle",
			text: this.detailCollapsed ? "详情" : "收起",
			attr: { type: "button", "aria-expanded": String(!this.detailCollapsed), "aria-controls": "arc-meta-canvas-detail", "aria-label": this.detailCollapsed ? "展开白板详情" : "收起白板详情" },
		});
		this.detailEl.id = "arc-meta-canvas-detail";
		this.detailToggleEl.disabled = !this.selectedPath;
		this.detailToggleEl.addEventListener("click", () => this.toggleDetail());
		this.applyDetailState(root);
		viewport.addEventListener("click", (event) => {
			const target = event.target as Element | null;
			if (target?.closest?.(".arc-meta-canvas-board-card, .arc-meta-canvas-edge-hit")) return;
			this.clearSelection();
		});
		this.applyTransform();
		this.bindViewport(viewport);
		if (initial) this.scheduleInitialFit(viewport);
	}

	private renderBoardCard(
		parent: HTMLElement,
		path: string,
		name: string,
		snapshot: CanvasReferenceGraph["boards"][number]["snapshot"],
		taskHue: number | undefined,
		edges: CanvasReferenceGraphEdge[],
		position: PointerPoint | undefined,
		size: CanvasGraphNodeSize | undefined,
	): void {
		if (!position || !size) return;
		const related = edges.filter((edge) => edge.sourceCanvasPath === path || edge.targetCanvasPath === path);
		const pinned = Object.prototype.hasOwnProperty.call(this.manualPositions, path);
		const accent = taskHue === undefined ? "var(--background-modifier-border)" : `hsl(${taskHue} 48% 43%)`;
		const card = parent.createEl("button", {
			cls: "arc-meta-canvas-board-card",
			attr: { type: "button", "data-canvas-path": path, "aria-label": `${name}，${snapshot.nodes.length} 个节点，${related.length} 条白板关系${pinned ? "，手动固定位置" : ""}` },
		});
		card.toggleClass("is-pinned", pinned);
		card.style.left = `${position.x}px`;
		card.style.top = `${position.y}px`;
		card.style.width = `${size.width}px`;
		card.style.height = `${size.height}px`;
		card.style.setProperty("--arc-meta-canvas-accent", accent);
		this.boardElements.set(path, card);
		const heading = card.createDiv({ cls: "arc-meta-canvas-board-heading" });
		heading.createEl("strong", { text: name, attr: { title: path } });
		const pin = heading.createSpan({ cls: "arc-meta-canvas-board-pin", attr: { title: "手动固定位置", "aria-hidden": "true" } });
		setIcon(pin, "pin");
		const preview = card.createDiv({ cls: "arc-meta-canvas-board-preview" });
		renderCanvasThumbnail(preview, snapshot, { className: "arc-meta-canvas-thumbnail" });
		card.addEventListener("click", (event) => {
			if (this.consumeCompatibilityClick(card, event.detail)) {
				event.preventDefault();
				event.stopPropagation();
				return;
			}
			this.selectBoard(path);
		});
		card.addEventListener("dblclick", (event) => {
			if (this.consumeCompatibilityClick(card, event.detail)) {
				event.preventDefault();
				event.stopPropagation();
				return;
			}
			event.preventDefault();
			void this.openBoard(path);
		});
		card.addEventListener("pointerenter", () => { if (this.hasHoverSupport()) this.setHoverPath(path); });
		card.addEventListener("pointerleave", () => { if (this.hasHoverSupport()) this.setHoverPath(undefined); });
		card.addEventListener("focus", () => this.setHoverPath(path));
		card.addEventListener("blur", () => this.setHoverPath(undefined));
		card.addEventListener("keydown", (event) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				this.selectBoard(path);
			}
		});
	}

	private renderDetails(): void {
		const parent = this.detailEl;
		if (!parent) return;
		parent.empty();
		const graph = this.graph;
		const board = graph?.boards.find((item) => item.path === this.selectedPath);
		if (!board || !graph) return;

		const heading = parent.createDiv({ cls: "arc-meta-canvas-detail-heading" });
		heading.createEl("span", { text: "白板" });
		heading.createEl("strong", { text: board.name, attr: { title: board.path } });
		parent.createEl("p", { cls: "arc-meta-canvas-detail-path", text: board.path, attr: { title: board.path } });

		const incoming = graph.edges.filter((edge) => edge.targetCanvasPath === board.path);
		const outgoing = graph.edges.filter((edge) => edge.sourceCanvasPath === board.path);
		const summary = parent.createEl("p", { cls: "arc-meta-canvas-detail-summary" });
		summary.setText(`${board.snapshot.nodes.length} 节点 · ${board.snapshot.edges.length} 连边 · ${incoming.length} 入 · ${outgoing.length} 出`);

		const actions = parent.createDiv({ cls: "arc-meta-canvas-detail-actions" });
		this.addDetailAction(actions, "打开白板", () => { void this.openBoard(board.path); }, true);
		this.addDetailAction(actions, "回溯入口", () => { void this.backtrackBoard(board.path); });
		this.renderRelationGroup(parent, "引用来源", incoming, true);
		this.renderRelationGroup(parent, "引用目标", outgoing, false);
	}

	private renderRelationGroup(parent: HTMLElement, title: string, edges: CanvasReferenceGraphEdge[], incoming: boolean): void {
		const section = parent.createDiv({ cls: "arc-meta-canvas-detail-section" });
		section.createEl("h3", { text: `${title} · ${edges.length}` });
		if (edges.length === 0) {
			section.createEl("p", { cls: "arc-meta-canvas-detail-empty", text: "无" });
			return;
		}
		const list = section.createEl("ul");
		for (const edge of edges) {
			const item = list.createEl("li");
			const neighborPath = incoming ? edge.sourceCanvasPath : edge.targetCanvasPath;
			const neighbor = this.graph?.boards.find((candidate) => candidate.path === neighborPath);
			const label = edge.occurrences.length > 1 ? `${edge.occurrences.length} 处` : "";
			const button = item.createEl("button", {
				cls: "arc-meta-canvas-detail-link",
				text: `${neighbor?.name ?? basename(neighborPath)}${label ? ` · ${label}` : ""}`,
				attr: { type: "button", title: neighborPath },
			});
			button.addEventListener("click", () => {
				if (incoming) {
					this.selectEdge(canvasReferenceEdgeKey(edge.sourceCanvasPath, edge.targetCanvasPath));
					this.actions.openReferences(edge.occurrences, edge.targetCanvasPath, this.leaf);
				} else {
					this.selectBoard(neighborPath);
					this.centerBoard(neighborPath);
				}
			});
		}
	}

	private addDetailAction(parent: HTMLElement, text: string, action: () => void, primary = false): void {
		const button = parent.createEl("button", {
			cls: `arc-meta-canvas-detail-action${primary ? " is-primary" : ""}`,
			text,
			attr: { type: "button" },
		});
		button.addEventListener("click", action);
	}

	private selectBoard(path: string): void {
		this.selectedPath = path;
		this.selectedEdgeKey = undefined;
		this.renderDetails();
		this.applyDetailState();
		this.applyVisualFocus();
	}

	private selectEdge(key: string): void {
		this.selectedEdgeKey = key;
		this.applyVisualFocus();
	}

	private clearSelection(): void {
		if (!this.selectedPath && !this.selectedEdgeKey) return;
		this.selectedPath = undefined;
		this.selectedEdgeKey = undefined;
		this.renderDetails();
		this.applyDetailState();
		this.applyVisualFocus();
	}

	private setHoverPath(path: string | undefined): void {
		if (this.hoveredPath === path) return;
		this.hoveredPath = path;
		this.applyVisualFocus();
	}

	private setHoveredEdge(key: string | undefined): void {
		if (this.hoveredEdgeKey === key) return;
		this.hoveredEdgeKey = key;
		this.applyVisualFocus();
	}

	private hasHoverSupport(): boolean {
		return this.contentEl.ownerDocument.defaultView?.matchMedia("(hover: hover)").matches ?? false;
	}

	private applyVisualFocus(): void {
		const graph = this.graph;
		const selectedNeighbors = new Set<string>();
		const selectedBoardEdges = new Set<string>();
		const hoveredNodeEdges = new Set<string>();
		const hoveredEdge = graph?.edges.find((edge) => canvasReferenceEdgeKey(edge.sourceCanvasPath, edge.targetCanvasPath) === this.hoveredEdgeKey);
		const selectedEdge = graph?.edges.find((edge) => canvasReferenceEdgeKey(edge.sourceCanvasPath, edge.targetCanvasPath) === this.selectedEdgeKey);
		if (this.selectedPath && graph) {
			selectedNeighbors.add(this.selectedPath);
			for (const edge of graph.edges) {
				if (edge.sourceCanvasPath !== this.selectedPath && edge.targetCanvasPath !== this.selectedPath) continue;
				selectedBoardEdges.add(canvasReferenceEdgeKey(edge.sourceCanvasPath, edge.targetCanvasPath));
				selectedNeighbors.add(edge.sourceCanvasPath === this.selectedPath ? edge.targetCanvasPath : edge.sourceCanvasPath);
			}
		}
		if (this.hoveredPath && graph) {
			for (const edge of graph.edges) {
				if (edge.sourceCanvasPath === this.hoveredPath || edge.targetCanvasPath === this.hoveredPath) {
					hoveredNodeEdges.add(canvasReferenceEdgeKey(edge.sourceCanvasPath, edge.targetCanvasPath));
				}
			}
		}
		for (const [path, card] of this.boardElements) {
			card.toggleClass("is-focus-anchor", path === this.selectedPath);
			card.toggleClass("is-focus-path", selectedNeighbors.has(path) && path !== this.selectedPath);
			card.toggleClass("is-hovered", path === this.hoveredPath);
			card.toggleClass("is-hover-edge-endpoint", Boolean(hoveredEdge && (path === hoveredEdge.sourceCanvasPath || path === hoveredEdge.targetCanvasPath)));
			card.toggleClass("is-selected-edge-endpoint", Boolean(selectedEdge && (path === selectedEdge.sourceCanvasPath || path === selectedEdge.targetCanvasPath)));
		}
		for (const [key, edgeEl] of this.edgeElements) {
			edgeEl.classList.toggle("is-focus-path", selectedBoardEdges.has(key) || key === this.selectedEdgeKey);
			edgeEl.classList.toggle("is-hovered", hoveredNodeEdges.has(key) || key === this.hoveredEdgeKey);
		}
	}

	private centerBoard(path: string): void {
		const viewport = this.viewport;
		const position = this.positions[path];
		if (!viewport || !position) return;
		const size = this.layout?.nodeSizes[path] ?? { width: META_CANVAS_NODE_WIDTH, height: META_CANVAS_NODE_HEIGHT };
		this.motion?.setImmediate({
			zoom: this.zoom,
			panX: viewport.clientWidth / 2 - (position.x + size.width / 2) * this.zoom,
			panY: viewport.clientHeight / 2 - (position.y + size.height / 2) * this.zoom,
		});
	}

	private toggleDetail(): void {
		if (!this.selectedPath) return;
		this.detailCollapsed = !this.detailCollapsed;
		this.applyDetailState();
	}

	private applyDetailState(root: HTMLElement = this.contentEl.querySelector(".arc-meta-canvas-root") as HTMLElement): void {
		root?.classList.toggle("is-detail-collapsed", this.detailCollapsed);
		root?.classList.toggle("is-detail-empty", !this.selectedPath);
		const toggle = this.detailToggleEl;
		if (!toggle) return;
		toggle.disabled = !this.selectedPath;
		toggle.hidden = !this.selectedPath;
		toggle.setText(this.detailCollapsed ? "详情" : "收起");
		toggle.setAttr("aria-expanded", String(!this.detailCollapsed));
		toggle.setAttr("aria-label", this.detailCollapsed ? "展开白板详情" : "收起白板详情");
	}

	private drawEdges(
		edges: CanvasReferenceGraphEdge[],
		positions: CanvasGraphPositionMap,
		routes: CanvasGraphLayout["edgeRoutes"],
		boards: CanvasReferenceGraph["boards"],
	): void {
		const svg = this.edgeSvg;
		if (!svg) return;
		while (svg.firstChild) svg.removeChild(svg.firstChild);
		this.edgeElements.clear();
		this.edgeHitElements.clear();
		const ownerDocument = svg.ownerDocument;
		const defs = ownerDocument.createElementNS("http://www.w3.org/2000/svg", "defs");
		svg.appendChild(defs);
		for (const [index, edge] of edges.entries()) {
			const from = positions[edge.sourceCanvasPath];
			const to = positions[edge.targetCanvasPath];
			if (!from || !to) continue;
			const key = canvasReferenceEdgeKey(edge.sourceCanvasPath, edge.targetCanvasPath);
			const route = Object.keys(this.manualPositions).length === 0 ? routes[key] : undefined;
			const fallbackSize = { width: META_CANVAS_NODE_WIDTH, height: META_CANVAS_NODE_HEIGHT };
			const geometry = edgeGeometry(
				from,
				to,
				route,
				this.layout?.nodeSizes[edge.sourceCanvasPath] ?? fallbackSize,
				this.layout?.nodeSizes[edge.targetCanvasPath] ?? fallbackSize,
			);
			const sourceBoard = boards.find((board) => board.path === edge.sourceCanvasPath);
			const edgeColor = sourceBoard?.taskHue === undefined
				? "var(--text-faint, #8b919c)"
				: `hsl(${sourceBoard.taskHue} 38% 62%)`;
			const markerId = `arc-meta-canvas-arrow-${index}`;
			const marker = ownerDocument.createElementNS("http://www.w3.org/2000/svg", "marker");
			marker.id = markerId;
			marker.setAttribute("viewBox", "0 0 10 10");
			marker.setAttribute("refX", "9");
			marker.setAttribute("refY", "5");
			marker.setAttribute("markerWidth", "7");
			marker.setAttribute("markerHeight", "7");
			marker.setAttribute("markerUnits", "userSpaceOnUse");
			marker.setAttribute("orient", "auto");
			const arrow = ownerDocument.createElementNS("http://www.w3.org/2000/svg", "path");
			arrow.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
			arrow.setAttribute("fill", edgeColor);
			marker.appendChild(arrow);
			defs.appendChild(marker);

			const visible = ownerDocument.createElementNS("http://www.w3.org/2000/svg", "path");
			visible.setAttribute("d", geometry.path);
			visible.setAttribute("class", "arc-meta-canvas-edge");
			visible.setAttribute("marker-end", `url(#${markerId})`);
			visible.style.setProperty("--arc-meta-edge-color", edgeColor);
			const referenceCounts = countReferenceKinds(edge);
			const visibleTitle = ownerDocument.createElementNS("http://www.w3.org/2000/svg", "title");
			const sourceName = sourceBoard?.name ?? basename(edge.sourceCanvasPath);
			const targetName = basename(edge.targetCanvasPath);
			visibleTitle.textContent = edge.occurrences.length > 1
				? `${sourceName} → ${targetName} · ${edge.occurrences.length} 处入口`
				: `${sourceName} → ${targetName}`;
			visible.appendChild(visibleTitle);
			svg.appendChild(visible);
			this.edgeElements.set(key, visible);

			const hit = ownerDocument.createElementNS("http://www.w3.org/2000/svg", "path");
			hit.setAttribute("d", geometry.path);
			hit.setAttribute("class", "arc-meta-canvas-edge-hit");
			hit.dataset.edgeKey = key;
			hit.setAttribute("tabindex", "0");
			hit.setAttribute("role", "button");
			const occurrenceDetail = edge.occurrences.length > 1
				? `，共 ${edge.occurrences.length} 个入口，其中白板文件节点 ${referenceCounts.fileNode} 个、文本链接 ${referenceCounts.textLink} 个`
				: "";
			hit.setAttribute("aria-label", `${sourceName} 引用 ${targetName}${occurrenceDetail}；选择以回溯`);
			hit.addEventListener("pointerenter", () => { if (this.hasHoverSupport()) this.setHoveredEdge(key); });
			hit.addEventListener("pointerleave", () => { if (this.hasHoverSupport()) this.setHoveredEdge(undefined); });
			hit.addEventListener("focus", () => this.setHoveredEdge(key));
			hit.addEventListener("blur", () => this.setHoveredEdge(undefined));
			hit.addEventListener("click", (event) => {
				if (this.consumeCompatibilityClick(hit, event.detail)) {
					event.preventDefault();
					event.stopPropagation();
					return;
				}
				event.stopPropagation();
				this.selectEdge(key);
			});
			hit.addEventListener("dblclick", (event) => {
				if (this.consumeCompatibilityClick(hit, event.detail)) {
					event.preventDefault();
					event.stopPropagation();
					return;
				}
				event.preventDefault();
				event.stopPropagation();
				this.selectEdge(key);
				this.actions.openReferences(edge.occurrences, edge.targetCanvasPath, this.leaf);
			});
			hit.addEventListener("keydown", (event) => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				this.selectEdge(key);
				this.actions.openReferences(edge.occurrences, edge.targetCanvasPath, this.leaf);
			});
			svg.appendChild(hit);
			this.edgeHitElements.set(key, hit);
			if (edge.occurrences.length > 1) {
				const label = ownerDocument.createElementNS("http://www.w3.org/2000/svg", "text");
				label.setAttribute("x", String(geometry.labelX));
				label.setAttribute("y", String(geometry.labelY));
				label.setAttribute("class", "arc-meta-canvas-edge-count");
				label.setAttribute("aria-hidden", "true");
				label.textContent = `${edge.occurrences.length}`;
				svg.appendChild(label);
			}
		}
		this.applyVisualFocus();
	}

	private bindViewport(viewport: HTMLElement): void {
		const win = viewport.ownerDocument.defaultView;
		if (!win) return;
		this.motion = new ViewportMotion({ zoom: this.zoom, panX: this.panX, panY: this.panY }, win, { minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM }, (transform) => {
			this.zoom = transform.zoom;
			this.panX = transform.panX;
			this.panY = transform.panY;
			this.applyTransform();
		});
		this.interaction = new MetaCanvasInteractionController({
			getTransform: () => this.currentTransform(),
			setTransform: (transform) => this.motion?.setImmediate(transform),
			setNodePosition: (path, position, phase) => this.setNodeGesturePosition(path, position, phase),
			onTap: (target, pointerType, point) => this.handlePointerTap(target, pointerType, point),
			onInteraction: () => {
				this.cancelScheduledFit();
				this.motion?.cancel();
			},
			setTimeout: (callback, delay) => win.setTimeout(callback, delay),
			clearTimeout: (handle) => win.clearTimeout(handle),
		}, { minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM });

		const pointerDown = (event: PointerEvent): void => {
			const target = this.resolvePointerTarget(event.target);
			if (event.pointerType === "mouse") {
				this.lastTouchTap = undefined;
				this.clearCompatibilityClickFor(target);
			}
			const consumed = this.interaction?.pointerDown({ id: event.pointerId, point: this.localPoint(viewport, event), pointerType: event.pointerType, button: event.button, target }) ?? false;
			if (!consumed || target.kind === "excluded") return;
			this.pointerTargets.set(event.pointerId, target);
			if (event.pointerType === "touch" && this.interaction?.activeGestureKind === "pinch") this.lastTouchTap = undefined;
			event.preventDefault();
			try { viewport.setPointerCapture(event.pointerId); } catch { /* Pointer capture is optional in embedded panes. */ }
		};
		const pointerMove = (event: PointerEvent): void => {
			if (!this.interaction?.pointerMove(event.pointerId, this.localPoint(viewport, event))) return;
			if (event.pointerType === "touch" && this.interaction.shouldSuppressCompatibilityClick(event.pointerId)) this.lastTouchTap = undefined;
			event.preventDefault();
		};
		const pointerUp = (event: PointerEvent): void => {
			const target = this.pointerTargets.get(event.pointerId);
			if (target && this.interaction?.shouldSuppressCompatibilityClick(event.pointerId)) this.suppressCompatibilityClickFor(target);
			const consumed = this.interaction?.pointerUp(event.pointerId, this.localPoint(viewport, event)) ?? false;
			this.pointerTargets.delete(event.pointerId);
			if (consumed && event.pointerType === "touch") event.preventDefault();
		};
		const pointerCancel = (event: PointerEvent): void => {
			this.pointerTargets.delete(event.pointerId);
			this.lastTouchTap = undefined;
			this.interaction?.pointerCancel(event.pointerId);
		};
		viewport.addEventListener("pointerdown", pointerDown);
		viewport.addEventListener("pointermove", pointerMove);
		viewport.addEventListener("pointerup", pointerUp);
		viewport.addEventListener("pointercancel", pointerCancel);
		viewport.addEventListener("lostpointercapture", pointerCancel);
		viewport.addEventListener("touchstart", (event) => {
			if (this.resolvePointerTarget(event.target).kind !== "excluded") event.preventDefault();
		}, { passive: false });
		viewport.addEventListener("touchmove", (event) => {
			if (this.resolvePointerTarget(event.target).kind !== "excluded") event.preventDefault();
		}, { passive: false });
		viewport.addEventListener("wheel", (event) => {
			if (this.resolvePointerTarget(event.target).kind === "excluded") return;
			this.lastTouchTap = undefined;
			const rect = viewport.getBoundingClientRect();
			const consumed = this.interaction?.wheel({
				deltaX: event.deltaX, deltaY: event.deltaY, deltaMode: event.deltaMode,
				ctrlKey: event.ctrlKey, metaKey: event.metaKey, shiftKey: event.shiftKey,
				point: { x: event.clientX - rect.left, y: event.clientY - rect.top },
			}, (delta) => {
				this.cancelScheduledFit();
				const current = this.currentTransform();
				this.motion?.setImmediate({ ...current, panX: current.panX - delta.x, panY: current.panY - delta.y });
			}, (factor, point) => {
				this.cancelScheduledFit();
				this.motion?.zoomAt(factor, point, true);
			}) ?? false;
			if (consumed) event.preventDefault();
		}, { passive: false });
		viewport.addEventListener("contextmenu", (event) => event.preventDefault());
		viewport.addEventListener("keydown", (event) => {
			if (event.key === " " && event.target === viewport && viewport.ownerDocument.activeElement === viewport && !event.repeat && !event.isComposing && !event.ctrlKey && !event.metaKey && !event.altKey) {
				event.preventDefault();
				this.interaction?.setSpaceHeld(true);
			} else if (event.key === "Escape" && event.target === viewport && !event.isComposing) {
				this.interaction?.cancel();
				this.motion?.cancel();
				this.cancelScheduledFit();
				this.clearSelection();
			}
		});
		const clearSpace = (event: KeyboardEvent): void => { if (event.key === " ") this.interaction?.setSpaceHeld(false); };
		const cancelOnWindowChange = (finishZoom: boolean): void => {
			this.cancelScheduledFit();
			this.interaction?.cancel();
			if (finishZoom) this.motion?.finishAnimation();
			else this.motion?.cancel();
			for (const id of this.pointerTargets.keys()) {
				try { if (viewport.hasPointerCapture(id)) viewport.releasePointerCapture(id); } catch { /* Capture may already be lost. */ }
			}
			this.pointerTargets.clear();
			this.compatibilityClicks.clearAll();
			this.lastTouchTap = undefined;
		};
		const cancelOnBlur = (): void => cancelOnWindowChange(false);
		const moveOutsideViewport = (event: PointerEvent): void => {
			if (event.target && viewport.contains(event.target as Node)) return;
			if (this.interaction?.hasPointer(event.pointerId)) pointerMove(event);
		};
		const upOutsideViewport = (event: PointerEvent): void => {
			if (event.target && viewport.contains(event.target as Node)) return;
			if (this.interaction?.hasPointer(event.pointerId)) pointerUp(event);
		};
		const cancelOutsideViewport = (event: PointerEvent): void => {
			if (event.target && viewport.contains(event.target as Node)) return;
			pointerCancel(event);
		};
		win.addEventListener("pointermove", moveOutsideViewport);
		win.addEventListener("pointerup", upOutsideViewport);
		win.addEventListener("pointercancel", cancelOutsideViewport);
		const cancelWhenHidden = (): void => { if (win.document.hidden) cancelOnWindowChange(true); };
		win.addEventListener("keyup", clearSpace);
		win.addEventListener("blur", cancelOnBlur);
		win.document.addEventListener("visibilitychange", cancelWhenHidden);
		this.windowInteractionCleanup = () => {
			win.removeEventListener("keyup", clearSpace);
			win.removeEventListener("blur", cancelOnBlur);
			win.removeEventListener("pointermove", moveOutsideViewport);
			win.removeEventListener("pointerup", upOutsideViewport);
			win.removeEventListener("pointercancel", cancelOutsideViewport);
			win.document.removeEventListener("visibilitychange", cancelWhenHidden);
		};
	}

	private cleanupViewportInteraction(): void {
		this.cancelScheduledFit();
		for (const id of this.pointerTargets.keys()) {
			try { if (this.viewport?.hasPointerCapture(id)) this.viewport.releasePointerCapture(id); } catch { /* Capture may already be lost. */ }
		}
		this.interaction?.destroy();
		this.interaction = undefined;
		this.motion?.cancel();
		this.motion = undefined;
		this.windowInteractionCleanup?.();
		this.windowInteractionCleanup = undefined;
		this.compatibilityClicks.clearAll();
		this.pointerTargets.clear();
		this.lastTouchTap = undefined;
	}

	private scheduleInitialFit(viewport: HTMLElement): void {
		const win = viewport.ownerDocument.defaultView;
		if (!win) return;
		const revision = this.renderRevision;
		this.fitFrame = win.requestAnimationFrame(() => {
			this.fitFrame = undefined;
			if (revision === this.renderRevision && this.viewport === viewport) this.fitGraph();
		});
	}

	private cancelScheduledFit(): void {
		if (this.fitFrame === undefined) return;
		this.contentEl.ownerDocument.defaultView?.cancelAnimationFrame(this.fitFrame);
		this.fitFrame = undefined;
	}

	private currentTransform(): ViewportTransform {
		return { zoom: this.zoom, panX: this.panX, panY: this.panY };
	}

	private localPoint(viewport: HTMLElement, event: PointerEvent): PointerPoint {
		const rect = viewport.getBoundingClientRect();
		return { x: event.clientX - rect.left, y: event.clientY - rect.top };
	}

	private resolvePointerTarget(target: EventTarget | null): PointerTarget {
		const element = target as Element | null;
		if (!element || typeof element.closest !== "function") return { kind: "blank" };
		if (element.closest(".arc-meta-canvas-controls, .arc-meta-canvas-title, .arc-meta-canvas-detail, .arc-meta-canvas-detail-toggle, [contenteditable='true'], input, textarea, select")) return { kind: "excluded" };
		const card = element.closest<HTMLElement>(".arc-meta-canvas-board-card");
		if (card) {
			const path = card.dataset.canvasPath;
			const position = path ? this.positions[path] : undefined;
			return path && position ? { kind: "board", path, position: { ...position } } : { kind: "excluded" };
		}
		const edge = element.closest<SVGPathElement>(".arc-meta-canvas-edge-hit");
		if (edge?.dataset.edgeKey) return { kind: "edge", key: edge.dataset.edgeKey };
		return { kind: "blank" };
	}

	private setNodeGesturePosition(path: string, position: PointerPoint, phase: "preview" | "commit" | "cancel"): void {
		if (phase === "cancel") {
			this.positions[path] = { ...position };
		} else {
			this.positions[path] = resolveCanvasCardPosition(path, position, this.positions, this.layout?.nodeSizes);
		}
		if (phase === "commit") {
			this.manualPositions[path] = { ...this.positions[path]! };
			this.updateCardPinnedState(path, true);
			void this.actions.setPositions(this.manualPositions).catch((error) => new Notice(`元白板位置保存失败：${error instanceof Error ? error.message : String(error)}`));
		}
		this.updateCardPositions();
		if (this.graph) this.drawEdges(this.graph.edges, this.positions, this.layout?.edgeRoutes ?? {}, this.graph.boards);
	}

	private suppressCompatibilityClickFor(target: Exclude<PointerTarget, { kind: "excluded" }>): void {
		const element = this.elementForPointerTarget(target);
		if (element) {
			const now = this.contentEl.ownerDocument.defaultView?.performance.now() ?? 0;
			this.compatibilityClicks.suppress(element, now + 500, now);
		}
	}

	private clearCompatibilityClickFor(target: PointerTarget): void {
		const element = this.elementForPointerTarget(target);
		if (element) this.compatibilityClicks.clear(element);
	}

	private elementForPointerTarget(target: PointerTarget): Element | undefined {
		if (target.kind === "board") return this.boardElements.get(target.path);
		if (target.kind === "edge") return this.edgeHitElements.get(target.key);
		return undefined;
	}

	private handlePointerTap(target: Exclude<PointerTarget, { kind: "excluded" }>, pointerType: string, point: PointerPoint): void {
		if (target.kind === "board") this.selectBoard(target.path);
		else if (target.kind === "edge") this.selectEdge(target.key);
		else this.clearSelection();
		if (pointerType !== "touch") return;
		this.suppressCompatibilityClickFor(target);

		const win = this.contentEl.ownerDocument.defaultView;
		const now = win?.performance.now() ?? 0;
		const key = target.kind === "board" ? `board:${target.path}` : target.kind === "edge" ? `edge:${target.key}` : "blank";
		const previous = this.lastTouchTap;
		const isDoubleTap = previous?.key === key && now - previous.at <= 350 && Math.hypot(point.x - previous.point.x, point.y - previous.point.y) <= 24;
		this.lastTouchTap = isDoubleTap ? undefined : { key, point: { ...point }, at: now };
		if (!isDoubleTap) return;
		this.lastTouchTap = undefined;
		if (target.kind === "board") void this.openBoard(target.path);
		else if (target.kind === "edge") {
			const edge = this.graph?.edges.find((candidate) => canvasReferenceEdgeKey(candidate.sourceCanvasPath, candidate.targetCanvasPath) === target.key);
			if (edge) this.actions.openReferences(edge.occurrences, edge.targetCanvasPath, this.leaf);
		}
	}

	private consumeCompatibilityClick(element: Element, detail: number): boolean {
		return this.compatibilityClicks.consume(element, this.contentEl.ownerDocument.defaultView?.performance.now() ?? 0, detail);
	}

	private updateCardPositions(): void {
		const cards = this.world?.querySelectorAll<HTMLElement>(".arc-meta-canvas-board-card");
		if (!cards) return;
		for (let index = 0; index < cards.length; index += 1) {
			const card = cards.item(index);
			if (!card) continue;
			const point = this.positions[card.dataset.canvasPath ?? ""];
			if (!point) continue;
			card.style.left = `${point.x}px`;
			card.style.top = `${point.y}px`;
		}
	}

	private updateCardPinnedState(path: string, pinned: boolean): void {
		const card = this.boardElements.get(path);
		const board = this.graph?.boards.find((item) => item.path === path);
		if (!card || !board) return;
		const relatedCount = this.graph?.edges.filter((edge) => edge.sourceCanvasPath === path || edge.targetCanvasPath === path).length ?? 0;
		card.toggleClass("is-pinned", pinned);
		card.setAttribute("aria-label", `${board.name}，${board.snapshot.nodes.length} 个节点，${relatedCount} 条白板关系${pinned ? "，手动固定位置" : ""}`);
	}

	private applyTransform(): void {
		if (this.world) this.world.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
	}

	private setZoom(value: number): void {
		const viewport = this.viewport;
		this.cancelScheduledFit();
		this.motion?.zoomTo(value, { x: (viewport?.clientWidth ?? 0) / 2, y: (viewport?.clientHeight ?? 0) / 2 }, false);
	}

	private fitGraph(): void {
		this.cancelScheduledFit();
		this.motion?.cancel();
		const viewport = this.viewport;
		const scene = this.scene;
		if (!viewport || !scene) return;
		const width = Math.max(1, scene.clientWidth);
		const height = Math.max(1, scene.clientHeight);
		const zoom = Math.max(MIN_ZOOM, Math.min(1.05, (viewport.clientWidth - 48) / width, (viewport.clientHeight - 48) / height));
		this.motion?.setImmediate({ zoom, panX: (viewport.clientWidth - width * zoom) / 2, panY: (viewport.clientHeight - height * zoom) / 2 });
	}

	private renderError(error: unknown): void {
		this.cleanupViewportInteraction();
		this.contentEl.empty();
		this.contentEl.addClass("arc-meta-canvas-view");
		const message = error instanceof Error ? error.message : String(error);
		const details = this.contentEl.createDiv({ cls: "arc-meta-canvas-error" });
		details.createEl("strong", { text: "无法生成元白板。" });
		details.createEl("small", { text: message.slice(0, 240) });
		const retry = this.contentEl.createEl("button", { text: "重试" });
		retry.addEventListener("click", () => this.references.invalidate());
	}

	private addControl(parent: HTMLElement, text: string, label: string, action: () => void): void {
		const button = parent.createEl("button", { cls: "arc-meta-canvas-control", text, attr: { type: "button", "aria-label": label, title: label } });
		button.addEventListener("click", action);
	}

	private addLayoutMenuControl(parent: HTMLElement): void {
		const button = parent.createEl("button", {
			cls: "arc-meta-canvas-control",
			attr: { type: "button", "aria-label": "布局方式、节点形状与重置", title: "布局与形状" },
		});
		setIcon(button, "layout-dashboard");
		button.addEventListener("click", (event) => {
			showMetaCanvasLayoutMenu(this.app, event, {
				layoutMode: this.actions.getLayoutMode(),
				nodeShapeMode: this.actions.getNodeShapeMode(),
				fixedNodeCount: Object.keys(this.manualPositions).length,
				setLayoutMode: (mode) => { void this.setLayoutMode(mode); },
				setNodeShapeMode: (mode) => { void this.setNodeShapeMode(mode); },
				softReset: () => this.softResetLayout(),
				hardReset: () => { void this.hardResetLayout(); },
			});
		});
	}

	private async setLayoutMode(mode: MetaCanvasLayoutMode): Promise<void> {
		if (mode === this.actions.getLayoutMode()) return;
		try {
			await this.actions.setLayoutMode(mode);
			this.manualPositions = this.actions.getPositions();
			this.renderView(true);
		} catch (error) {
			new Notice(`元白板布局设置保存失败：${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private async setNodeShapeMode(mode: MetaCanvasNodeShapeMode): Promise<void> {
		if (mode === this.actions.getNodeShapeMode()) return;
		try {
			await this.actions.setNodeShapeMode(mode);
			this.manualPositions = this.actions.getPositions();
			this.renderView(true);
		} catch (error) {
			new Notice(`元白板节点形状设置保存失败：${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private softResetLayout(): void {
		this.manualPositions = this.actions.getPositions();
		this.renderView(true);
		new Notice("已重新排列自动节点；手动固定节点保持原位。");
	}

	private async hardResetLayout(): Promise<void> {
		try {
			await this.actions.setPositions({});
			this.manualPositions = {};
			this.renderView(true);
			new Notice("已清除手动固定位置，并按当前布局方式重新排列。");
		} catch (error) {
			new Notice(`元白板固定位置清除失败：${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private async backtrackBoard(path: string): Promise<void> {
		const entries = await this.references.getIncomingCanvasReferences(path);
		this.actions.openReferences(entries, path, this.leaf);
	}

	private async openBoard(path: string): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			new Notice(`找不到白板：${path}`);
			return;
		}
		await this.leaf.openFile(file);
		await this.app.workspace.revealLeaf(this.leaf);
		this.app.workspace.setActiveLeaf(this.leaf, { focus: true });
		this.leaf.getContainer().win.focus();
	}
}

function edgeGeometry(
	from: PointerPoint,
	to: PointerPoint,
	route?: readonly PointerPoint[],
	fromSize: CanvasGraphNodeSize = { width: META_CANVAS_NODE_WIDTH, height: META_CANVAS_NODE_HEIGHT },
	toSize: CanvasGraphNodeSize = { width: META_CANVAS_NODE_WIDTH, height: META_CANVAS_NODE_HEIGHT },
): { path: string; labelX: number; labelY: number } {
	if (route && route.length >= 2) {
		const index = Math.floor(route.length / 2);
	const labelPoint = route[index] ?? route[route.length - 1]!;
		return {
			path: buildRoundedPolylinePath(route),
			labelX: labelPoint.x,
			labelY: labelPoint.y - 9,
		};
	}
	const fromCenter = { x: from.x + fromSize.width / 2, y: from.y + fromSize.height / 2 };
	const toCenter = { x: to.x + toSize.width / 2, y: to.y + toSize.height / 2 };
	let start: PointerPoint;
	let end: PointerPoint;
	let c1: PointerPoint;
	let c2: PointerPoint;
	if (Math.abs(toCenter.x - fromCenter.x) >= Math.abs(toCenter.y - fromCenter.y)) {
		const direction = toCenter.x >= fromCenter.x ? 1 : -1;
		start = { x: fromCenter.x + direction * fromSize.width / 2, y: fromCenter.y };
		end = { x: toCenter.x - direction * toSize.width / 2, y: toCenter.y };
		const bend = Math.max(44, Math.abs(end.x - start.x) * 0.42);
		c1 = { x: start.x + bend * direction, y: start.y };
		c2 = { x: end.x - bend * direction, y: end.y };
	} else {
		const direction = toCenter.y >= fromCenter.y ? 1 : -1;
		start = { x: fromCenter.x, y: fromCenter.y + direction * fromSize.height / 2 };
		end = { x: toCenter.x, y: toCenter.y - direction * toSize.height / 2 };
		const bend = Math.max(44, Math.abs(end.y - start.y) * 0.42);
		c1 = { x: start.x, y: start.y + bend * direction };
		c2 = { x: end.x, y: end.y - bend * direction };
	}
	return {
		path: `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`,
		labelX: (start.x + end.x) / 2,
		labelY: (start.y + end.y) / 2 - 8,
	};
}

function buildRoundedPolylinePath(rawPoints: readonly PointerPoint[], cornerRadius = 20): string {
	const points = rawPoints.filter((point, index) => index === 0 || point.x !== rawPoints[index - 1]?.x || point.y !== rawPoints[index - 1]?.y);
	if (points.length <= 2) {
		const start = points[0];
		const end = points[1];
		if (!start || !end) return "";
		const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
		const startAxis = horizontal ? start.x : start.y;
		const endAxis = horizontal ? end.x : end.y;
		const sign = endAxis >= startAxis ? 1 : -1;
		const offset = Math.max(24, Math.abs(endAxis - startAxis) * 0.35);
		const first = horizontal ? { x: start.x + sign * offset, y: start.y } : { x: start.x, y: start.y + sign * offset };
		const second = horizontal ? { x: end.x - sign * offset, y: end.y } : { x: end.x, y: end.y - sign * offset };
		return `M ${start.x} ${start.y} C ${first.x} ${first.y}, ${second.x} ${second.y}, ${end.x} ${end.y}`;
	}
	const commands = [`M ${points[0]!.x} ${points[0]!.y}`];
	for (let index = 1; index < points.length - 1; index += 1) {
		const previous = points[index - 1]!;
		const current = points[index]!;
		const next = points[index + 1]!;
		const radius = Math.min(cornerRadius, distance(previous, current) / 2, distance(current, next) / 2);
		const incoming = unitVector(current, previous);
		const outgoing = unitVector(current, next);
		const before = { x: current.x + incoming.x * radius, y: current.y + incoming.y * radius };
		const after = { x: current.x + outgoing.x * radius, y: current.y + outgoing.y * radius };
		commands.push(`L ${before.x} ${before.y} Q ${current.x} ${current.y} ${after.x} ${after.y}`);
	}
	const last = points[points.length - 1]!;
	commands.push(`L ${last.x} ${last.y}`);
	return commands.join(" ");
}

function unitVector(from: PointerPoint, to: PointerPoint): PointerPoint {
	const length = distance(from, to);
	if (length === 0) return { x: 0, y: 0 };
	return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
}

function basename(path: string): string {
	return path.split("/").filter(Boolean).pop()?.replace(/\.canvas$/i, "") ?? path;
}

function distance(a: PointerPoint, b: PointerPoint): number {
	return Math.hypot(b.x - a.x, b.y - a.y);
}

function countReferenceKinds(edge: CanvasReferenceGraphEdge): { fileNode: number; textLink: number } {
	let fileNode = 0;
	let textLink = 0;
	for (const occurrence of edge.occurrences) {
		if (occurrence.kind === "file-node") fileNode += 1;
		else textLink += 1;
	}
	return { fileNode, textLink };
}
