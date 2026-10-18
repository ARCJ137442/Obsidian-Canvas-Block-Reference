import assert from "node:assert/strict"
import test from "node:test"
import model from "../.test-build/canvas-reference-model.js"
import color from "../.test-build/canvas-reference-color.js"
import layout from "../.test-build/canvas-reference-layout.js"
import thumbnail from "../.test-build/canvas-thumbnail.js"
import navigation from "../.test-build/workspace-navigation.js"

const {
	DEFAULT_CANVAS_REFERENCE_OPTIONS,
	buildCanvasReferenceGraph,
	collectCanvasReferenceOccurrences,
	extractCanvasTextLinks,
	normalizeCanvasReferenceOptions,
	parseCanvasSnapshot,
	planCanvasReferenceSelection,
	planCanvasReferenceSourceSelection,
	groupCanvasReferencesBySource,
	sortCanvasReferenceOccurrences,
	canvasReferenceNavigationKey,
	normalizeCanvasReferenceNavigationRecency,
	getCanvasReferenceNavigationTime,
	sortCanvasCandidatesByRecency,
	collectCanvasForwardLinks,
} = model

const { meanTaskHue } = color
const { layoutCanvasReferenceGraph, resolveMetaCanvasNodeSize, META_CANVAS_NODE_HEIGHT, META_CANVAS_NODE_WIDTH } = layout
const { canvasSnapshotAspectRatio } = thumbnail
const { openCanvasAndFocusNode } = navigation

function focusFixture(stalledFrames = false, canSelect = true) {
	const node = { id: "entry", x: 0, y: 0, width: 100, height: 100, getBBox: () => ({ minX: 0, minY: 0, maxX: 100, maxY: 100 }) }
	const file = { path: "Target.canvas", extension: "canvas" }
	const win = {
		focus() {},
		requestAnimationFrame(callback) { if (!stalledFrames) queueMicrotask(() => callback(0)); return 1 },
		cancelAnimationFrame() {},
	}
	const canvas = {
		nodes: new Map([[node.id, node]]), selection: new Set(),
		selectOnly(item) { if (canSelect) this.selection = new Set([item]) },
		zoomToSelection() {}, zoomToBbox() {}, requestFrame(...args) { assert.equal(args.length, 0) },
		getViewportBBox: () => ({ minX: -100, minY: -100, maxX: 200, maxY: 200 }),
	}
	const leaf = { view: { file, canvas, getViewType: () => "canvas" }, getContainer: () => ({ win }), async openFile() {} }
	const app = {
		vault: { getAbstractFileByPath: () => file },
		workspace: { activeLeaf: leaf, getLeavesOfType: () => [leaf], containerEl: { ownerDocument: { defaultView: win } }, async revealLeaf() {}, setActiveLeaf(value) { this.activeLeaf = value } },
	}
	return { app, leaf, win, canvas }
}

test("Canvas focus finishes even when the target window suspends animation frames", { timeout: 2000 }, async () => {
	const fixture = focusFixture(true)
	assert.equal(await openCanvasAndFocusNode(fixture.app, "Target.canvas", "entry", false, fixture.win, fixture.leaf), true)
	assert.deepEqual([...fixture.canvas.selection].map((node) => node.id), ["entry"])
})

test("Canvas focus does not report success when the node could not be selected", async () => {
	const fixture = focusFixture(false, false)
	assert.equal(await openCanvasAndFocusNode(fixture.app, "Target.canvas", "entry", false, fixture.win, fixture.leaf), false)
})

test("hidden Canvas navigation commits the selected node center without waiting for rendering", async () => {
	const fixture = focusFixture(true)
	fixture.win.document = { hidden: true }
	let center
	fixture.canvas.panTo = (x, y) => { center = { x, y } }
	assert.equal(await openCanvasAndFocusNode(fixture.app, "Target.canvas", "entry", false, fixture.win, fixture.leaf), true)
	assert.deepEqual(center, { x: 50, y: 50 })
})

test("Canvas focus does not mistake a selected but off-center node for success", async () => {
	const fixture = focusFixture()
	fixture.canvas.getViewportBBox = () => ({ minX: 800, minY: 800, maxX: 1100, maxY: 1100 })
	assert.equal(await openCanvasAndFocusNode(fixture.app, "Target.canvas", "entry", false, fixture.win, fixture.leaf), false)
})

test("Canvas focus commits native viewport targets when the animation has not settled", async () => {
	const fixture = focusFixture(true)
	let viewport = { minX: 800, minY: 800, maxX: 1100, maxY: 1100 }
	fixture.canvas.getViewportBBox = () => viewport
	fixture.canvas.zoomToRealBbox = () => { fixture.canvas.tx = 50; fixture.canvas.ty = 50; fixture.canvas.tZoom = 1 }
	fixture.canvas.setViewport = (x, y, zoom) => { assert.deepEqual([x, y, zoom], [50, 50, 1]); viewport = { minX: -100, minY: -100, maxX: 200, maxY: 200 } }
	assert.equal(await openCanvasAndFocusNode(fixture.app, "Target.canvas", "entry", false, fixture.win, fixture.leaf), true)
})

