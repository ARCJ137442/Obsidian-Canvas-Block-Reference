import assert from "node:assert/strict"
import test from "node:test"
import model from "../.test-build/canvas-reference-model.js"
import color from "../.test-build/canvas-reference-color.js"
import layout from "../.test-build/canvas-reference-layout.js"
import thumbnail from "../.test-build/canvas-thumbnail.js"

const {
	DEFAULT_CANVAS_REFERENCE_OPTIONS,
	buildCanvasReferenceGraph,
	collectCanvasReferenceOccurrences,
	extractCanvasTextLinks,
	normalizeCanvasReferenceOptions,
	parseCanvasSnapshot,
	planCanvasReferenceSelection,
	planCanvasReferenceSourceSelection,
} = model

const { meanTaskHue } = color
const { layoutCanvasReferenceGraph, resolveMetaCanvasNodeSize, META_CANVAS_NODE_HEIGHT, META_CANVAS_NODE_WIDTH } = layout
const { canvasSnapshotAspectRatio } = thumbnail

function occurrence(sourceCanvasPath, sourceNodeId, targetCanvasPath, kind = "file-node", entryLabel = sourceNodeId) {
	return { sourceCanvasPath, sourceNodeId, targetCanvasPath, kind, entryLabel, x: 0, y: 0, width: 80, height: 40 }
}

test("reference settings default to file nodes and can opt into text links", () => {
	assert.deepEqual(DEFAULT_CANVAS_REFERENCE_OPTIONS, { includeFileNodes: true, includeTextLinks: false })
	assert.deepEqual(normalizeCanvasReferenceOptions({ includeTextLinks: true }), { includeFileNodes: true, includeTextLinks: true })
	assert.deepEqual(normalizeCanvasReferenceOptions({ includeFileNodes: "yes" }), { includeFileNodes: true, includeTextLinks: false })
})

test("Canvas JSON parser preserves node geometry, colors, text and edges", () => {
	const parsed = parseCanvasSnapshot(JSON.stringify({
		nodes: [{ id: "n1", type: "text", x: 10, y: 20, width: 150, height: 70, color: "3", text: "Entry" }],
		edges: [{ id: "e1", fromNode: "n1", toNode: "n2", color: "4" }],
	}), "Boards/Source.canvas")
	assert.equal(parsed.nodes[0].x, 10)
	assert.equal(parsed.nodes[0].text, "Entry")
	assert.equal(parsed.edges[0].toNode, "n2")
	assert.throws(() => parseCanvasSnapshot("{broken", "bad.canvas"), /无法解析/)
})

test("file-node references are collected by default with the connected node name", () => {
	const snapshot = parseCanvasSnapshot(JSON.stringify({
		nodes: [
			{ id: "ref", type: "file", file: "Target.canvas", x: 100, y: 50, width: 180, height: 120 },
			{ id: "title", type: "text", text: "Incident response", x: 20, y: 50, width: 70, height: 30 },
		],
		edges: [{ id: "edge", fromNode: "title", toNode: "ref" }],
	}), "Source.canvas")
	const refs = collectCanvasReferenceOccurrences(snapshot, (path) => path.endsWith("Target.canvas") ? "Target.canvas" : undefined, { includeFileNodes: true, includeTextLinks: false })
	assert.equal(refs.length, 1)
	assert.equal(refs[0].sourceNodeId, "ref")
	assert.equal(refs[0].entryLabel, "Incident response")
})

test("unconnected repeated file nodes use nearby human-readable context instead of coordinates", () => {
	const snapshot = parseCanvasSnapshot(JSON.stringify({
		nodes: [
			{ id: "ref-a", type: "file", file: "Target.canvas", x: 20, y: 30, width: 100, height: 70 },
			{ id: "ref-b", type: "file", file: "Target.canvas", x: 420, y: 130, width: 100, height: 70 },
			{ id: "area-a", type: "text", text: "2026-08-10 ~ 2026-08-27 @ 惠州", x: 20, y: 120, width: 200, height: 42 },
			{ id: "task-a", type: "text", text: "惠州 **集体任务**：\n1. [x] 桶装水\n2. [ ] 地面清洁", x: 20, y: 180, width: 240, height: 100 },
			{ id: "area-b", type: "text", text: "2026-08-28 ~ 2026-09-02 @ 家里", x: 420, y: 40, width: 200, height: 42 },
			{ id: "task-b", type: "text", text: "### 2026-09-01 行李与物资准备", x: 420, y: 220, width: 240, height: 54 },
		], edges: [],
	}), "Source.canvas")
	const refs = collectCanvasReferenceOccurrences(snapshot, () => "Target.canvas", { includeFileNodes: true, includeTextLinks: false })
	assert.deepEqual(refs.map((entry) => entry.entryLabel), ["惠州 集体任务", "家里 · 行李与物资准备"])
	assert.equal(refs.some((entry) => /-?\d+,\s*-?\d+/.test(entry.entryLabel)), false)

	const noContext = parseCanvasSnapshot(JSON.stringify({
		nodes: [{ id: "ref", type: "file", file: "Target.canvas", x: 20, y: 30, width: 100, height: 70 }],
		edges: [],
	}), "Empty.canvas")
	const fallback = collectCanvasReferenceOccurrences(noContext, () => "Target.canvas", { includeFileNodes: true, includeTextLinks: false })
	assert.equal(fallback[0].entryLabel, "白板文件节点")
})

