import * as dagreModule from "@dagrejs/dagre";
import type { CanvasReferenceGraphEdge } from "./canvas-reference-model";

type DagreGraph = {
	setGraph(label: Record<string, number | string>): DagreGraph;
	setDefaultEdgeLabel(callback: () => Record<string, never>): DagreGraph;
	setNode(id: string, label: { width: number; height: number }): DagreGraph;
	setEdge(source: string, target: string): DagreGraph;
	node(id: string): { x?: number; y?: number } | undefined;
	edge(source: string, target: string): { points?: Array<{ x: number; y: number }> } | undefined;
	graph(): { width?: number; height?: number };
};

type DagreRuntime = {
	graphlib: { Graph: new () => DagreGraph };
	layout(graph: DagreGraph): void;
};

// Dagre 2 exposes a CommonJS-shaped runtime object while its ESM declarations model graphlib
// as a namespace. Read the bundled namespace through this structural adapter so esbuild keeps it.
const dagreNamespace = dagreModule as unknown as { default?: DagreRuntime } & Partial<DagreRuntime>;
const dagre = (dagreNamespace.default ?? dagreNamespace) as DagreRuntime;

export type CanvasGraphPosition = { x: number; y: number };
export type CanvasGraphNodeSize = { width: number; height: number };
export type CanvasGraphPositionMap = Record<string, CanvasGraphPosition>;
export type CanvasGraphNodeSizeMap = Record<string, CanvasGraphNodeSize>;
export type MetaCanvasLayoutMode = "layered" | "force";
export type MetaCanvasNodeShapeMode = "square" | "canvas-aspect";

export const DEFAULT_META_CANVAS_LAYOUT_MODE: MetaCanvasLayoutMode = "layered";
export const DEFAULT_META_CANVAS_NODE_SHAPE: MetaCanvasNodeShapeMode = "square";
export const META_CANVAS_NODE_WIDTH = 236;
export const META_CANVAS_NODE_HEIGHT = 236;
const GRAPH_MARGIN = 54;
const NODE_X_GAP = 92;
const NODE_Y_GAP = 54;
const FORCE_NODE_GAP = 34;
const FORCE_ITERATIONS = 180;
const MAX_CANVAS_ASPECT = 1.8;

export type CanvasGraphLayout = {
	positions: CanvasGraphPositionMap;
	nodeSizes: CanvasGraphNodeSizeMap;
	edgeRoutes: Record<string, CanvasGraphPosition[]>;
	width: number;
	height: number;
	mode: MetaCanvasLayoutMode;
};

export type CanvasGraphLayoutOptions = {
	mode?: MetaCanvasLayoutMode;
	nodeSizes?: Readonly<CanvasGraphNodeSizeMap>;
};

type PlacedNode = CanvasGraphPosition & CanvasGraphNodeSize & { path: string; pinned: boolean };

export function normalizeMetaCanvasLayoutMode(value: unknown): MetaCanvasLayoutMode {
	return value === "force" ? "force" : DEFAULT_META_CANVAS_LAYOUT_MODE;
}

export function normalizeMetaCanvasNodeShapeMode(value: unknown): MetaCanvasNodeShapeMode {
	return value === "canvas-aspect" ? "canvas-aspect" : DEFAULT_META_CANVAS_NODE_SHAPE;
}

/** Normalize extreme whiteboards to a readable card while preserving their broad shape. */
export function resolveMetaCanvasNodeSize(
	aspectRatio: number,
	shapeMode: MetaCanvasNodeShapeMode,
): CanvasGraphNodeSize {
	if (shapeMode === "square" || !Number.isFinite(aspectRatio) || aspectRatio <= 0) {
		return { width: META_CANVAS_NODE_WIDTH, height: META_CANVAS_NODE_HEIGHT };
	}
	const ratio = Math.min(MAX_CANVAS_ASPECT, Math.max(1 / MAX_CANVAS_ASPECT, aspectRatio));
	return ratio >= 1
		? { width: META_CANVAS_NODE_WIDTH, height: Math.round(META_CANVAS_NODE_HEIGHT / ratio) }
		: { width: Math.round(META_CANVAS_NODE_WIDTH * ratio), height: META_CANVAS_NODE_HEIGHT };
}