test("Canvas focus waits for measurable viewport geometry before zooming", async () => {
	const fixture = focusFixture()
	let measured = false
	fixture.canvas.getViewportBBox = () => measured ? { minX: -100, minY: -100, maxX: 200, maxY: 200 } : { minX: 0, minY: 0, maxX: 0, maxY: 0 }
	fixture.win.requestAnimationFrame = (callback) => { queueMicrotask(() => { measured = true; callback(0) }); return 1 }
	fixture.canvas.zoomToBbox = () => assert.equal(measured, true)
	assert.equal(await openCanvasAndFocusNode(fixture.app, "Target.canvas", "entry", false, fixture.win, fixture.leaf), true)
})

test("Canvas focus stops when its owning leaf closes during a frame wait", async () => {
	const fixture = focusFixture()
	fixture.win.requestAnimationFrame = (callback) => {
		queueMicrotask(() => { fixture.app.workspace.getLeavesOfType = () => []; callback(0) })
		return 1
	}
	assert.equal(await openCanvasAndFocusNode(fixture.app, "Target.canvas", "entry", false, fixture.win, fixture.leaf), false)
})

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

test("forward selection collects only selected Canvas files, note contents and text links", () => {
	assert.deepEqual(collectCanvasForwardLinks([
		{ type: "file", file: "B.canvas" },
		{ type: "file", file: "B.canvas" },
		{ type: "file", file: "Notes/entry.md" },
		{ type: "text", text: "[[B.canvas]] [See C](C.canvas) ![[D.canvas]]" },
		{ type: "file", file: "image.png" },
	]), { links: ["B.canvas", "C.canvas", "D.canvas"], notes: ["Notes/entry.md"] })
	assert.deepEqual(collectCanvasForwardLinks([{ type: "group" }, { type: "text", text: "No links" }]), { links: [], notes: [] })
})

test("reference candidates put the most recently visited source and entry first", () => {
	const entries = [
		occurrence("A.canvas", "a-old", "T.canvas"),
		occurrence("A.canvas", "a-new", "T.canvas"),
		occurrence("B.canvas", "b-new", "T.canvas"),
	]
	const recent = new Map([
		["A.canvas:a-old", 10],
		["A.canvas:a-new", 40],
		["B.canvas:b-new", 30],
	])
	const resolve = (entry) => recent.get(`${entry.sourceCanvasPath}:${entry.sourceNodeId}`)
	const groups = groupCanvasReferencesBySource(entries, resolve)
	assert.deepEqual(groups.map((group) => group.path), ["A.canvas", "B.canvas"])
	assert.deepEqual(groups[0].entries.map((entry) => entry.sourceNodeId), ["a-new", "a-old"])
	assert.deepEqual(sortCanvasReferenceOccurrences(entries, resolve).map((entry) => entry.sourceNodeId), ["a-new", "b-new", "a-old"])
})

test("navigation recency keys are directional and malformed persisted values are discarded", () => {
	const back = canvasReferenceNavigationKey("back", "T.canvas", "A.canvas", "node")
	const forward = canvasReferenceNavigationKey("forward", "T.canvas", "A.canvas", "node")
	assert.notEqual(back, forward)
	assert.deepEqual(normalizeCanvasReferenceNavigationRecency({
		[back]: 20,
		[forward]: 10,
		bad: "later",
		zero: 0,
	}), { [back]: 20, [forward]: 10 })
})

test("board visits do not overwrite per-entry recency and sorting keeps unseen candidates stable", () => {
	const history = {
		[canvasReferenceNavigationKey("back", "T.canvas", "A.canvas")]: 100,
		[canvasReferenceNavigationKey("back", "T.canvas", "A.canvas", "old")]: 20,
		[canvasReferenceNavigationKey("back", "T.canvas", "A.canvas", "new")]: 90,
	}
	assert.equal(getCanvasReferenceNavigationTime(history, "back", "T.canvas", "A.canvas", "old"), 20)
	assert.equal(getCanvasReferenceNavigationTime(history, "back", "T.canvas", "A.canvas", "unknown"), undefined)
	const targets = [{ path: "Z" }, { path: "A", time: 10 }, { path: "B", time: 20 }, { path: "C" }]
	assert.deepEqual(sortCanvasCandidatesByRecency(targets, (target) => target.time).map((target) => target.path), ["B", "A", "Z", "C"])
	assert.deepEqual(targets.map((target) => target.path), ["Z", "A", "B", "C"])
	const entries = [occurrence("A.canvas", "old", "T.canvas"), occurrence("A.canvas", "new", "T.canvas"), occurrence("B.canvas", "b", "T.canvas")]
	const groups = groupCanvasReferencesBySource(entries,
		(entry) => getCanvasReferenceNavigationTime(history, "back", "T.canvas", entry.sourceCanvasPath, entry.sourceNodeId),
		(path) => path === "B.canvas" ? 110 : 100)
	assert.deepEqual(groups.map((group) => group.path), ["B.canvas", "A.canvas"])
	assert.deepEqual(groups[1].entries.map((entry) => entry.sourceNodeId), ["new", "old"])
})

test("persisted navigation history keeps its most recent bounded set", () => {
	const history = Object.fromEntries(Array.from({ length: 300 }, (_, index) => [`visit-${index}`, index + 1]))
	const normalized = normalizeCanvasReferenceNavigationRecency(history)
	assert.equal(Object.keys(normalized).length, 256)
	assert.equal(normalized["visit-0"], undefined)
	assert.equal(normalized["visit-299"], 300)
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
