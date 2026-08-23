import assert from "node:assert/strict"
import test from "node:test"
import mouseUtil from "../.test-build/canvas-mouse-util.js"
import edgeOps from "../.test-build/canvas-edge-operations.js"

const {
	SelectionSwitchTracker,
	computeNewEdgePairs,
	isConnectorActive,
	selectedNodeIds,
	SELECTION_SWITCH_SNAPSHOT_MS,
} = mouseUtil
const { calculateNearestLinkSides } = edgeOps

/** 最小节点形状（与 isCanvasNodeLike 判定一致）。 */
const node = (id) => ({ id, x: 0, y: 0 })

/** 假时钟：手动触发 400ms 清理。 */
function fakeClock() {
	let nextHandle = 0
	const timers = new Map()
	return {
		setTimeout(callback, _ms) {
			const handle = ++nextHandle
			timers.set(handle, callback)
			return handle
		},
		clearTimeout(handle) {
			timers.delete(handle)
		},
		fire() {
			const callbacks = [...timers.values()]
			timers.clear()
			for (const callback of callbacks) callback()
		},
	}
}

test("selectedNodeIds 只取节点（含 x/y 的项），忽略其他元素", () => {
	assert.deepEqual([...selectedNodeIds([{ id: "A", x: 0, y: 0 }, { id: "e1" }])], ["A"])
	assert.deepEqual([...selectedNodeIds([])], [])
})

test("computeNewEdgePairs：旧选区 → 新增节点（N∖O）全对", () => {
	// 空集合
	assert.deepEqual(computeNewEdgePairs([], ["B"]), [])
	assert.deepEqual(computeNewEdgePairs(["A"], []), [])
	// 无变化 / 纯移除（没有新增节点）
	assert.deepEqual(computeNewEdgePairs(["A"], ["A"]), [])
	assert.deepEqual(computeNewEdgePairs(["A", "B"], ["B"]), [])
	// 原生替换选区（N∩O=∅）：新增 = N，退化为 旧→新 全对
	assert.deepEqual(computeNewEdgePairs(["A1", "A2"], ["B"]), [["A1", "B"], ["A2", "B"]])
	assert.deepEqual(computeNewEdgePairs(["A"], ["B", "C"]), [["A", "B"], ["A", "C"]])
	// 原生 Ctrl+点击加入选区（O⊂N）：连 旧→新加入的那个节点
	assert.deepEqual(computeNewEdgePairs(["A"], ["A", "B"]), [["A", "B"]])
	assert.deepEqual(computeNewEdgePairs(["A", "B"], ["A", "B", "C"]), [["A", "C"], ["B", "C"]])
})

test("指针按下+连接键且选中非空 → 快照；点击无交集切换 → 返回连边对并消费", () => {
	const clock = fakeClock()
	const tracker = new SelectionSwitchTracker(clock)
	tracker.onPointerDown(true, [node("A1"), node("A2")])
	const pairs = tracker.onSelectionSwitch(true, [node("B")])
	assert.deepEqual(pairs, [["A1", "B"], ["A2", "B"]])
	// 已消费：再次切换无快照可读
	assert.equal(tracker.onSelectionSwitch(true, [node("C")]), null)
})

test("点击时新选区为空（双击空白第一下）→ 保留快照，dblclick 兜底再触发", () => {
	const clock = fakeClock()
	const tracker = new SelectionSwitchTracker(clock)
	tracker.onPointerDown(true, [node("A")])
	assert.equal(tracker.onSelectionSwitch(true, []), null) // 第一下 click，N 空，保留
	const pairs = tracker.onSelectionSwitch(true, [node("B")]) // dblclick 兜底
	assert.deepEqual(pairs, [["A", "B"]])
})

test("纯移除/无变化（没有新增节点）→ 不连边且清空快照", () => {
	const clock = fakeClock()
	const tracker = new SelectionSwitchTracker(clock)
	tracker.onPointerDown(true, [node("A"), node("B")])
	assert.equal(tracker.onSelectionSwitch(true, [node("B")]), null) // 只有移除，无新增
	assert.equal(tracker.onSelectionSwitch(true, [node("C")]), null) // 快照已清
})

test("点击把新节点加入选区（O⊂N）→ 连 旧→新加入的节点", () => {
	const clock = fakeClock()
	const tracker = new SelectionSwitchTracker(clock)
	tracker.onPointerDown(true, [node("A"), node("B")])
	const pairs = tracker.onSelectionSwitch(true, [node("A"), node("B"), node("C")])
	assert.deepEqual(pairs, [["A", "C"], ["B", "C"]])
})