export function canvasReferenceEdgeKey(source: string, target: string): string {
	return `${source}\0${target}`;
}

/**
 * Dagre is the stable layered default. Force layout is an optional global overview; dragged
 * positions are fixed anchors in both modes, and only automatic nodes are recalculated.
 */
export function layoutCanvasReferenceGraph(
	paths: readonly string[],
	edges: readonly Pick<CanvasReferenceGraphEdge, "sourceCanvasPath" | "targetCanvasPath">[],
	manualPositions: Readonly<CanvasGraphPositionMap> = {},
	options: CanvasGraphLayoutOptions = {},
): CanvasGraphLayout {
	const mode = normalizeMetaCanvasLayoutMode(options.mode);
	const nodeSizes = normalizeNodeSizes(paths, options.nodeSizes);
	const result = mode === "force"
		? { positions: layoutForceDirected(paths, edges, manualPositions, nodeSizes), edgeRoutes: {} }
		: layoutLayered(paths, edges, manualPositions, nodeSizes);
	const positions = result.positions;
	const edgeRoutes = result.edgeRoutes;
	const width = Math.max(0, ...paths.map((path) => positions[path]!.x + nodeSizes[path]!.width)) + GRAPH_MARGIN;
	const height = Math.max(0, ...paths.map((path) => positions[path]!.y + nodeSizes[path]!.height)) + GRAPH_MARGIN;
	return { positions, nodeSizes, edgeRoutes, width, height, mode };
}

export function resolveCanvasCardPosition(
	path: string,
	candidate: CanvasGraphPosition,
	positions: Readonly<CanvasGraphPositionMap>,
	nodeSizes: Readonly<CanvasGraphNodeSizeMap> = {},
): CanvasGraphPosition {
	const size = nodeSize(path, nodeSizes);
	const placed = Object.entries(positions)
		.filter(([otherPath]) => otherPath !== path)
		.map(([otherPath, point]) => ({ path: otherPath, ...point, ...nodeSize(otherPath, nodeSizes), pinned: true }));
	return findFreePosition({ path, ...candidate, ...size, pinned: false }, placed, 0);
}

function layoutLayered(
	paths: readonly string[],
	edges: readonly Pick<CanvasReferenceGraphEdge, "sourceCanvasPath" | "targetCanvasPath">[],
	manualPositions: Readonly<CanvasGraphPositionMap>,
	nodeSizes: Readonly<CanvasGraphNodeSizeMap>,
): { positions: CanvasGraphPositionMap; edgeRoutes: Record<string, CanvasGraphPosition[]> } {
	const graph = new dagre.graphlib.Graph();
	graph.setGraph({
		rankdir: "LR",
		nodesep: NODE_Y_GAP,
		ranksep: NODE_X_GAP,
		marginx: GRAPH_MARGIN,
		marginy: GRAPH_MARGIN,
	});
	graph.setDefaultEdgeLabel(() => ({}));
	for (const path of paths) {
		const size = nodeSizes[path]!;
		// Dagre annotates node label objects with x/y/rank; give it a copy so size preferences
		// remain pure geometry for force layout, dragging, and rendering.
		graph.setNode(path, { width: size.width, height: size.height });
	}
	for (const edge of edges) {
		if (paths.includes(edge.sourceCanvasPath) && paths.includes(edge.targetCanvasPath)) {
			graph.setEdge(edge.sourceCanvasPath, edge.targetCanvasPath);
		}
	}
	dagre.layout(graph);

	const automatic: CanvasGraphPositionMap = {};
	for (const path of paths) {
		const node = graph.node(path);
		const size = nodeSizes[path]!;
		automatic[path] = {
			x: (node?.x ?? GRAPH_MARGIN + size.width / 2) - size.width / 2,
			y: (node?.y ?? GRAPH_MARGIN + size.height / 2) - size.height / 2,
		};
	}
	const pinned = paths.filter((path) => isPosition(manualPositions[path]));
	const movable = paths.filter((path) => !isPosition(manualPositions[path]));
	const placed: PlacedNode[] = pinned.map((path) => ({
		path,
		...manualPositions[path]!,
		...nodeSize(path, nodeSizes),
		pinned: true,
	}));
	const positions: CanvasGraphPositionMap = {};
	for (const path of pinned) positions[path] = { ...manualPositions[path]! };
	for (const path of movable.sort((left, right) => {
		const a = automatic[left]!;
		const b = automatic[right]!;
		return a.y - b.y || a.x - b.x || left.localeCompare(right);
	})) {
		const desired = automatic[path]!;
		const point = findFreePosition({ path, ...desired, ...nodeSize(path, nodeSizes), pinned: false }, placed, 0);
		positions[path] = { x: point.x, y: point.y };
		placed.push(point);
	}
	return { positions, edgeRoutes: readDagreRoutes(paths, edges, graph) };
}

