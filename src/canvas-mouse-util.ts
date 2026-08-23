/**
 * 选择切换自动连边：纯逻辑与状态机。
 *
 * 运行时不依赖 obsidian 运行时模块（可被 node --test 直接测试）。
 * 事件接线见 `canvas-mouse-features.ts`。
 */

/** 双击窗口：一次 pointerdown 快照在此时间后失效。 */
export const SELECTION_SWITCH_SNAPSHOT_MS = 400

/** 是否像一个 Canvas 节点（Obsidian 未暴露节点类型，用 x/y 属性判断，与 utils.ts 一致）。 */
export function isCanvasNodeLike(element: unknown): element is { id: string } {
	return typeof element === "object"
		&& element !== null
		&& "x" in element
		&& "y" in element
		&& typeof (element as { id?: unknown }).id === "string"
}

/** 从 canvas.selection 提取节点 id 集合。 */
export function selectedNodeIds(selection: Iterable<unknown>): Set<string> {
	const ids = new Set<string>()
	for (const element of selection) {
		if (isCanvasNodeLike(element)) ids.add(element.id)
	}
	return ids
}

/**
 * 旧选区 O → 「新增节点」的全对组合。
 *
 * 规则：只要新选区 N 比旧选区 O 多出节点（新增 = N∖O，非空），就为 每个旧节点 → 每个新增节点
 * 连边。这同时覆盖两种原生行为：
 * - 原生「替换选区」（N∩O=∅）：新增 = N，退化为 旧→新 全对；
 * - 原生「Ctrl+点击加入选区」（O⊂N）：新增 = N∖O，连 旧→新加入的那个节点。
 * 若 N 没有新增节点（纯移除/无变化）→ 返回 []。
 */
export function computeNewEdgePairs(
	oldIds: Iterable<string>,
	newIds: Iterable<string>,
): Array<[string, string]> {
	const oldSet = new Set(oldIds)
	const newSet = new Set(newIds)
	if (oldSet.size === 0 || newSet.size === 0) return []
	const added: string[] = []
	for (const id of newSet) {
		if (!oldSet.has(id)) added.push(id)
	}
	if (added.length === 0) return [] // 没有新增节点
	const pairs: Array<[string, string]> = []
	for (const o of oldSet) {
		for (const n of added) {
			pairs.push([o, n])
		}
	}
	return pairs
}

/** 注入的时钟，便于测试用假时钟驱动 400ms 清理。 */
export interface TrackerClock {
	setTimeout(callback: () => void, ms: number): unknown
	clearTimeout(handle: unknown): void
}

/**
 * 无交集切换状态机。
 *
 * - pointerdown（capture）：连接键按住且当前有选中节点时快照旧选区（保留首次）。
 * - click/dblclick：判定切换并消费快照。
 */
export class SelectionSwitchTracker {
	private snapshot: Set<string> | null = null
	private timerHandle: unknown = undefined
	/** 最近一次连边/创建的目标节点，作为选区不可靠时（链式）的锚点。 */
	lastAnchor: string | null = null

	constructor(private readonly clock: TrackerClock) {}

	/**
	 * 连边源：优先当前快照（pointerdown 捕获的选区），否则退化为最近锚点。
	 * 链式双击时，前一个节点常被原生从选区清掉 → 用锚点兜底。
	 */
	getSourceIds(): Set<string> | null {
		if (this.snapshot && this.snapshot.size > 0) return this.snapshot
		if (this.lastAnchor) return new Set([this.lastAnchor])
		return null
	}

	/** pointerdown：连接键按住且当前有选中节点时快照旧选区（双次点击保留首次快照）。 */
	onPointerDown(connectorActive: boolean, currentSelection: Iterable<unknown>): void {
		if (!connectorActive) return
		const ids = selectedNodeIds(currentSelection)
		if (ids.size === 0) return
		this.snapshot = ids
		this.restartTimer()
	}

	/**
	 * click / dblclick：
	 * - 连接键未按住或无快照 → 返回 null，不消费。
	 * - 新选区为空（如双击空白的第一下 click）→ 返回 null，保留快照等 dblclick 兜底。
	 * - 发生无交集切换 → 返回连边对并清空快照。
	 * - 有交集 → 本次切换终止，清空快照并返回 null。
	 */
	onSelectionSwitch(
		connectorActive: boolean,
		currentSelection: Iterable<unknown>,
	): Array<[string, string]> | null {
		if (!connectorActive) return null
		if (!this.snapshot || this.snapshot.size === 0) return null
		const newIds = selectedNodeIds(currentSelection)
		if (newIds.size === 0) return null // 保留快照：可能是双击空白的第一下 click
		const pairs = computeNewEdgePairs(this.snapshot, newIds)
		this.clearSnapshot()
		if (pairs.length === 0) return null // 有交集 → 不是切换
		return pairs
	}

	/** 当前快照（pointerdown 捕获的旧选区节点 id）。 */
	get snapshotNodes(): ReadonlySet<string> | null {
		return this.snapshot
	}

	/** 清空快照与计时器。 */
	clearSnapshot(): void {
		this.snapshot = null
		if (this.timerHandle !== undefined) {
			this.clock.clearTimeout(this.timerHandle)
			this.timerHandle = undefined
		}
	}

	private restartTimer(): void {
		if (this.timerHandle !== undefined) this.clock.clearTimeout(this.timerHandle)
		this.timerHandle = this.clock.setTimeout(() => {
			this.snapshot = null
			this.timerHandle = undefined
		}, SELECTION_SWITCH_SNAPSHOT_MS)
	}
}

/**
 * 判断连接触发键当前是否按住。
 *
 * 修饰键码（ControlLeft 等）→ 直接读鼠标事件的对应 flag，最稳（不受节点编辑态影响）；
 * 普通键码（如 KeyE）→ 读每窗口 keydown/keyup 追踪到的 held 状态。
 */
export function isConnectorActive(
	event: Pick<MouseEvent, "ctrlKey" | "shiftKey" | "altKey" | "metaKey">,
	connectorCode: string,
	connectorHeld: boolean,
): boolean {
	switch (connectorCode) {
		case "ControlLeft":
		case "ControlRight":
			return event.ctrlKey
		case "ShiftLeft":
		case "ShiftRight":
			return event.shiftKey
		case "AltLeft":
		case "AltRight":
			return event.altKey
		case "MetaLeft":
		case "MetaRight":
			return event.metaKey
		default:
			return connectorHeld
	}
}
