import type { Canvas, CanvasElementSide, CanvasNode } from "obsidian/canvas";
import { createCanvasElementId } from "./uuid";

/**
 * 添加连边，但不负责保存整个 Canvas。
 * 调用方应把它放进 commitCanvasMutation()，从而只产生一次保存和历史记录。
 */
export function addCanvasEdge(
	canvas: Canvas,
	from: CanvasNode,
	to: CanvasNode,
	fromSide: CanvasElementSide,
	toSide: CanvasElementSide,
	refresh = true,
): string | undefined {
	if (!canvas) return undefined;

	const data = canvas.getData();
	if (!data) return undefined;

	const id = createCanvasElementId();
	canvas.importData({
		edges: [
			...data.edges,
			{
				id,
				fromNode: from.id,
				fromSide,
				toNode: to.id,
				toSide,
			},
		],
		nodes: data.nodes,
	});

	if (refresh) canvas.requestFrame();
	return id;
}
