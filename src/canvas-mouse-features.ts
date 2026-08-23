/**
 * 选择切换自动连边：事件处理层。
 *
 * 只做接线与副作用（快照、连边、补选）；纯判定逻辑在 `canvas-mouse-util.ts`。
 * 事件处理**绝不 preventDefault / stopImmediatePropagation**，原生白板行为保持原样。
 */

import type { Canvas, CanvasNode } from "obsidian/canvas";
import { commitCanvasMutation } from "./canvas-mutations";
import { addNearestEdge } from "./canvas-edge-operations";
import { computeNewEdgePairs } from "./canvas-mouse-util";
import type { SelectionSwitchTracker } from "./canvas-mouse-util";

/**
 * pointerdown（capture）：在原生清空/替换选区之前，快照旧选区。
 */
export function onCanvasPointerDown(
	canvas: Canvas,
	tracker: SelectionSwitchTracker,
	connectorActive: boolean,
): void {
	tracker.onPointerDown(connectorActive, canvas.selection)
}

/**
 * click / dblclick（capture）：选区发生无交集切换时自动连边。
 * 若 N 为空（如双击空白的第一下 click），tracker 会保留快照等 dblclick 兜底。
 * @returns 是否实际创建了连边。
 */
export function onCanvasSelectionSwitch(
	canvas: Canvas,
	tracker: SelectionSwitchTracker,
	connectorActive: boolean,
): boolean {
	const pairs = tracker.onSelectionSwitch(connectorActive, canvas.selection)
	if (pairs && pairs.length > 0) {
		connectOldToNew(canvas, pairs)
		return true
	}
	return false
}

/**
 * 从事件目标向上找所属的 Canvas 节点。
 */
export function findClickedNode(
	canvas: Canvas,
	target: EventTarget | null,
): CanvasNode | undefined {
	let el = target as (Element & { parentElement?: Element | null }) | null
	for (let depth = 0; el && depth < 24; depth++) {
		for (const node of canvas.nodes.values()) {
			const nodeEl = (node as { nodeEl?: Element }).nodeEl
			if (nodeEl && (nodeEl === el || nodeEl.contains(el))) return node
		}
		el = el.parentElement ?? null
	}
	return undefined
}

/**
 * 连接键 + 点击「已存在节点」：部分 Obsidian 在按住连接键时不切换选区，
 * 这里主动把选中切到被点击节点，并连 旧→该节点。
 */
export function onConnectorNodeClick(
	canvas: Canvas,
	tracker: SelectionSwitchTracker,
	clickedNodeId: string,
	connectorActive: boolean,
): boolean {
	if (!connectorActive) return false
	const source = tracker.getSourceIds()
	if (!source || source.size === 0) return false
	if (source.has(clickedNodeId)) return false
	const pairs = computeNewEdgePairs(source, [clickedNodeId])
	tracker.clearSnapshot()
	if (pairs.length === 0) return false
	connectOldToNew(canvas, pairs)
	tracker.lastAnchor = clickedNodeId // 被点击节点成为下一次链式锚点
	const node = canvas.nodes.get(clickedNodeId)
	if (node) canvas.selectOnly(node)
	return true
}

/**
 * 双击空白创建节点：原生在我们 capture 处理器之后才创建节点，
 * 因此这里延时（事件循环后）查找「正在编辑的新节点」并连 旧→它。
 * @returns 是否创建了连边。
 */
export function tryDeferredConnect(
	canvas: Canvas,
	tracker: SelectionSwitchTracker,
): boolean {
	const source = tracker.getSourceIds()
	// 刚创建的节点通常进入编辑态：找正在编辑的节点
	let newNode: CanvasNode | undefined
	for (const n of canvas.nodes.values()) {
		if ((n as { isEditing?: boolean }).isEditing) {
			newNode = n
			break
		}
	}
	// 兜底：选区里不在源中的节点
	if (!newNode) {
		for (const el of canvas.selection) {
			const n = el as CanvasNode
			if (n && typeof n.id === "string" && "x" in n && "y" in n && !(source && source.has(n.id))) {
				newNode = n
				break
			}
		}
	}
	if (!newNode) return false
	let connected = false
	if (source && !source.has(newNode.id)) {
		const pairs = computeNewEdgePairs(source, [newNode.id])
		tracker.clearSnapshot()
		if (pairs.length > 0) {
			connectOldToNew(canvas, pairs)
			connected = true
		}
	}
	// 新创建节点成为下一次链式锚点（即使本次没连，也作为后续起点）
	tracker.lastAnchor = newNode.id
	return connected
}

/**
 * 为旧选区每个节点 → 新选区每个节点创建最近锚点连边（单向、幂等）。
 * 一次事务保存进一次历史；importData 重渲染后补选新选区，保证链条下一节能快照到。
 */
export function connectOldToNew(
	canvas: Canvas,
	pairs: ReadonlyArray<[string, string]>,
): void {
	const addedEdges: Array<[string, string]> = []
	const addedToIds = new Set<string>()
	commitCanvasMutation(canvas, () => {
		for (const [fromId, toId] of pairs) {
			const from = canvas.nodes.get(fromId)
			const to = canvas.nodes.get(toId)
			if (!from || !to) continue
			if (hasDirectEdge(canvas, from, to)) continue // 幂等：已存在 from→to 跳过
			addNearestEdge(canvas, from, to)
			addedEdges.push([fromId, toId])
			addedToIds.add(toId)
		}
	})

	for (const id of addedToIds) {
		const node = canvas.nodes.get(id)
		if (node && !canvas.selection.has(node)) canvas.select(node)
	}
	if (addedEdges.length > 0) {
		console.log("[mouse-connect] ✅ 成功创建 " + addedEdges.length + " 条边: " + addedEdges.map(([f, t]) => f + "→" + t).join(", "))
	}
}

/** 是否已存在 from→to 的直接连边（避免 click/dblclick 双触发产生重复边）。 */
function hasDirectEdge(canvas: Canvas, from: CanvasNode, to: CanvasNode): boolean {
	const data = canvas.getData()
	if (!data) return false
	return data.edges.some(edge => edge.fromNode === from.id && edge.toNode === to.id)
}