function layoutForceDirected(
	paths: readonly string[],
	edges: readonly Pick<CanvasReferenceGraphEdge, "sourceCanvasPath" | "targetCanvasPath">[],
	manualPositions: Readonly<CanvasGraphPositionMap>,
	nodeSizes: Readonly<CanvasGraphNodeSizeMap>,
): CanvasGraphPositionMap {
	const pinnedPaths = paths.filter((path) => isPosition(manualPositions[path]));
	const movablePaths = paths.filter((path) => !isPosition(manualPositions[path])).sort((a, b) => a.localeCompare(b));
	const positions: CanvasGraphPositionMap = {};
	for (const path of pinnedPaths) positions[path] = { ...manualPositions[path]! };
	if (movablePaths.length === 0) return positions;

	const sizes = nodeSizes;
	const largestDimension = Math.max(0, ...paths.map((path) => Math.max(sizes[path]!.width, sizes[path]!.height)));
	const ringRadius = Math.max(330, Math.sqrt(movablePaths.length) * 128);
	const pinCenter = pinnedPaths.length > 0
		? pinnedPaths.reduce((sum, path) => {
			const position = manualPositions[path]!;
			const size = sizes[path]!;
			return { x: sum.x + position.x + size.width / 2, y: sum.y + position.y + size.height / 2 };
		}, { x: 0, y: 0 })
		: undefined;
	const center = pinCenter
		? { x: pinCenter.x / pinnedPaths.length, y: pinCenter.y / pinnedPaths.length }
		: { x: GRAPH_MARGIN + ringRadius + largestDimension, y: GRAPH_MARGIN + ringRadius + largestDimension };
	const goldenAngle = Math.PI * (3 - Math.sqrt(5));
	for (let index = 0; index < movablePaths.length; index += 1) {
		const path = movablePaths[index]!;
		const size = sizes[path]!;
		const radius = ringRadius * Math.sqrt((index + 0.5) / movablePaths.length);
		const angle = index * goldenAngle + stablePhase(path);
		positions[path] = {
			x: Math.max(GRAPH_MARGIN, center.x + Math.cos(angle) * radius - size.width / 2),
			y: Math.max(GRAPH_MARGIN, center.y + Math.sin(angle) * radius - size.height / 2),
		};
	}

	const pathSet = new Set(paths);
	const validEdges = edges.filter((edge) => pathSet.has(edge.sourceCanvasPath) && pathSet.has(edge.targetCanvasPath));
	const idealLength = Math.max(360, largestDimension + 130);
	const repulsionConstant = idealLength;
	for (let iteration = 0; iteration < FORCE_ITERATIONS; iteration += 1) {
		const temperature = 24 * (1 - iteration / FORCE_ITERATIONS) + 1.25;
		const forces = new Map<string, CanvasGraphPosition>(movablePaths.map((path) => [path, { x: 0, y: 0 }]));
		for (let leftIndex = 0; leftIndex < paths.length; leftIndex += 1) {
			const leftPath = paths[leftIndex]!;
			const leftPosition = positions[leftPath]!;
			const leftSize = sizes[leftPath]!;
			const leftCenter = nodeCenter(leftPosition, leftSize);
			for (let rightIndex = leftIndex + 1; rightIndex < paths.length; rightIndex += 1) {
				const rightPath = paths[rightIndex]!;
				const rightPosition = positions[rightPath]!;
				const rightSize = sizes[rightPath]!;
				const rightCenter = nodeCenter(rightPosition, rightSize);
				let dx = rightCenter.x - leftCenter.x;
				let dy = rightCenter.y - leftCenter.y;
				let length = Math.hypot(dx, dy);
				if (length < 0.001) {
					const angle = stablePhase(`${leftPath}\0${rightPath}`);
					dx = Math.cos(angle);
					dy = Math.sin(angle);
					length = 1;
				}
				const ux = dx / length;
				const uy = dy / length;
				const repulsion = (repulsionConstant * repulsionConstant / length) * 0.012;
				addForce(forces, leftPath, -ux * repulsion, -uy * repulsion);
				addForce(forces, rightPath, ux * repulsion, uy * repulsion);

				const overlapX = (leftSize.width + rightSize.width) / 2 + FORCE_NODE_GAP - Math.abs(dx);
				const overlapY = (leftSize.height + rightSize.height) / 2 + FORCE_NODE_GAP - Math.abs(dy);
				if (overlapX > 0 && overlapY > 0) {
					const amount = Math.min(24, Math.min(overlapX, overlapY) * 0.08);
					if (overlapX <= overlapY) {
						const direction = dx === 0 ? (stablePhase(`${leftPath}:${rightPath}`) < Math.PI ? 1 : -1) : Math.sign(dx);
						addForce(forces, leftPath, -direction * amount, 0);
						addForce(forces, rightPath, direction * amount, 0);
					} else {
						const direction = dy === 0 ? (stablePhase(`${rightPath}:${leftPath}`) < Math.PI ? 1 : -1) : Math.sign(dy);
						addForce(forces, leftPath, 0, -direction * amount);
						addForce(forces, rightPath, 0, direction * amount);
					}
				}
			}
		}

		for (const edge of validEdges) {
			const sourcePosition = positions[edge.sourceCanvasPath]!;
			const targetPosition = positions[edge.targetCanvasPath]!;
			const sourceSize = sizes[edge.sourceCanvasPath]!;
			const targetSize = sizes[edge.targetCanvasPath]!;
			const source = nodeCenter(sourcePosition, sourceSize);
			const target = nodeCenter(targetPosition, targetSize);
			const dx = target.x - source.x;
			const dy = target.y - source.y;
			const length = Math.max(1, Math.hypot(dx, dy));
			const ideal = Math.max(280, (sourceSize.width + targetSize.width) / 2 + 120);
			const spring = (length - ideal) * 0.004;
			addForce(forces, edge.sourceCanvasPath, dx / length * spring, dy / length * spring);
			addForce(forces, edge.targetCanvasPath, -dx / length * spring, -dy / length * spring);
		}

		for (const path of movablePaths) {
			const position = positions[path]!;
			const size = sizes[path]!;
			const centerPoint = nodeCenter(position, size);
			const force = forces.get(path)!;
			force.x += (center.x - centerPoint.x) * 0.0008;
			force.y += (center.y - centerPoint.y) * 0.0008;
			const magnitude = Math.hypot(force.x, force.y);
			if (magnitude < 0.001) continue;
			const step = Math.min(temperature, magnitude);
			positions[path] = {
				x: Math.max(GRAPH_MARGIN, position.x + force.x / magnitude * step),
				y: Math.max(GRAPH_MARGIN, position.y + force.y / magnitude * step),
			};
		}
	}

	const placed: PlacedNode[] = pinnedPaths.map((path) => ({
		path,
		...manualPositions[path]!,
		...sizes[path]!,
		pinned: true,
	}));
	for (const path of movablePaths.sort((left, right) => {
		const a = positions[left]!;
		const b = positions[right]!;
		return a.y - b.y || a.x - b.x || left.localeCompare(right);
	})) {
		const point = findFreePosition({ path, ...positions[path]!, ...sizes[path]!, pinned: false }, placed, FORCE_NODE_GAP);
		positions[path] = { x: point.x, y: point.y };
		placed.push(point);
	}
	return positions;
}

