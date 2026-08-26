import assert from "node:assert/strict"
import test from "node:test"
import diagnosticsModule from "../.test-build/diagnostics.js"
import bridgeModule from "../.test-build/plugin-bridge.js"

const { CanvasDiagnostics, DEFAULT_DIAGNOSTIC_MAX_ENTRIES, captureCanvasActionState, describeDiagnosticElement } = diagnosticsModule
const { diagnosticsBridgeFinalPhase, resolveDiagnosticsBridge } = bridgeModule

test("诊断默认关闭且不保留事件", () => {
	const diagnostics = new CanvasDiagnostics("test-plugin", { idFactory: () => "session-1" })
	diagnostics.record({ event: "keydown", code: "KeyC" })
	assert.equal(diagnostics.enabled, false)
	assert.equal(diagnostics.snapshot().records.length, 0)
})

test("诊断启动后使用有上限环形缓冲并脱敏字段", () => {
	const diagnostics = new CanvasDiagnostics("test-plugin", {
		maxEntries: 2,
		idFactory: () => "session-2",
		now: () => 123,
	})
	diagnostics.start()
	diagnostics.record({
		event: "keydown",
		code: "KeyC",
		key: "secret-input",
		text: "node body",
		canvasPath: "Boards/mobile.canvas",
		nodeId: "node-1",
	})
	diagnostics.record({ event: "guard", reason: "editable-target" })
	diagnostics.record({
		event: "pointer",
		pointerType: "touch",
		viewType: "canvas",
		shortcutId: "cycleColor",
		effectObserved: false,
		key: "must-not-appear",
	})
	const report = diagnostics.snapshot()
	assert.equal(report.sessionId, "session-2")
	assert.equal(report.records.length, 2)
	assert.equal(report.records[0].event, "guard")
	assert.equal(report.records[1].event, "pointer")
	assert.equal(report.records[1].pointerType, "touch")
	assert.equal(report.records[1].viewType, "canvas")
	assert.equal(report.records[1].shortcutId, "cycleColor")
	assert.equal(report.records[1].effectObserved, false)
	const serialized = JSON.stringify(report)
	assert.equal(serialized.includes("secret-input"), false)
	assert.equal(serialized.includes("node body"), false)
	assert.equal(serialized.includes('"key"'), false)
	assert.equal(report.records[0].pluginId, "test-plugin")
})

test("诊断默认容量足以保留较长的手机操作序列", () => {
	assert.equal(DEFAULT_DIAGNOSTIC_MAX_ENTRIES, 1024)
	const diagnostics = new CanvasDiagnostics("test-plugin", { idFactory: () => "session-long" })
	diagnostics.start()
	for (let index = 1; index <= 1100; index++) diagnostics.record({ event: "guard", reason: String(index) })
	const records = diagnostics.snapshot().records
	assert.equal(records.length, 1024)
	assert.equal(records[0].seq, 77)
	assert.equal(records.at(-1).seq, 1100)
})

test("Canvas 动作指纹识别可观察变化但不保留节点正文", () => {
	const selected = {
		id: "node-1",
		color: "1",
		x: 10,
		y: 20,
		width: 300,
		height: 180,
		isEditing: false,
		text: "private node body",
	}
	const canvas = {
		tx: 1,
		ty: 2,
		zoom: 0,
		nodes: new Map([[selected.id, selected]]),
		edges: new Map(),
		selection: new Set([selected]),
	}
	const before = captureCanvasActionState(canvas)
	assert.equal(before.includes("private node body"), false)
	assert.equal(captureCanvasActionState(canvas), before)
	selected.color = "2"
	assert.notEqual(captureCanvasActionState(canvas), before)
})

test("停止时释放缓冲且报告带会话元数据", () => {
	const diagnostics = new CanvasDiagnostics("test-plugin", { idFactory: () => "session-3" })
	diagnostics.start()
	diagnostics.record({ event: "listener", reason: "registered" })
	const report = diagnostics.stop()
	assert.equal(report.sessionId, "session-3")
	assert.equal(report.records.length, 1)
	assert.equal(diagnostics.enabled, false)
	assert.equal(diagnostics.snapshot().records.length, 0)
})

test("元素描述只暴露类型、role 与 contenteditable", () => {
	const element = {
		tagName: "DIV",
		getAttribute: name => name === "role" ? "textbox" : name === "contenteditable" ? "true" : null,
	}
	assert.deepEqual(describeDiagnosticElement(element), {
		elementType: "DIV",
		role: "textbox",
		contenteditable: true,
	})
})

test("诊断桥兼容 getPlugin、移动端注册表和 Map 注册表", () => {
	const bridge = { startDiagnostics() {}, stopDiagnostics() {} }
	assert.deepEqual(resolveDiagnosticsBridge({ plugins: { getPlugin: id => id === "pan" ? bridge : undefined } }, "pan"), {
		status: "ready",
		bridge,
	})
	assert.equal(resolveDiagnosticsBridge({ plugins: { plugins: { pan: bridge } } }, "pan").status, "ready")
	assert.equal(resolveDiagnosticsBridge({ plugins: { plugins: new Map([["pan", bridge]]) } }, "pan").status, "ready")
})

test("诊断桥明确区分插件缺失与 API 缺失", () => {
	assert.deepEqual(resolveDiagnosticsBridge({}, "pan"), { status: "plugin-missing" })
	assert.deepEqual(resolveDiagnosticsBridge({ plugins: { plugins: {} } }, "pan"), { status: "plugin-missing" })
	assert.deepEqual(resolveDiagnosticsBridge({ plugins: { plugins: { pan: {} } } }, "pan"), { status: "api-missing" })
})

test("最终桥接状态拥有不依赖环形缓冲历史的固定标记", () => {
	assert.equal(diagnosticsBridgeFinalPhase("ready"), "pan-bridge-final-ready")
	assert.equal(diagnosticsBridgeFinalPhase("plugin-missing"), "pan-bridge-final-plugin-missing")
	assert.equal(diagnosticsBridgeFinalPhase("start-failed"), "pan-bridge-final-start-failed")
	assert.equal(diagnosticsBridgeFinalPhase("stop-failed"), "pan-bridge-final-stop-failed")
})
