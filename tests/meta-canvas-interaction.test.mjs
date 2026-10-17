import assert from "node:assert/strict"
import test from "node:test"
import interactionModule from "../.test-build/meta-canvas-interaction.js"

const {
	CompatibilityClickGuard,
	MetaCanvasInteractionController,
	ViewportMotion,
	normalizeWheelDelta,
	pinchBaseline,
	resolveWheelAction,
	transformForPinch,
} = interactionModule

const bounds = { minZoom: 0.28, maxZoom: 2.4 }

test("touch compatibility click guard suppresses the whole click/dblclick sequence but preserves assistive and new mouse clicks", () => {
	const guard = new CompatibilityClickGuard()
	const card = {}
	const otherCard = {}
	guard.suppress(card, 600, 100)
	assert.equal(guard.consume(card, 200, 1), true)
	assert.equal(guard.consume(card, 210, 2), true)
	assert.equal(guard.consume(card, 220, 2), true) // dblclick follows its two compatibility clicks
	assert.equal(guard.consume(card, 230, 0), false) // screen-reader activation is never consumed
	assert.equal(guard.consume(otherCard, 230, 1), false)
	guard.clear(card) // a real mouse pointerdown starts a fresh activation sequence
	assert.equal(guard.consume(card, 240, 1), false)
	guard.suppress(card, 600, 300)
	assert.equal(guard.consume(card, 601, 2), false)
})

function timers() {
	let nextId = 0
	const pending = new Map()
	return {
		setTimeout(callback, delay) { const id = ++nextId; pending.set(id, { callback, delay }); return id },
		clearTimeout(id) { pending.delete(id) },
		fire(delay) {
			for (const [id, timer] of [...pending]) {
				if (timer.delay !== delay) continue
				pending.delete(id)
				timer.callback()
			}
		},
		get size() { return pending.size },
	}
}

function fakeWindow(initialNow = 0) {
	let now = initialNow
	let nextFrame = 0
	const frames = new Map()
	const win = {
		document: { hidden: false },
		performance: { now: () => now },
		requestAnimationFrame(callback) { const id = ++nextFrame; frames.set(id, callback); return id },
		cancelAnimationFrame(id) { frames.delete(id) },
		advance(timestamp) {
			now = timestamp
			const callbacks = [...frames.values()]
			frames.clear()
			for (const callback of callbacks) callback(timestamp)
		},
		get pendingFrames() { return frames.size },
	}
	return win
}

function harness(initialTransform = { zoom: 1, panX: 25, panY: -15 }) {
	const clock = timers()
	const state = {
		transform: { ...initialTransform },
		nodes: { A: { x: 100, y: 200 } },
		taps: [],
		commits: [],
		interactions: 0,
	}
	const controller = new MetaCanvasInteractionController({
		getTransform: () => ({ ...state.transform }),
		setTransform: (transform) => { state.transform = { ...transform } },
		setNodePosition: (path, position, phase) => {
			if (phase !== "commit") state.nodes[path] = { ...position }
			else state.commits.push({ path, position: { ...position } })
		},
		onTap: (target, pointerType, point) => state.taps.push({ target, pointerType, point }),
		onInteraction: () => { state.interactions += 1 },
		setTimeout: (callback, delay) => clock.setTimeout(callback, delay),
		clearTimeout: (id) => clock.clearTimeout(id),
	}, bounds)
	return { controller, state, clock }
}

const board = (path = "A") => ({ kind: "board", path, position: { x: 100, y: 200 } })
const edge = (key = "A->B") => ({ kind: "edge", key })
const blank = { kind: "blank" }

function down(controller, id, point, target = blank, pointerType = "touch", button = 0) {
	return controller.pointerDown({ id, point, pointerType, button, target })
}

function frameTransform(transform, point) {
	return { x: (point.x - transform.panX) / transform.zoom, y: (point.y - transform.panY) / transform.zoom }
}