function readDagreRoutes(
	paths: readonly string[],
	edges: readonly Pick<CanvasReferenceGraphEdge, "sourceCanvasPath" | "targetCanvasPath">[],
	graph: DagreGraph,
): Record<string, CanvasGraphPosition[]> {
	const routes: Record<string, CanvasGraphPosition[]> = {};
	for (const edge of edges) {
		if (!paths.includes(edge.sourceCanvasPath) || !paths.includes(edge.targetCanvasPath)) continue;
		const points = graph.edge(edge.sourceCanvasPath, edge.targetCanvasPath)?.points;
		if (points && points.length >= 2) {
			routes[canvasReferenceEdgeKey(edge.sourceCanvasPath, edge.targetCanvasPath)] = points.map(({ x, y }) => ({ x, y }));
		}
	}
	return routes;
}

function normalizeNodeSizes(paths: readonly string[], supplied: Readonly<CanvasGraphNodeSizeMap> | undefined): CanvasGraphNodeSizeMap {
	const sizes: CanvasGraphNodeSizeMap = {};
	for (const path of paths) sizes[path] = nodeSize(path, supplied ?? {});
	return sizes;
}

function nodeSize(path: string, sizes: Readonly<CanvasGraphNodeSizeMap>): CanvasGraphNodeSize {
	const candidate = sizes[path];
	return candidate && Number.isFinite(candidate.width) && candidate.width > 0 && Number.isFinite(candidate.height) && candidate.height > 0
		? candidate
		: { width: META_CANVAS_NODE_WIDTH, height: META_CANVAS_NODE_HEIGHT };
}