test("text node wikilinks, Markdown links and embeds keep their entry kind and label", () => {
	const links = extractCanvasTextLinks("See [[A.canvas|Alpha]] and [Beta](B.canvas), then ![[C.canvas|Preview]].")
	assert.deepEqual(links.map((link) => [link.linkpath, link.label, link.syntax]), [
		["A.canvas", "Alpha", "wikilink"],
		["B.canvas", "Beta", "markdown"],
		["C.canvas", "Preview", "embed"],
	])
	const snapshot = parseCanvasSnapshot(JSON.stringify({
		nodes: [{ id: "text", type: "text", text: "See [[A.canvas|Alpha]] and [Beta](B.canvas).", x: 5, y: 6, width: 90, height: 40 }],
		edges: [],
	}), "Source.canvas")
	const refs = collectCanvasReferenceOccurrences(snapshot, (path) => path, { includeFileNodes: false, includeTextLinks: true })
	assert.deepEqual(refs.map((entry) => [entry.targetCanvasPath, entry.kind, entry.entryLabel]), [
		["A.canvas", "text-link", "Alpha"],
		["B.canvas", "text-link", "Beta"],
	])
})

test("canvas relation graph aggregates repeated source-target occurrences while preserving entries", () => {
	const refs = [occurrence("A.canvas", "one", "B.canvas"), occurrence("A.canvas", "two", "B.canvas", "text-link")]
	const graph = buildCanvasReferenceGraph(["A.canvas", "B.canvas"], refs)
	assert.equal(graph.length, 1)
	assert.equal(graph[0].occurrences.length, 2)
	assert.equal(buildCanvasReferenceGraph(["A.canvas"], refs).length, 0)
})

test("backtracking first disambiguates source boards, then entries within the chosen board", () => {
	const oneBoardSeveralEntries = [occurrence("A.canvas", "1", "T.canvas"), occurrence("A.canvas", "2", "T.canvas")]
	assert.equal(planCanvasReferenceSelection(oneBoardSeveralEntries).kind, "choose-entry")
	const multipleBoards = [...oneBoardSeveralEntries, occurrence("B.canvas", "3", "T.canvas")]
	const firstStep = planCanvasReferenceSelection(multipleBoards)
	assert.equal(firstStep.kind, "choose-source")
	assert.deepEqual(firstStep.sources.map((source) => source.name), ["A", "B"])
	assert.equal(planCanvasReferenceSourceSelection(firstStep.sources[0]).kind, "choose-entry")
	assert.equal(planCanvasReferenceSourceSelection(firstStep.sources[1]).kind, "direct")
	assert.equal(planCanvasReferenceSelection([occurrence("A.canvas", "1", "T.canvas")]).kind, "direct")
	assert.equal(planCanvasReferenceSelection([]).kind, "empty")
})

test("task accent uses a circular mean and ignores colors without task semantics", () => {
	const snapshot = parseCanvasSnapshot(JSON.stringify({
		nodes: [
			{ id: "red", type: "text", color: "1" },
			{ id: "orange", type: "text", color: "2" },
			{ id: "cyan", type: "text", color: "5" },
		], edges: [],
	}), "colors.canvas")
	const hue = meanTaskHue(snapshot, { "1": "blocked", "2": "pending", "3": "progress", "4": "done" })
	assert.ok(hue !== undefined && Math.abs(hue - 15) < 0.001)
	assert.equal(meanTaskHue(snapshot, {}), undefined)
})

