import type { Canvas, CanvasNode, ParamCanvasCreateNodePosition } from "obsidian/canvas";

export interface CanvasTextNodeOptions {
	x: number;
	y: number;
	position?: ParamCanvasCreateNodePosition;
	width?: number;
	height?: number;
	text?: string;
	color?: string;
}

/**
 * 创建文本节点的唯一入口。
 *
 * Obsidian 的 createTextNode() 已经把节点加入 Canvas；这里故意不再调用
 * canvas.addNode()，避免重复注册同一个节点，也把 save=false 留给外层事务。
 */
export function createCanvasTextNode(canvas: Canvas, {
	x,
	y,
	position = "center",
	width = 260,
	height = 60,
	text = "",
	// Obsidian's native double-click creation uses an empty color string
	// for the default Canvas node color. Do not replace it with "0".
	color = "",
}: CanvasTextNodeOptions): CanvasNode {
	const node = canvas.createTextNode({
		pos: { x, y },
		position,
		save: false,
		focus: false,
		size: { width, height },
		text,
	});

	node.bbox = {
		minX: node.x,
		minY: node.y,
		maxX: node.x + node.width,
		maxY: node.y + node.height,
	};
	node.color = color;

	return node;
}