test("400ms 后快照过期清理", () => {
	const clock = fakeClock()
	const tracker = new SelectionSwitchTracker(clock)
	tracker.onPointerDown(true, [node("A")])
	assert.equal(SELECTION_SWITCH_SNAPSHOT_MS, 400)
	clock.fire()
	assert.equal(tracker.onSelectionSwitch(true, [node("B")]), null) // 快照已清
})

test("未按连接键 / 选区为空 不产生快照", () => {
	const clock = fakeClock()
	const tracker = new SelectionSwitchTracker(clock)
	tracker.onPointerDown(false, [node("A")]) // 未按连接键
	assert.equal(tracker.onSelectionSwitch(true, [node("B")]), null)
	tracker.onPointerDown(true, []) // 连接键按但选区空
	assert.equal(tracker.onSelectionSwitch(true, [node("B")]), null)
})

test("双击第二下 pointerdown（选区已被原生清空）不覆盖首次快照", () => {
	const clock = fakeClock()
	const tracker = new SelectionSwitchTracker(clock)
	tracker.onPointerDown(true, [node("A")]) // 第一下：快照 [A]
	tracker.onPointerDown(true, []) // 第二下：选区已空 → 不覆盖
	const pairs = tracker.onSelectionSwitch(true, [node("B")])
	assert.deepEqual(pairs, [["A", "B"]])
})

test("click 时连接键已松手 → 不消费快照（原生行为不受影响）", () => {
	const clock = fakeClock()
	const tracker = new SelectionSwitchTracker(clock)
	tracker.onPointerDown(true, [node("A")])
	assert.equal(tracker.onSelectionSwitch(false, [node("B")]), null)
})

test("getSourceIds：快照优先，空快照退化到锚点", () => {
	const clock = fakeClock()
	const tracker = new SelectionSwitchTracker(clock)
	assert.equal(tracker.getSourceIds(), null)
	tracker.lastAnchor = "A"
	assert.deepEqual([...tracker.getSourceIds()], ["A"]) // 退化到锚点
	tracker.onPointerDown(true, [node("X")])
	assert.deepEqual([...tracker.getSourceIds()], ["X"]) // 快照优先
})

test("松开连接键后清空快照并重置锚点 → 无遗留源", () => {
	const clock = fakeClock()
	const tracker = new SelectionSwitchTracker(clock)
	tracker.onPointerDown(true, [node("A")])
	tracker.lastAnchor = "A"
	tracker.clearSnapshot()
	tracker.lastAnchor = null
	assert.equal(tracker.getSourceIds(), null)
})

test("isConnectorActive：修饰键读事件 flag，普通键读 held", () => {
	const noMods = { ctrlKey: false, shiftKey: false, altKey: false, metaKey: false }
	assert.equal(isConnectorActive({ ...noMods, ctrlKey: true }, "ControlLeft", false), true)
	assert.equal(isConnectorActive(noMods, "ControlLeft", true), false) // 修饰键忽略 held
	assert.equal(isConnectorActive(noMods, "KeyE", true), true) // 普通键读 held
	assert.equal(isConnectorActive(noMods, "KeyE", false), false)
	assert.equal(isConnectorActive({ ...noMods, shiftKey: true }, "ShiftRight", false), true)
	assert.equal(isConnectorActive({ ...noMods, altKey: true }, "AltLeft", false), true)
	assert.equal(isConnectorActive({ ...noMods, metaKey: true }, "MetaRight", false), true)
})

test("calculateNearestLinkSides：左右并排 → right/left", () => {
	const left = { minX: 0, minY: 0, maxX: 100, maxY: 60 }
	const right = { minX: 200, minY: 0, maxX: 300, maxY: 60 }
	assert.deepEqual(calculateNearestLinkSides(left, right), ["right", "left"])
})

test("calculateNearestLinkSides：上下 → bottom/top", () => {
	const top = { minX: 0, minY: 0, maxX: 100, maxY: 60 }
	const bottom = { minX: 0, minY: 200, maxX: 100, maxY: 260 }
	assert.deepEqual(calculateNearestLinkSides(top, bottom), ["bottom", "top"])
})

test("calculateNearestLinkSides：对角最近 → 欧氏距离最小的两侧（并列取先序）", () => {
	const a = { minX: 0, minY: 0, maxX: 40, maxY: 40 }
	const b = { minX: 100, minY: 100, maxX: 140, maxY: 140 }
	// a 的 right/top 中点 vs b 的 top/left 中点，最小平方距离并列 12800；迭代序先到 (right, top)
	assert.deepEqual(calculateNearestLinkSides(a, b), ["right", "top"])
})
