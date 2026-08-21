import type { CanvasEdge, CanvasNode } from "obsidian/canvas"

/** 仅收集明确进入翻转范围的边：直接选中的边，或选中节点之间的边。 */
export function collectEdgesForFlip(
	selectedEdges: Iterable<CanvasEdge>,
	edgesBetweenSelectedNodes: Iterable<CanvasEdge>,
): Set<CanvasEdge> {
	const edges = new Set<CanvasEdge>(selectedEdges)
	for (const edge of edgesBetweenSelectedNodes) edges.add(edge)
	return edges
}
