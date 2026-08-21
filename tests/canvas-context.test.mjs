import assert from "node:assert/strict"
import test from "node:test"
import context from "../.test-build/canvas-context.js"
import shortcuts from "../.test-build/canvas-shortcuts.js"
import mutations from "../.test-build/canvas-mutations.js"
import uuid from "../.test-build/uuid.js"
import ids from "../.test-build/canvas-id.js"
import clipboard from "../.test-build/clipboard.js"
import flip from "../.test-build/canvas-flip.js"
import layout from "../.test-build/brickLayout.js"
import suggestData from "../.test-build/canvas-link-suggest-data.js"
import nodeOperations from "../.test-build/canvas-node-operations.js"
import edgeOperations from "../.test-build/canvas-edge-operations.js"
import zoomModule from "../.test-build/canvas-zoom.js"
import guardModule from "../.test-build/keyboard-event-guard.js"
import registryModule from "../.test-build/window-registration.js"

const {
	canHandleCanvasKeyboardEvent,
	getCanvasFromEvent,
	isCanvasEditing,
	isEditableTarget,
} = context
const { getCanvasShortcutId, getCanvasShortcutConflicts, DEFAULT_CANVAS_SHORTCUT_SETTINGS, normalizeCanvasShortcutSettings } = shortcuts
const { commitCanvasMutation } = mutations
const { createCanvasElementId } = uuid
const { normalizeCanvasElementId, validateCanvasElementId } = ids
const { writeTextToClipboard } = clipboard
const { collectEdgesForFlip } = flip
const { packRectangles } = layout
const { parseCanvasNodes } = suggestData
const { createCanvasTextNode } = nodeOperations
const { addCanvasEdge } = edgeOperations
const { createContinuousZoomController } = zoomModule
const { KeyboardEventGuard } = guardModule
const { WindowRegistrationRegistry } = registryModule

const keyboardEvent = (overrides = {}) => ({
	key: "",
	code: "",
	shiftKey: false,
	ctrlKey: false,
	altKey: false,
	metaKey: false,
	defaultPrevented: false,
	isComposing: false,
	repeat: false,
	target: null,
	...overrides,
})

test("快捷键匹配集中配置的默认组合", () => {
	assert.equal(getCanvasShortcutId(keyboardEvent({ key: "c", code: "KeyC" })), "cycleColor")
	assert.equal(getCanvasShortcutId(keyboardEvent({ key: "C", code: "KeyC", shiftKey: true })), "cycleColor")
	assert.equal(getCanvasShortcutId(keyboardEvent({ key: "c", code: "KeyC", ctrlKey: true })), undefined)
	assert.equal(getCanvasShortcutId(keyboardEvent({ key: "e", code: "KeyE" })), "extend")
	assert.equal(getCanvasShortcutId(keyboardEvent({ key: "E", code: "KeyE", shiftKey: true, ctrlKey: true, altKey: true })), "compactLayout")
	assert.equal(getCanvasShortcutId(keyboardEvent({ key: "w", code: "KeyW", ctrlKey: true })), undefined)
	assert.equal(getCanvasShortcutId(keyboardEvent({ key: "1", code: "Digit1", altKey: true })), "formatTitle")
	assert.equal(getCanvasShortcutId(keyboardEvent({ key: "!", code: "Digit1", shiftKey: true })), undefined)
})

test("快捷键配置会同步影响主/副窗口使用的同一匹配器", () => {
	const settings = normalizeCanvasShortcutSettings({ ...DEFAULT_CANVAS_SHORTCUT_SETTINGS, zoom: "KeyP", cycleColor: "KeyV" })
	assert.equal(getCanvasShortcutId(keyboardEvent({ code: "KeyP" }), settings), "zoom")
	assert.equal(getCanvasShortcutId(keyboardEvent({ code: "KeyZ" }), settings), undefined)
	assert.equal(getCanvasShortcutId(keyboardEvent({ code: "KeyV" }), settings), "cycleColor")
})

