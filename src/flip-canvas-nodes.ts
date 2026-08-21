/**
 * 翻转白板中卡片及其连边的相对位置
 */

import { Canvas, CanvasEdge, CanvasElementSide, CanvasNode } from 'obsidian/canvas';
import { App, MenuItem } from 'obsidian';
import { getActiveCanvasView, getEdgesBetweenNodes, isCanvasEdge, registerCanvasMenuItem, selectedNodes, setNodePosition, updateEdgeData } from './utils';
import { EN_US, I18nText, i18nText, ZH_CN } from './i18n';
import { commitCanvasMutation } from './canvas-mutations';
import { collectEdgesForFlip } from './canvas-flip';

enum FlipMode {
	Horizontal = "h",
	Vertical = "v",
}

/**
 * API：横向翻转白板元素位置
 */
function flipCanvasElements(canvas: Canvas, nodes: Set<CanvasNode>, mode: FlipMode): void {
	if (nodes.size <= 0) return
	const center = calculateCenter(nodes)
	const directlySelectedEdges = [...canvas.selection].filter(isCanvasEdge)
	const edges = collectEdgesForFlip(directlySelectedEdges, getEdgesBetweenNodes(canvas, nodes))
	commitCanvasMutation(canvas, () => {
		for (const node of nodes) flip1Node(center, node, mode)
		for (const edge of edges) flip1Edge(edge, mode)
	})
}

function calculateCenter(nodes: Set<CanvasNode>): [number, number] {
	let [minCX, minCY, maxCX, maxCY] = [Infinity, Infinity, -Infinity, -Infinity]
	for (const node of nodes) {
		const { minX, minY, maxX, maxY } = node.bbox
		minCX = Math.min(minCX, minX)
		minCY = Math.min(minCY, minY)
		maxCX = Math.max(maxCX, maxX)
		maxCY = Math.max(maxCY, maxY)
	}
	let centerX = (minCX + maxCX) / 2
	if (!isFinite(centerX)) centerX = 0
	let centerY = (minCY + maxCY) / 2
	if (!isFinite(centerY)) centerY = 0
	return [centerX, centerY]
}

/** 实验确证 by GeoGebra */
function mirrorX(x: number, centerX: number) {
	return centerX - (x - centerX)
}

/** 实验确证 by GeoGebra */
function mirrorY(y: number, centerY: number) {
	return centerY - (y - centerY)
}

function flip1Node(center: [number, number], node: CanvasNode, mode: FlipMode) {
	// 获取上下左右边界
	const { minX, minY, maxX, maxY } = node.bbox
	const [centerX, centerY] = center
	// 对称映射坐标
	let [newMinX, newMaxX, newMinY, newMaxY] = [minX, maxX, minY, maxY]
	switch (mode) {
		case FlipMode.Horizontal:
			newMinX = mirrorX(minX, centerX)
			newMaxX = mirrorX(maxX, centerX)
			break
		case FlipMode.Vertical:
			newMinY = mirrorY(minY, centerY)
			newMaxY = mirrorY(maxY, centerY)
			break
	}
	const x = Math.min(newMinX, newMaxX)
	const y = Math.min(newMinY, newMaxY)
	// 更新位置 | 镜像映射后节点长宽不变，因此无需设置
	setNodePosition(node, x, y)
}

function flipSide(side: CanvasElementSide, mode: FlipMode) {
	switch (mode) {
		case FlipMode.Horizontal: // 横向翻转，顶部和底部不变
			if (side === "left") return "right"
			if (side === "right") return "left"
			return side
		case FlipMode.Vertical:
			if (side === "top") return "bottom"
			if (side === "bottom") return "top"
			return side
	}
}

function flip1Edge(edge: CanvasEdge, mode: FlipMode) {
	const { fromSide, toSide } = edge.getData()
	const newFromSide = fromSide ? flipSide(fromSide, mode) : fromSide
	const newToSide = toSide ? flipSide(toSide, mode) : toSide
	updateEdgeData(edge, { fromSide: newFromSide, toSide: newToSide })
}

/**
 * 统一生成「上下」和「左右」两种事件
 */
function genEvent(title: I18nText, mode: FlipMode) {
	return registerCanvasMenuItem({
		// 在白板中右键卡片、边或选中多个元素时，添加菜单项
		on: ["canvas:selection-menu"],
		item: {
			title: (_) => i18nText(title),
			icon: mode === FlipMode.Horizontal ? "flip-horizontal" : "flip-vertical",
			section: "action",
			onClick: (canvas: Canvas, _item: MenuItem, _event: KeyboardEvent | MouseEvent) => {
				const nodes = new Set(selectedNodes(canvas))
				flipCanvasElements(canvas, nodes, mode);
			}
		}
	})
}

/**
 * 统一生成「上下」和「左右」两种命令
 */
function genCommand(title: I18nText, mode: FlipMode) {
	return (app: App) => ({
		id: `flip-canvas-elements-${mode}`,
		name: i18nText(title),
		checkCallback(checking: boolean) {
			// Conditions to check
			const result = getActiveCanvasView(app);
			if (!result) return;

			// If checking is true, we're simply "checking" if the command can be run.
			if (checking) return true;
			// If checking is false, then we want to actually perform the operation.

			// Copy card reference
			const { canvas } = result

			const nodes = new Set(selectedNodes(canvas))
			flipCanvasElements(canvas, nodes, mode);
		}
	})
}

// 对接外部插件
const I18N_FLIP_H = {
	[EN_US]: 'Flip Canvas Elements Horizontally',
	[ZH_CN]: '水平翻转白板元素',
}
const I18N_FLIP_V = {
	[EN_US]: 'Flip Canvas Elements Vertically',
	[ZH_CN]: '垂直翻转白板元素',
}

export const EVENT_flipCanvasElementsH = genEvent(I18N_FLIP_H, FlipMode.Horizontal)
export const EVENT_flipCanvasElementsV = genEvent(I18N_FLIP_V, FlipMode.Vertical)
export const CMD_flipCanvasElementsH = genCommand(I18N_FLIP_H, FlipMode.Horizontal)
export const CMD_flipCanvasElementsV = genCommand(I18N_FLIP_V, FlipMode.Vertical)
