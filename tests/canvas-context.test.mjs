import assert from "node:assert/strict"
import test from "node:test"
import context from "../.test-build/canvas-context.js"
import shortcuts from "../.test-build/canvas-shortcuts.js"

const {
	canHandleCanvasKeyboardEvent,
	getCanvasFromEvent,
	isCanvasEditing,
	isEditableTarget,
} = context
const { getCanvasShortcutId } = shortcuts

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
	assert.equal(getCanvasFromEvent(app, { target: outside, composedPath: () => [outside] }), undefined)
})