test("快捷键选择器拦截会造成无关路径误触发的重叠按键", () => {
	assert.ok(getCanvasShortcutConflicts(DEFAULT_CANVAS_SHORTCUT_SETTINGS, "zoom", "KeyC").includes("cycleColor"))
	assert.deepEqual(getCanvasShortcutConflicts(DEFAULT_CANVAS_SHORTCUT_SETTINGS, "compactLayout", "KeyE"), [])
	assert.ok(getCanvasShortcutConflicts(DEFAULT_CANVAS_SHORTCUT_SETTINGS, "splitList", "KeyR").includes("createEdge"))
})

test("输入控件及其祖先编辑区域会被识别为编辑目标", () => {
	const input = { tagName: "INPUT", getAttribute: () => null, parentElement: null, parentNode: null }
	assert.equal(isEditableTarget(input), true)

	const editor = { tagName: "DIV", getAttribute: name => name === "contenteditable" ? "true" : null, parentElement: null, parentNode: null }
	const nested = { tagName: "SPAN", getAttribute: () => null, parentElement: editor, parentNode: editor }
	assert.equal(isEditableTarget(nested), true)

	const searchButton = { tagName: "DIV", getAttribute: name => name === "role" ? "textbox" : null, parentElement: null, parentNode: null }
	assert.equal(isEditableTarget(searchButton), true)
})

test("输入框、编辑态、重复键和已处理事件都会阻止插件快捷键", () => {
	const idleCanvas = { selection: new Set() }
	assert.equal(canHandleCanvasKeyboardEvent(keyboardEvent(), idleCanvas), true)
	assert.equal(canHandleCanvasKeyboardEvent(keyboardEvent({ repeat: true }), idleCanvas), false)
	assert.equal(canHandleCanvasKeyboardEvent(keyboardEvent({ isComposing: true }), idleCanvas), false)
	assert.equal(canHandleCanvasKeyboardEvent(keyboardEvent({ target: { tagName: "INPUT", getAttribute: () => null } }), idleCanvas), false)

	const editingCanvas = { selection: new Set([{ isEditing: true }]) }
	assert.equal(isCanvasEditing(editingCanvas), true)
	assert.equal(canHandleCanvasKeyboardEvent(keyboardEvent(), editingCanvas), false)
})

test("快捷键上下文来自事件所在的 Canvas，而不是 active view", () => {
	const documentA = {}
	const documentB = {}
	const eventWindowB = {}
	documentB.defaultView = eventWindowB
	const targetA = { ownerDocument: documentA }
	const targetB = { ownerDocument: documentB }
	const rootA = { ownerDocument: documentA, contains: target => target === targetA }
	const rootB = { ownerDocument: documentB, contains: target => target === targetB }
	const canvasA = { name: "A" }
	const canvasB = { name: "B" }
	const view = (root, canvas) => ({
		containerEl: root,
		canvas,
		getViewType: () => "canvas",
	})
	const app = {
		workspace: {
			iterateAllLeaves(callback) {
				callback({ view: view(rootA, canvasA) })
				callback({ view: view(rootB, canvasB) })
			},
		},
	}

	assert.equal(getCanvasFromEvent(app, { target: targetB, composedPath: () => [targetB] }), canvasB)
	assert.equal(getCanvasFromEvent(app, { target: targetA, composedPath: () => [targetA] }), canvasA)
	const outside = { ownerDocument: documentB }
	assert.equal(getCanvasFromEvent(app, { target: { ...outside, nodeType: 1 }, composedPath: () => [{ ...outside, nodeType: 1 }] }, eventWindowB), undefined)
})

test("窗口级键盘事件只回退到同一窗口的唯一 Canvas", () => {
	const windowA = {}
	const windowB = {}
	const documentA = { defaultView: windowA, activeElement: null }
	const documentB = { defaultView: windowB, activeElement: null }
	const rootA = { ownerDocument: documentA, contains: () => false }
	const rootB = { ownerDocument: documentB, contains: () => false }
	const canvasA = { name: "A" }
	const canvasB = { name: "B" }
	const view = (root, canvas) => ({
		containerEl: root,
		canvas,
		getViewType: () => "canvas",
	})
	const app = {
		workspace: {
			activeLeaf: { view: view(rootA, canvasA) },
			iterateAllLeaves(callback) {
				callback({ view: view(rootA, canvasA) })
				callback({ view: view(rootB, canvasB) })
			},
		},
	}
	const event = { target: documentA, composedPath: () => [documentA] }

	assert.equal(getCanvasFromEvent(app, event, windowA), canvasA)
	assert.equal(getCanvasFromEvent(app, event, windowB), canvasB)
	assert.equal(getCanvasFromEvent(app, event), undefined)
})