test("pinch keeps one world anchor while distance and center move in viewport-local coordinates", () => {
	const initial = { zoom: 1, panX: -31, panY: 47 }
	const startCenter = { x: 130, y: 92 }
	const anchor = frameTransform(initial, startCenter)
	const baseline = pinchBaseline(initial, startCenter, 100)
	let transform = transformForPinch(baseline, { x: 140, y: 100 }, 110, bounds)
	assert.equal(transform.zoom, 1.1)
	assert.deepEqual(frameTransform(transform, { x: 140, y: 100 }), anchor)
	transform = transformForPinch(baseline, { x: 151, y: 108 }, 120, bounds)
	assert.equal(transform.zoom, 1.2)
	assert.deepEqual(frameTransform(transform, { x: 151, y: 108 }), anchor)
})

test("pinch respects zoom bounds while keeping the original anchor through an out-and-back gesture", () => {
	const start = { zoom: 2.3, panX: -12, panY: 51 }
	const center = { x: 72, y: 133 }
	const anchor = frameTransform(start, center)
	const baseline = pinchBaseline(start, center, 100)
	assert.equal(transformForPinch(baseline, center, 120, bounds).zoom, 2.4)
	assert.equal(transformForPinch(baseline, center, 100, bounds).zoom, 2.3)
	assert.equal(transformForPinch(pinchBaseline({ zoom: 0.3, panX: 0, panY: 0 }, center, 100), center, 10, bounds).zoom, 0.28)
	const result = transformForPinch(baseline, { x: 80, y: 140 }, 100, bounds)
	assert.deepEqual(frameTransform(result, { x: 80, y: 140 }), anchor)
})

test("wheel normalizes all delta modes and gives Ctrl/Meta zoom precedence over Shift", () => {
	assert.deepEqual(normalizeWheelDelta({ deltaX: 2, deltaY: -3, deltaMode: 0 }), { x: 2, y: -3 })
	assert.deepEqual(normalizeWheelDelta({ deltaX: 2, deltaY: -3, deltaMode: 1 }), { x: 80, y: -120 })
	assert.deepEqual(normalizeWheelDelta({ deltaX: 2, deltaY: -3, deltaMode: 2 }), { x: 1600, y: -2400 })
	assert.deepEqual(resolveWheelAction({ deltaX: 0, deltaY: 3, deltaMode: 1, ctrlKey: false, metaKey: false, shiftKey: true, point: { x: 4, y: 9 } }), {
		kind: "pan", delta: { x: 120, y: 0 },
	})
	const zoom = resolveWheelAction({ deltaX: 0, deltaY: 3, deltaMode: 0, ctrlKey: true, metaKey: false, shiftKey: true, point: { x: 4, y: 9 } })
	assert.equal(zoom.kind, "zoom")
	assert.equal(zoom.point.x, 4)
	assert.ok(zoom.factor < 1)
	assert.equal(resolveWheelAction({ deltaX: 2, deltaY: 3, deltaMode: 0, ctrlKey: false, metaKey: false, shiftKey: true, point: { x: 0, y: 0 } }).kind, "pan")
})

test("viewport animation uses the owning window RAF clock and keeps the anchor on every frame", () => {
	const win = fakeWindow(5000)
	const point = { x: 89, y: 73 }
	const initial = { zoom: 1, panX: -21, panY: 36 }
	const anchor = frameTransform(initial, point)
	const frames = []
	const motion = new ViewportMotion(initial, win, bounds, (transform) => frames.push(transform))
	motion.zoomAt(1.2, point, true)
	assert.equal(win.pendingFrames, 1)
	win.advance(5000)
	for (const transform of frames) {
		const underPointer = frameTransform(transform, point)
		assert.ok(Math.abs(underPointer.x - anchor.x) < 1e-9)
		assert.ok(Math.abs(underPointer.y - anchor.y) < 1e-9)
	}
	assert.equal(motion.transform.zoom, 1)
	win.advance(5055)
	assert.ok(motion.transform.zoom > 1 && motion.transform.zoom < 1.2)
	for (const transform of frames) {
		const underPointer = frameTransform(transform, point)
		assert.ok(Math.abs(underPointer.x - anchor.x) < 1e-9)
		assert.ok(Math.abs(underPointer.y - anchor.y) < 1e-9)
	}
	win.advance(5110)
	assert.ok(Math.abs(motion.transform.zoom - 1.2) < 1e-9)
})