test("Dagre lays out cyclic whiteboard relations and keeps manual positions without overlap", () => {
	const paths = ["A.canvas", "B.canvas", "C.canvas"]
	const edges = [
		{ sourceCanvasPath: "A.canvas", targetCanvasPath: "B.canvas" },
		{ sourceCanvasPath: "B.canvas", targetCanvasPath: "C.canvas" },
		{ sourceCanvasPath: "C.canvas", targetCanvasPath: "A.canvas" },
	]
	const pinned = { "A.canvas": { x: 800, y: 120 } }
	const graph = layoutCanvasReferenceGraph(paths, edges, pinned)
	assert.deepEqual(graph.positions["A.canvas"], pinned["A.canvas"])
	assert.equal(Object.keys(graph.edgeRoutes).length, 3)
	for (let i = 0; i < paths.length; i += 1) {
		for (let j = i + 1; j < paths.length; j += 1) {
			const a = graph.positions[paths[i]]
			const b = graph.positions[paths[j]]
			const overlap = a.x < b.x + META_CANVAS_NODE_WIDTH && a.x + META_CANVAS_NODE_WIDTH > b.x
				&& a.y < b.y + META_CANVAS_NODE_HEIGHT && a.y + META_CANVAS_NODE_HEIGHT > b.y
			assert.equal(overlap, false)
		}
	}
})

test("MetaCanvas node shapes default to square and can follow readable Canvas aspect ratios", () => {
	assert.deepEqual(resolveMetaCanvasNodeSize(2.4, "square"), { width: 236, height: 236 })
	assert.deepEqual(resolveMetaCanvasNodeSize(2, "canvas-aspect"), { width: 236, height: 131 })
	assert.deepEqual(resolveMetaCanvasNodeSize(0.5, "canvas-aspect"), { width: 131, height: 236 })
	assert.deepEqual(resolveMetaCanvasNodeSize(20, "canvas-aspect"), { width: 236, height: 131 })
	const snapshot = parseCanvasSnapshot(JSON.stringify({
		nodes: [
			{ id: "wide", type: "text", x: -400, y: 20, width: 800, height: 200 },
		], edges: [],
	}), "wide.canvas")
	assert.equal(canvasSnapshotAspectRatio(snapshot.nodes), 4)
})

test("force layout is deterministic, reduces overlap, and preserves fixed nodes", () => {
	const paths = ["A.canvas", "B.canvas", "C.canvas", "D.canvas", "E.canvas"]
	const edges = [
		{ sourceCanvasPath: "A.canvas", targetCanvasPath: "B.canvas" },
		{ sourceCanvasPath: "A.canvas", targetCanvasPath: "C.canvas" },
		{ sourceCanvasPath: "B.canvas", targetCanvasPath: "D.canvas" },
		{ sourceCanvasPath: "C.canvas", targetCanvasPath: "D.canvas" },
		{ sourceCanvasPath: "D.canvas", targetCanvasPath: "E.canvas" },
		{ sourceCanvasPath: "E.canvas", targetCanvasPath: "A.canvas" },
	]
	const sizes = {
		"A.canvas": { width: 236, height: 236 },
		"B.canvas": { width: 236, height: 150 },
		"C.canvas": { width: 150, height: 236 },
		"D.canvas": { width: 236, height: 236 },
		"E.canvas": { width: 236, height: 180 },
	}
	const pinned = { "A.canvas": { x: 800, y: 120 } }
	const force = layoutCanvasReferenceGraph(paths, edges, pinned, { mode: "force", nodeSizes: sizes })
	const repeated = layoutCanvasReferenceGraph(paths, edges, pinned, { mode: "force", nodeSizes: sizes })
	assert.deepEqual(force.positions, repeated.positions)
	assert.deepEqual(force.positions["A.canvas"], pinned["A.canvas"])
	assert.deepEqual(force.nodeSizes, sizes)
	assert.deepEqual(force.edgeRoutes, {})
	for (let i = 0; i < paths.length; i += 1) {
		for (let j = i + 1; j < paths.length; j += 1) {
			const a = force.positions[paths[i]]
			const b = force.positions[paths[j]]
			const aSize = sizes[paths[i]]
			const bSize = sizes[paths[j]]
			const overlap = a.x < b.x + bSize.width + 20 && a.x + aSize.width + 20 > b.x
				&& a.y < b.y + bSize.height + 20 && a.y + aSize.height + 20 > b.y
			assert.equal(overlap, false, `${paths[i]} and ${paths[j]} overlap`)
		}
	}
	const hardReset = layoutCanvasReferenceGraph(paths, edges, {}, { mode: "force", nodeSizes: sizes })
	assert.notDeepEqual(hardReset.positions["A.canvas"], pinned["A.canvas"])
})
