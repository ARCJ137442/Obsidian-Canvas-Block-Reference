import type { BoundedBox, Canvas, CanvasElementSide, CanvasNode, NodeSide } from "obsidian/canvas";
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

/**
 * 以「最近锚点」原则创建单向连边 from→to（不负责保存，交给外层事务）。
 */
export function addNearestEdge(
	canvas: Canvas,
	from: CanvasNode,
	to: CanvasNode,
): string | undefined {
	const [fromSide, toSide] = calculateNearestLinkSides(from.getBBox(), to.getBBox())
	return addCanvasEdge(canvas, from, to, fromSide, toSide, false)
}

/** 所有的「侧」：上下左右 */
const NODE_SIDES: NodeSide[] = ["top", "right", "bottom", "left"]

/**
 * 计算一个碰撞箱四周居中的点
 * * 🚩返回三元组的列表：
 */
function* getSidePointsByBox(box: BoundedBox): Generator<[NodeSide, number, number]> {
	const [centerX, centerY] = [
		(box.minX + box.maxX) / 2,
		(box.minY + box.maxY) / 2,
	]
	for (const side of NODE_SIDES)
		// x：左- 右+
		// y：上- 下+
		switch (side) {
			case "top":
				yield [side, centerX, box.minY]
				break
			case "bottom":
				yield [side, centerX, box.maxY]
				break
			case "right":
				yield [side, box.maxX, centerY]
				break
			case "left":
				yield [side, box.minX, centerY]
				break
		}
}

/** 通过「四周居中的点」来计算出最近的边 */
export function calculateNearestLinkSides(boxF: BoundedBox, boxT: BoundedBox): [NodeSide, NodeSide] {
	let [minSideF, minSideT]: (NodeSide | null)[] = [null, null]
	let minDistance2 = Infinity
	for (const [sideF, xF, yF] of getSidePointsByBox(boxF))
		for (const [sideT, xT, yT] of getSidePointsByBox(boxT)) {
			const distance2 = (xF - xT) ** 2 + (yF - yT) ** 2
			if (!minSideF || !minSideT || distance2 < minDistance2) {
				minDistance2 = distance2
				minSideF = sideF
				minSideT = sideT
			}
		}
	return [minSideF!, minSideT!]
}