test("窗口注册表在重载和关闭时可释放并重新注册", () => {
	const registry = new WindowRegistrationRegistry()
	const mainWindow = {}
	const popoutWindow = {}

	assert.equal(registry.claim(mainWindow), true)
	assert.equal(registry.claim(mainWindow), false)
	assert.equal(registry.claim(popoutWindow), true)
	assert.equal(registry.size, 2)

	registry.release(popoutWindow)
	assert.equal(registry.size, 1)
	registry.clear()
	assert.equal(registry.size, 0)
	assert.equal(registry.claim(mainWindow), true)
})

test("Canvas 事务只请求一次刷新和保存，并返回变更结果", () => {
	const calls = []
	const canvas = {
		requestFrame: () => calls.push("frame"),
		requestSave: () => calls.push("save"),
	}
	const result = commitCanvasMutation(canvas, () => {
		calls.push("mutation")
		return 42
	})

	assert.equal(result, 42)
	assert.deepEqual(calls, ["mutation", "frame", "save"])
})

test("Z 按住时连续缩放，弹起后停止且重复 start 不会创建第二个计时器", () => {
	let keyDown = true
	let intervalCallback
	let nextInterval = 1
	const cleared = []
	const steps = []
	const controller = createContinuousZoomController(
		{
			setInterval: callback => {
				intervalCallback = callback
				return nextInterval++
			},
			clearInterval: interval => cleared.push(interval),
		},
		() => keyDown,
		() => 0.1,
		step => steps.push(step),
	)

	controller.start()
	controller.start()
	assert.equal(controller.active, true)
	assert.deepEqual(steps, [0.1])
	intervalCallback()
	assert.deepEqual(steps, [0.1, 0.1])
	keyDown = false
	intervalCallback()
	assert.equal(controller.active, false)
	assert.deepEqual(cleared, [1])
})

test("Z 按住期间切换 Shift 会动态改变缩放方向", () => {
	let keyDown = true
	let shiftDown = false
	let intervalCallback
	let nextInterval = 1
	const steps = []
	const controller = createContinuousZoomController(
		{
			setInterval: callback => {
				intervalCallback = callback
				return nextInterval++
			},
			clearInterval: () => {},
		},
		() => keyDown,
		() => shiftDown ? -0.1 : 0.1,
		step => steps.push(step),
	)

	controller.start()
	shiftDown = true
	intervalCallback()
	shiftDown = false
	intervalCallback()
	assert.deepEqual(steps, [0.1, -0.1, 0.1])

	keyDown = false
	intervalCallback()
})

test("同一个 KeyboardEvent 只消费一次，避免独立窗口快捷键重复执行", () => {
	const guard = new KeyboardEventGuard()
	const event = {}
	assert.equal(guard.consume(event), true)
	assert.equal(guard.consume(event), false)
	assert.equal(guard.consume({}), true)
})

test("创建节点只调用 createTextNode，不重复调用 addNode", () => {
	const node = { id: "node-1", x: 10, y: 20, width: 120, height: 40, bbox: {}, color: "" }
	const createCalls = []
	const canvas = {
		createTextNode: options => {
			createCalls.push(options)
			return node
		},
		addNode: () => assert.fail("createTextNode 后不应再次调用 addNode"),
	}

	const result = createCanvasTextNode(canvas, { x: 10, y: 20, width: 120, height: 40, text: "hello", color: "2" })
	assert.equal(result, node)
	assert.equal(createCalls.length, 1)
	assert.equal(createCalls[0].save, false)
	assert.equal(createCalls[0].focus, false)
	assert.deepEqual(node.bbox, { minX: 10, minY: 20, maxX: 130, maxY: 60 })
	assert.equal(node.color, "2")
})

