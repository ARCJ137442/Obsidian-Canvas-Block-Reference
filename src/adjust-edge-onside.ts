/**
 * 反转白板所选连边
 *
 * ! 实验性：仅用于个人实验
 * * ❗【2025-04-23 16:51:43】后续可能会独立出一个插件
 */

import { ZH_CN, EN_US } from './i18n';
import { App, MenuItem } from "obsidian";
import { BoundedBox, Canvas, CanvasEdge, CanvasEdgeData, NodeSide } from "obsidian/canvas";
import { filteredDatasByKey, getActiveCanvasView, getEdgesBetweenNodes, getNodesAroundEdges, registerCanvasMenuItem, selectedEdges, selectedEdgesIncludesBetweens, selectedNodes, updateEdgeData } from "src/utils";
import { i18nText } from "./i18n";
import { commitCanvasMutation } from "./canvas-mutations";

/** 统一的功能名称（命令/右键菜单） */
const NAME_DICT = {
	[EN_US]: "Adjust the connection position of the selected edge(s)",
	[ZH_CN]: "调整所选连边的连接位置",
}

/** 切换 节点/连边 选择 功能名称 */
const TOGGLE_NODE_EDGE_SELECT = {
	[EN_US]: "Toggle node/edge selection",
	[ZH_CN]: "切换节点/连边选择",
}

/**
 * 注册事件：右键菜单复制选区内容链接
 * * 🔗参考：<https://forum.obsidian.md/t/creating-an-event-for-menus-on-canvas-items/85646/7>
 */
export const EVENT_adjustEdgeOnside = registerCanvasMenuItem({
	// 只有一个边
	on: ["canvas:edge-menu", "canvas:selection-menu"],
	item: {
		title: (_) => i18nText(NAME_DICT),
		icon: "cable", // https://lucide.dev/icons/cable
		section: "action",
		onClick: (canvas: Canvas, _item: MenuItem, _event: KeyboardEvent | MouseEvent) => {
			/** 标记哪些边被转换过 */
			adjustSelectedEdgesOnside(canvas)
		}
	}
})

export const EVENT_toggleNodeEdgeSelect = registerCanvasMenuItem({
	on: ["canvas:selection-menu"],
	item: {
		title: (_) => i18nText(TOGGLE_NODE_EDGE_SELECT),
		icon: "square-dashed-mouse-pointer",
		section: "action",
		onClick: toggleNodeEdgeSelect,
	}
})

/** 对接外部插件 */
export const CMD_adjustEdgeOnside = (app: App) => ({
	id: 'adjust-edge-onside',
	name: i18nText(NAME_DICT),
	checkCallback(checking: boolean) {
		// Conditions to check
		const result = getActiveCanvasView(app);
		if (!result) return;

		// If checking is true, we're simply "checking" if the command can be run.
		if (checking) return true;
		// If checking is false, then we want to actually perform the operation.

		// Copy card reference
		const { canvas } = result

		// 获取边并反转
		adjustSelectedEdgesOnside(canvas)

		// This command will only show up in Command Palette when the check function returns true
		return true;
	}
})

export const CMD_toggleNodeEdgeSelect = (app: App) => ({
	id: 'toggle-node-edge-select',
	name: i18nText(TOGGLE_NODE_EDGE_SELECT),
	checkCallback(checking: boolean) {
		const result = getActiveCanvasView(app);
		if (!result) return;
		const { canvas } = result;

		if (checking) return canvas.selection.size > 0;

		toggleNodeEdgeSelect(canvas)
		return true;
	}
})

export function toggleNodeEdgeSelect(canvas: Canvas): void {
	// 缓存所有选中的节点、连边
	const nodesSelected = new Set(selectedNodes(canvas));
	const edgesSelected = new Set(selectedEdges(canvas));

	canvas.deselectAll();

	// 选中相应节点、连边
	for (const node of getNodesAroundEdges(edgesSelected)) {
		canvas.select(node)
	}
	for (const edge of getEdgesBetweenNodes(canvas, nodesSelected)) {
		canvas.select(edge);
	}
}

export function adjustSelectedEdgesOnside(canvas: Canvas): void {
	commitCanvasMutation(canvas, () => {
		for (const e of filteredDatasByKey(selectedEdgesIncludesBetweens(canvas), e => e.id))
			// 已标记的边不再处理
			// 遍历选择的边
			adjustEdgeOnside(e)
	}, { refresh: false })
}

/** 反转一个边对象 */
export function adjustEdgeOnside(e: CanvasEdge): void {
	// 获取白板，用于索引节点
	const canvas = e.canvas
	// 获取头尾节点
	const { toNode, fromNode } = e.getData()
	const [nodeF, nodeT] = [canvas.nodes.get(fromNode), canvas.nodes.get(toNode)]
	if (!nodeF || !nodeT) {
		console.warn("CanvasEdge: Can't find node", e.id, "on edge", e, ", skipped")
		return
	}
	// 获取头尾节点的碰撞箱
	const [boxF, boxT] = [nodeF.getBBox(), nodeT.getBBox()]
	// 根据俩碰撞箱计算出最近的俩侧
	const [sideF, sideT] = calculateNearestLinkSides(boxF, boxT)
	// 设置这俩侧
	setSidesForEdge(e, sideF, sideT)
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
function calculateNearestLinkSides(boxF: BoundedBox, boxT: BoundedBox): [NodeSide, NodeSide] {
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

/**
 * 反转后的数据：修改并返回修改后的数据
 * * 🚩实质上就是交换变量的值
 */
function setSidesForEdge(e: CanvasEdge, sideF: NodeSide, sideT: NodeSide) {
	updateEdgeData(e, {
		fromSide: sideF,
		toSide: sideT,
	})
}