test("rapid wheel zoom accumulates pending targets and reversal cancels back to the origin", () => {
	const win = fakeWindow()
	const initial = { zoom: 1, panX: 18, panY: -4 }
	const point = { x: 50, y: 90 }
	const anchor = frameTransform(initial, point)
	const motion = new ViewportMotion(initial, win, bounds, () => {})
	motion.zoomAt(1.1, point, true)
	motion.zoomAt(1.1, point, true)
	assert.ok(Math.abs(motion.targetTransform.zoom - 1.21) < 1e-9)
	motion.zoomAt(1 / 1.21, point, true)
	assert.ok(Math.abs(motion.targetTransform.zoom - 1) < 1e-9)
	assert.ok(Math.abs(motion.targetTransform.panX - initial.panX) < 1e-9)
	assert.ok(Math.abs(motion.targetTransform.panY - initial.panY) < 1e-9)
	win.advance(110)
	assert.ok(Math.abs(motion.transform.zoom - initial.zoom) < 1e-9)
	assert.ok(Math.abs(motion.transform.panX - initial.panX) < 1e-9)
	assert.ok(Math.abs(motion.transform.panY - initial.panY) < 1e-9)
	assert.deepEqual(frameTransform(motion.transform, point), anchor)
})

test("hidden-window zoom commits immediately and a later pan cannot be undone by an old frame", () => {
	const win = fakeWindow(4000)
	const motion = new ViewportMotion({ zoom: 1, panX: 5, panY: 7 }, win, bounds, () => {})
	motion.zoomAt(1.5, { x: 30, y: 50 }, true)
	win.document.hidden = true
	motion.zoomAt(0.8, { x: 30, y: 50 }, true)
	assert.ok(Math.abs(motion.transform.zoom - 1.2) < 1e-9)
	assert.equal(win.pendingFrames, 0)
	win.document.hidden = false
	motion.zoomAt(1.4, { x: 30, y: 50 }, true)
	assert.equal(win.pendingFrames, 1)
	motion.setImmediate({ zoom: 1.4, panX: 300, panY: 250 })
	win.advance(110)
	assert.deepEqual(motion.transform, { zoom: 1.4, panX: 300, panY: 250 })
	assert.equal(win.pendingFrames, 0)
})

test("middle and right mouse buttons pan from blank, cards, and edges; primary edge click stays a selection", () => {
	const { controller, state } = harness()
	assert.equal(down(controller, 1, { x: 10, y: 20 }, board(), "mouse", 1), true)
	controller.pointerMove(1, { x: 35, y: 12 })
	assert.deepEqual(state.transform, { zoom: 1, panX: 50, panY: -23 })
	controller.pointerUp(1, { x: 35, y: 12 })
	assert.equal(down(controller, 2, { x: 0, y: 0 }, edge(), "mouse", 2), true)
	controller.pointerMove(2, { x: -5, y: 20 })
	assert.deepEqual(state.transform, { zoom: 1, panX: 45, panY: -3 })
	controller.pointerUp(2, { x: -5, y: 20 })
	assert.equal(down(controller, 3, { x: 2, y: 2 }, edge(), "mouse", 0), false)
	assert.equal(controller.activeGestureKind, undefined)
})

test("touch card drag pans after movement; a stationary long press moves and commits the node", () => {
	const { controller, state, clock } = harness()
	down(controller, 1, { x: 100, y: 100 }, board())
	controller.pointerMove(1, { x: 120, y: 100 })
	assert.deepEqual(state.transform, { zoom: 1, panX: 45, panY: -15 })
	controller.pointerUp(1, { x: 120, y: 100 })
	assert.equal(state.commits.length, 0)
	assert.equal(state.taps.length, 0)

	down(controller, 2, { x: 100, y: 100 }, board())
	clock.fire(600)
	controller.pointerMove(2, { x: 120, y: 130 })
	controller.pointerUp(2, { x: 120, y: 130 })
	assert.deepEqual(state.nodes.A, { x: 120, y: 230 })
	assert.deepEqual(state.commits.at(-1), { path: "A", position: { x: 120, y: 230 } })
})