function nodeCenter(position: CanvasGraphPosition, size: CanvasGraphNodeSize): CanvasGraphPosition {
	return { x: position.x + size.width / 2, y: position.y + size.height / 2 };
}

function addForce(forces: Map<string, CanvasGraphPosition>, path: string, x: number, y: number): void {
	const force = forces.get(path);
	if (!force) return;
	force.x += x;
	force.y += y;
}

function stablePhase(value: string): number {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return ((hash >>> 0) / 0xffffffff) * Math.PI * 2;
}

function findFreePosition(
	desired: PlacedNode,
	placed: readonly PlacedNode[],
	clearance: number,
): PlacedNode {
	const start = { x: Math.max(0, desired.x), y: Math.max(0, desired.y) };
	if (!placed.some((other) => rectanglesOverlap(start, desired, other, clearance))) return { ...desired, ...start };
	const maxRings = Math.max(placed.length * 2, 8);
	const stepX = desired.width + NODE_X_GAP + clearance;
	const stepY = desired.height + NODE_Y_GAP + clearance;
	for (let ring = 1; ring <= maxRings; ring += 1) {
		for (let column = 0; column <= ring; column += 1) {
			const row = ring - column;
			const candidates = [
				{ x: start.x + column * stepX, y: start.y + row * stepY },
				{ x: start.x - column * stepX, y: start.y + row * stepY },
				{ x: start.x + row * stepX, y: start.y - column * stepY },
				{ x: start.x - row * stepX, y: start.y - column * stepY },
			];
			for (const candidate of candidates) {
				if (candidate.x < 0 || candidate.y < 0) continue;
				if (!placed.some((other) => rectanglesOverlap(candidate, desired, other, clearance))) return { ...desired, ...candidate };
			}
		}
	}
	const bottom = Math.max(0, ...placed.map((item) => item.y + item.height + clearance));
	return { ...desired, x: start.x, y: bottom };
}

function rectanglesOverlap(
	position: CanvasGraphPosition,
	size: CanvasGraphNodeSize,
	other: PlacedNode,
	clearance: number,
): boolean {
	return position.x < other.x + other.width + clearance
		&& position.x + size.width + clearance > other.x
		&& position.y < other.y + other.height + clearance
		&& position.y + size.height + clearance > other.y;
}

function isPosition(value: unknown): value is CanvasGraphPosition {
	if (typeof value !== "object" || value === null) return false;
	const candidate = value as Record<string, unknown>;
	return typeof candidate.x === "number"
		&& Number.isFinite(candidate.x)
		&& typeof candidate.y === "number"
		&& Number.isFinite(candidate.y);
}