test("连边先写回完整数据，外层事务再统一保存", () => {
	const imported = []
	const calls = []
	const canvas = {
		getData: () => ({ nodes: [{ id: "a" }, { id: "b" }], edges: [{ id: "old" }] }),
		importData: data => imported.push(data),
		requestFrame: () => assert.fail("refresh=false 时不应重复请求帧"),
		requestSave: () => calls.push("save"),
	}
	const from = { id: "a" }
	const to = { id: "b" }

	const edgeId = commitCanvasMutation(canvas, () => addCanvasEdge(canvas, from, to, "right", "left", false), { refresh: false })
	assert.match(edgeId, /^[0-9a-f-]{36}$/)
	assert.equal(imported.length, 1)
	assert.deepEqual(imported[0].nodes, [{ id: "a" }, { id: "b" }])
	assert.equal(imported[0].edges.length, 2)
	assert.equal(imported[0].edges[1].fromNode, "a")
	assert.equal(imported[0].edges[1].toNode, "b")
	assert.deepEqual(calls, ["save"])
})

test("Canvas ID 会拦截空值和重复值，但允许保留当前 ID", () => {
	assert.equal(normalizeCanvasElementId("  alpha  "), "alpha")
	assert.equal(validateCanvasElementId("", "old", ["old"]), "empty")
	assert.equal(validateCanvasElementId("alpha", "old", ["alpha", "old"]), "duplicate")
	assert.equal(validateCanvasElementId("old", "old", ["old"]), undefined)
})

test("UUID 生成不依赖 Node crypto 且符合 RFC 4122 v4 外形", () => {
	const ids = new Set(Array.from({ length: 20 }, () => createCanvasElementId()))
	assert.equal(ids.size, 20)
	for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
})

test("剪贴板成功、失败和不可用时返回真实结果", async () => {
	assert.equal(await writeTextToClipboard("ok", { writeText: async () => {} }), true)
	assert.equal(await writeTextToClipboard("fail", { writeText: async () => { throw new Error("denied") } }), false)
	assert.equal(await writeTextToClipboard("missing"), false)
})

test("翻转只收集直接选中的边和选中节点之间的边", () => {
	const edgeAB = { id: "AB" }
	const edgeAC = { id: "AC" }
	assert.deepEqual([...collectEdgesForFlip([], [])], [])
	assert.deepEqual([...collectEdgesForFlip([edgeAB], [])], [edgeAB])
	assert.deepEqual([...collectEdgesForFlip([], [edgeAB])], [edgeAB])
	assert.deepEqual([...collectEdgesForFlip([], [edgeAB, edgeAC])], [edgeAB, edgeAC])
})

test("紧凑布局结果不重叠，并按原输入顺序返回", () => {
	const result = packRectangles([100, 40, 60, 30], [40, 80, 30, 20])
	const boxes = result.x.map((x, i) => ({ x, y: result.y[i], x2: x + [100, 40, 60, 30][i], y2: result.y[i] + [40, 80, 30, 20][i] }))
	assert.equal(boxes.length, 4)
	assert.ok(boxes.every(box => box.x >= 0 && box.y >= 0))
	for (let i = 0; i < boxes.length; i++) {
		for (let j = i + 1; j < boxes.length; j++) {
			assert.equal(boxes[i].x >= boxes[j].x2 || boxes[j].x >= boxes[i].x2 || boxes[i].y >= boxes[j].y2 || boxes[j].y >= boxes[i].y2, true)
		}
	}
})

test("Canvas 建议数据对损坏 JSON 安全降级，并只返回 nodes 数组", () => {
	assert.deepEqual(parseCanvasNodes('{"nodes":[{"id":"a"}]}'), [{ id: "a" }])
	assert.deepEqual(parseCanvasNodes('{"edges":[]}'), [])
	assert.deepEqual(parseCanvasNodes('{broken'), [])
})
