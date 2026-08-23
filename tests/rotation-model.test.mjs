import assert from "node:assert/strict"
import test from "node:test"
import rotation from "../.test-build/rotation-model.js"

const {
	buildRotationSequence,
	matchesRotationColor,
	nodeCenter,
	parseRotationDocument,
	rotationTargetIndex,
	sortRotationTargetsInCanvas,
} = rotation

test("matchesRotationColor matches built-in color whether number or string", () => {
	assert.equal(matchesRotationColor(3, "3"), true)
	assert.equal(matchesRotationColor("3", "3"), true)
	assert.equal(matchesRotationColor(2, "3"), false)
	assert.equal(matchesRotationColor("2", "3"), false)
	assert.equal(matchesRotationColor("#ffff00", "3"), false)
})

test("matchesRotationColor treats missing, empty and gray as default", () => {
	assert.equal(matchesRotationColor(undefined, "default"), true)
	assert.equal(matchesRotationColor(null, "default"), true)
	assert.equal(matchesRotationColor("", "default"), true)
	assert.equal(matchesRotationColor(0, "default"), true)
	assert.equal(matchesRotationColor(3, "default"), false)
})

test("matchesRotationColor matches all colors and exact black/white hex", () => {
	assert.equal(matchesRotationColor(undefined, "all"), true)
	assert.equal(matchesRotationColor("#123456", "all"), true)
	assert.equal(matchesRotationColor("#000000", "black"), true)
	assert.equal(matchesRotationColor("#000", "black"), true)
	assert.equal(matchesRotationColor("#ffffff", "white"), true)
	assert.equal(matchesRotationColor("#fff", "white"), true)
	assert.equal(matchesRotationColor("#ffff00", "black"), false)
	assert.equal(matchesRotationColor("#fff", "black"), false)
})

test("nodeCenter computes the center from x/y/width/height", () => {
	assert.deepEqual(nodeCenter({ id: "a", type: "text", x: 100, y: 200, width: 100, height: 50 }), { x: 150, y: 225 })
	assert.deepEqual(nodeCenter({ id: "b", type: "text" }), { x: 0, y: 0 })
})

test("sortRotationTargetsInCanvas orders left-to-right then top-to-bottom and keeps all types", () => {
	const targets = sortRotationTargetsInCanvas([
		{ id: "right-top", type: "text", color: 3, x: 200, y: 0, width: 40, height: 40 },
		{ id: "left-bottom", type: "text", color: 3, x: 0, y: 200, width: 40, height: 40 },
		{ id: "left-top", type: "text", color: 3, x: 0, y: 0, width: 40, height: 40 },
		{ id: "not-yellow", type: "text", color: 2, x: 0, y: 100, width: 40, height: 40 },
		{ id: "group-yellow", type: "group", color: 3, x: 300, y: 0, width: 100, height: 100 },
	], "boards/a.canvas", "3")
	assert.deepEqual(targets.map((t) => t.nodeId), ["left-top", "left-bottom", "right-top", "group-yellow"])
	assert.ok(targets.every((t) => t.canvasPath === "boards/a.canvas"))
})

test("buildRotationSequence flattens canvases in order and skips empty boards", () => {
	const documents = [
		{ path: "old.canvas", nodes: [{ id: "n1", type: "text", color: 3, x: 0, y: 0, width: 10, height: 10 }] },
		{ path: "empty.canvas", nodes: [] },
		{ path: "new.canvas", nodes: [
			{ id: "m1", type: "text", color: 3, x: 5, y: 5, width: 10, height: 10 },
			{ id: "m2", type: "text", color: 2, x: 1, y: 1, width: 10, height: 10 },
		] },
	]
	assert.deepEqual(buildRotationSequence(documents, "3").map((t) => t.nodeId), ["n1", "m1"])
})

test("rotationTargetIndex advances and reverses from a selected node with wrap", () => {
	assert.equal(rotationTargetIndex({ kind: "selected", index: 2 }, 1, 10), 3)
	assert.equal(rotationTargetIndex({ kind: "selected", index: 2 }, -1, 10), 1)
	assert.equal(rotationTargetIndex({ kind: "selected", index: 9 }, 1, 10), 0)
	assert.equal(rotationTargetIndex({ kind: "selected", index: 0 }, -1, 10), 9)
})

test("rotationTargetIndex starts a focused canvas at its first node forward and before it backward", () => {
	assert.equal(rotationTargetIndex({ kind: "canvas", start: 4 }, 1, 10), 4)
	assert.equal(rotationTargetIndex({ kind: "canvas", start: 4 }, -1, 10), 3)
	assert.equal(rotationTargetIndex({ kind: "canvas", start: 0 }, -1, 10), 9)
})

test("rotationTargetIndex handles the no-canvas anchor and empty sequence", () => {
	assert.equal(rotationTargetIndex({ kind: "none" }, 1, 10), 0)
	assert.equal(rotationTargetIndex({ kind: "none" }, -1, 10), 9)
	assert.equal(rotationTargetIndex({ kind: "none" }, 1, 0), undefined)
})

test("rotationTargetIndex wraps when a boundary points past the last node", () => {
	// 活动板无匹配节点且为序列最后一块：start === length，next 应回环到 0 而非越界。
	assert.equal(rotationTargetIndex({ kind: "canvas", start: 10 }, 1, 10), 0)
	assert.equal(rotationTargetIndex({ kind: "canvas", start: 10 }, -1, 10), 9)
})

test("parseRotationDocument keeps node coordinates and rejects invalid JSON", () => {
	const doc = parseRotationDocument(JSON.stringify({
		nodes: [{ id: "n1", type: "text", x: 100, y: 200, width: 300, height: 120, color: "3" }],
	}), "boards/a.canvas")
	assert.equal(doc.path, "boards/a.canvas")
	assert.deepEqual(doc.nodes[0], {
		id: "n1", type: "text", color: "3", x: 100, y: 200, width: 300, height: 120,
	})
	assert.throws(() => parseRotationDocument("not-json", "broken.canvas"))
})