test("touch taps select cards and edges, while blank taps clear selection; excluded controls stay inert", () => {
	const { controller, state } = harness()
	down(controller, 1, { x: 1, y: 1 }, board())
	controller.pointerUp(1, { x: 1, y: 1 })
	down(controller, 2, { x: 4, y: 5 }, edge())
	controller.pointerUp(2, { x: 4, y: 5 })
	down(controller, 3, { x: 7, y: 8 }, blank)
	controller.pointerUp(3, { x: 7, y: 8 })
	assert.deepEqual(state.taps.map(({ target }) => target.kind), ["board", "edge", "blank"])
	assert.equal(down(controller, 4, { x: 0, y: 0 }, { kind: "excluded" }), false)
	assert.deepEqual(controller.activePointerIds, [])
})

test("pinch cancels an unfinished node drag, preserves a participant pair through a third finger, and rebases only when a participant lifts", () => {
	const { controller, state } = harness({ zoom: 2.3, panX: 0, panY: 0 })
	down(controller, 1, { x: 100, y: 100 }, board(), "mouse", 0)
	controller.pointerMove(1, { x: 120, y: 120 })
	assert.deepEqual(state.nodes.A, { x: 100 + 20 / 2.3, y: 200 + 20 / 2.3 })
	down(controller, 2, { x: 200, y: 120 }, blank)
	assert.deepEqual(state.nodes.A, { x: 100, y: 200 })
	assert.equal(state.commits.length, 0)
	controller.pointerMove(1, { x: 90, y: 100 })
	controller.pointerMove(2, { x: 210, y: 100 })
	assert.equal(state.transform.zoom, 2.4)
	down(controller, 3, { x: 400, y: 400 }, blank)
	controller.pointerUp(3, { x: 400, y: 400 })
	controller.pointerMove(1, { x: 120, y: 100 })
	controller.pointerMove(2, { x: 200, y: 100 })
	assert.ok(Math.abs(state.transform.zoom - 2.3) < 1e-9)
	controller.pointerUp(1, { x: 120, y: 100 })
	assert.equal(controller.activeGestureKind, "touch-pan")
	controller.pointerMove(2, { x: 205, y: 100 })
	controller.pointerUp(2, { x: 205, y: 100 })
	assert.equal(state.commits.length, 0)
})

test("pointer cancel, lost capture, blur-style cancel, and destroy roll back node previews without persistence", () => {
	const { controller, state, clock } = harness()
	down(controller, 1, { x: 0, y: 0 }, board(), "mouse", 0)
	controller.pointerMove(1, { x: 10, y: 10 })
	controller.pointerCancel(1)
	assert.deepEqual(state.nodes.A, { x: 100, y: 200 })
	assert.equal(state.commits.length, 0)
	down(controller, 2, { x: 0, y: 0 }, board())
	assert.equal(clock.size, 1)
	controller.cancel()
	assert.equal(clock.size, 0)
	assert.deepEqual(controller.activePointerIds, [])
	down(controller, 3, { x: 0, y: 0 }, board(), "mouse", 0)
	controller.pointerMove(3, { x: 20, y: 20 })
	controller.destroy()
	assert.deepEqual(state.nodes.A, { x: 100, y: 200 })
	assert.equal(state.commits.length, 0)
	assert.equal(controller.pointerMove(3, { x: 30, y: 30 }), false)
})

test("wheel is ignored during an owned gesture; Space primary pan overrides card drag", () => {
	const { controller, state } = harness()
	down(controller, 1, { x: 0, y: 0 }, board(), "mouse", 0)
	assert.equal(controller.wheel({ deltaX: 0, deltaY: 10, deltaMode: 0, ctrlKey: false, metaKey: false, shiftKey: false, point: { x: 0, y: 0 } }, () => assert.fail("pan must not run"), () => assert.fail("zoom must not run")), false)
	controller.pointerCancel(1)
	controller.setSpaceHeld(true)
	down(controller, 2, { x: 5, y: 5 }, board(), "mouse", 0)
	assert.equal(controller.activeGestureKind, "space-pan")
	controller.pointerMove(2, { x: 15, y: 25 })
	controller.pointerUp(2, { x: 15, y: 25 })
	assert.deepEqual(state.nodes.A, { x: 100, y: 200 })
	assert.deepEqual(state.transform, { zoom: 1, panX: 35, panY: 5 })
})
