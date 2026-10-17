export type CanvasPoint = { x: number; y: number };

export type ViewportTransform = {
	zoom: number;
	panX: number;
	panY: number;
};

export type ViewportBounds = {
	minZoom: number;
	maxZoom: number;
};

export class CompatibilityClickGuard<T extends object> {
	private readonly expiresAt = new Map<T, number>();

	suppress(target: T, expires: number, now: number): void {
		this.prune(now);
		this.expiresAt.set(target, expires);
	}

	consume(target: T, now: number, detail: number): boolean {
		if (detail === 0) return false;
		const expires = this.expiresAt.get(target);
		if (expires === undefined) return false;
		if (now > expires) {
			this.expiresAt.delete(target);
			return false;
		}
		return true;
	}

	clear(target: T): void { this.expiresAt.delete(target); }
	clearAll(): void { this.expiresAt.clear(); }

	private prune(now: number): void {
		for (const [target, expires] of this.expiresAt) {
			if (now > expires) this.expiresAt.delete(target);
		}
	}
}

export type PointerTarget =
	| { kind: "blank" }
	| { kind: "board"; path: string; position: CanvasPoint }
	| { kind: "edge"; key: string }
	| { kind: "excluded" };

export type PointerInput = {
	id: number;
	point: CanvasPoint;
	pointerType: string;
	button: number;
	target: PointerTarget;
};

export type WheelInput = {
	deltaX: number;
	deltaY: number;
	deltaMode: number;
	ctrlKey: boolean;
	metaKey: boolean;
	shiftKey: boolean;
	point: CanvasPoint;
};

type GestureCallbacks = {
	getTransform(): ViewportTransform;
	setTransform(transform: ViewportTransform): void;
	setNodePosition(path: string, position: CanvasPoint, phase: "preview" | "commit" | "cancel"): void;
	onTap(target: Exclude<PointerTarget, { kind: "excluded" }>, pointerType: string, point: CanvasPoint): void;
	onInteraction(): void;
	setTimeout(callback: () => void, delay: number): number;
	clearTimeout(handle: number): void;
};

const MOUSE_PRIMARY = 0;
const MOUSE_MIDDLE = 1;
const MOUSE_SECONDARY = 2;
const NODE_DRAG_THRESHOLD = 5;
const TOUCH_PAN_THRESHOLD = 5;
const TOUCH_LONG_PRESS_MS = 600;
const TOUCH_LONG_PRESS_SLOP = 8;

type ActivePointerInput = Omit<PointerInput, "target"> & { target: Exclude<PointerTarget, { kind: "excluded" }> };
type TrackedPointer = ActivePointerInput & { start: CanvasPoint };
type PinchBaseline = {
	ids: [number, number];
	startDistance: number;
	startZoom: number;
	worldAnchor: CanvasPoint;
};
type ActiveGesture =
	| { kind: "pan"; pointerId: number; start: CanvasPoint; origin: ViewportTransform }
	| { kind: "node"; pointerId: number; path: string; origin: CanvasPoint; start: CanvasPoint; moved: boolean }
	| { kind: "touch-pending"; pointerId: number; path: string; origin: CanvasPoint; start: CanvasPoint }
	| { kind: "touch-pan"; pointerId: number; target: Exclude<PointerTarget, { kind: "excluded" }>; start: CanvasPoint; origin: ViewportTransform; moved: boolean }
	| { kind: "pinch"; baseline: PinchBaseline }
	| { kind: "space-pan"; pointerId: number; start: CanvasPoint; origin: ViewportTransform };

export function clampZoom(zoom: number, bounds: ViewportBounds): number {
	return Math.max(bounds.minZoom, Math.min(bounds.maxZoom, zoom));
}

export function transformAtAnchor(
	zoom: number,
	worldAnchor: CanvasPoint,
	viewportPoint: CanvasPoint,
	bounds: ViewportBounds,
): ViewportTransform {
	const nextZoom = clampZoom(zoom, bounds);
	return {
		zoom: nextZoom,
		panX: viewportPoint.x - worldAnchor.x * nextZoom,
		panY: viewportPoint.y - worldAnchor.y * nextZoom,
	};
}

export function pinchBaseline(transform: ViewportTransform, center: CanvasPoint, distance: number): PinchBaseline {
	return {
		ids: [-1, -1],
		startDistance: Math.max(1, distance),
		startZoom: transform.zoom,
		worldAnchor: {
			x: (center.x - transform.panX) / transform.zoom,
			y: (center.y - transform.panY) / transform.zoom,
		},
	};
}

export function transformForPinch(
	baseline: PinchBaseline,
	center: CanvasPoint,
	distance: number,
	bounds: ViewportBounds,
): ViewportTransform {
	const zoom = clampZoom(baseline.startZoom * Math.max(0, distance) / baseline.startDistance, bounds);
	return {
		zoom,
		panX: center.x - baseline.worldAnchor.x * zoom,
		panY: center.y - baseline.worldAnchor.y * zoom,
	};
}

export function normalizeWheelDelta(input: Pick<WheelInput, "deltaX" | "deltaY" | "deltaMode">): CanvasPoint {
	const scale = input.deltaMode === 1 ? 40 : input.deltaMode === 2 ? 800 : 1;
	return { x: scale * input.deltaX, y: scale * input.deltaY };
}

export type WheelAction =
	| { kind: "pan"; delta: CanvasPoint }
	| { kind: "zoom"; factor: number; point: CanvasPoint };

export function resolveWheelAction(input: WheelInput): WheelAction {
	const delta = normalizeWheelDelta(input);
	if (input.ctrlKey || input.metaKey) {
		return { kind: "zoom", factor: Math.exp(-delta.y * 0.0024), point: input.point };
	}
	if (input.shiftKey && input.deltaX === 0) {
		return { kind: "pan", delta: { x: delta.y, y: 0 } };
	}
	return { kind: "pan", delta };
}

export class ViewportMotion {
	private current: ViewportTransform;
	private target: ViewportTransform;
	private frame?: number;
	private generation = 0;

	constructor(
		initial: ViewportTransform,
		private readonly win: Window,
		private readonly bounds: ViewportBounds,
		private readonly onChange: (transform: ViewportTransform) => void,
		private readonly duration = 110,
	) {
		this.current = { ...initial };
		this.target = { ...initial };
	}

	get transform(): ViewportTransform { return { ...this.current }; }
	get targetTransform(): ViewportTransform { return { ...this.target }; }
	get isAnimating(): boolean { return this.frame !== undefined; }

	setImmediate(transform: ViewportTransform): void {
		this.cancel();
		this.current = { ...transform, zoom: clampZoom(transform.zoom, this.bounds) };
		this.target = { ...this.current };
		this.onChange(this.transform);
	}

	zoomAt(factor: number, point: CanvasPoint, animated: boolean): void {
		const base = this.targetTransform;
		const worldAnchor = { x: (point.x - base.panX) / base.zoom, y: (point.y - base.panY) / base.zoom };
		const next = transformAtAnchor(base.zoom * factor, worldAnchor, point, this.bounds);
		this.animateTo(next, animated);
	}

	zoomTo(zoom: number, point: CanvasPoint, animated: boolean): void {
		const base = this.targetTransform;
		const worldAnchor = { x: (point.x - base.panX) / base.zoom, y: (point.y - base.panY) / base.zoom };
		this.animateTo(transformAtAnchor(zoom, worldAnchor, point, this.bounds), animated);
	}

	private animateTo(next: ViewportTransform, animated: boolean): void {
		if (!animated || this.win.document.hidden) {
			this.setImmediate(next);
			return;
		}
		this.cancelFrame();
		const generation = ++this.generation;
		const start = this.transform;
		const target = { ...next };
		this.target = target;
		const startedAt = this.win.performance.now();
		const tick = (now: number): void => {
			if (generation !== this.generation) return;
			const progress = Math.max(0, Math.min(1, (now - startedAt) / this.duration));
			const eased = 1 - Math.pow(1 - progress, 3);
			this.current = {
				zoom: start.zoom + (target.zoom - start.zoom) * eased,
				panX: start.panX + (target.panX - start.panX) * eased,
				panY: start.panY + (target.panY - start.panY) * eased,
			};
			this.onChange(this.transform);
			if (progress < 1 && !this.win.document.hidden) this.frame = this.win.requestAnimationFrame(tick);
			else {
				this.current = { ...target };
				this.target = { ...target };
				this.frame = undefined;
				this.onChange(this.transform);
			}
		};
		this.frame = this.win.requestAnimationFrame(tick);
	}

	cancel(): void {
		this.generation += 1;
		this.cancelFrame();
		this.target = { ...this.current };
	}

	finishAnimation(): void {
		this.generation += 1;
		this.cancelFrame();
		this.current = { ...this.target };
		this.onChange(this.transform);
	}

	private cancelFrame(): void {
		if (this.frame === undefined) return;
		this.win.cancelAnimationFrame(this.frame);
		this.frame = undefined;
	}
}

export class MetaCanvasInteractionController {
	private readonly pointers = new Map<number, TrackedPointer>();
	private gesture?: ActiveGesture;
	private longPressTimer?: number;
	private spaceHeld = false;
	private destroyed = false;

	constructor(
		private readonly callbacks: GestureCallbacks,
		private readonly bounds: ViewportBounds,
	) {}

	get activePointerIds(): readonly number[] { return [...this.pointers.keys()]; }
	get activeGestureKind(): ActiveGesture["kind"] | undefined { return this.gesture?.kind; }
	hasPointer(id: number): boolean { return this.pointers.has(id); }

	shouldSuppressCompatibilityClick(id: number): boolean {
		const gesture = this.gesture;
		if (!gesture) return false;
		if (gesture.kind === "pinch") return gesture.baseline.ids.includes(id);
		if (gesture.kind === "node") return gesture.pointerId === id && gesture.moved;
		if (gesture.kind === "touch-pan") return gesture.pointerId === id && gesture.moved;
		if (gesture.kind === "space-pan" && gesture.pointerId === id) {
			const pointer = this.pointers.get(id);
			return Boolean(pointer && distance(pointer.point, gesture.start) > NODE_DRAG_THRESHOLD);
		}
		return false;
	}

	pointerDown(input: PointerInput): boolean {
		if (this.destroyed || input.target.kind === "excluded") return false;
		const activeInput = input as ActivePointerInput;
		const touch = input.pointerType === "touch";
		const primary = input.pointerType !== "mouse" && input.pointerType !== "pen" || input.button === MOUSE_PRIMARY;
		const auxiliaryPan = input.pointerType === "mouse" && (input.button === MOUSE_MIDDLE || input.button === MOUSE_SECONDARY);
		const spacePan = this.spaceHeld && input.button === MOUSE_PRIMARY;
		if (!primary && !auxiliaryPan) return false;
		if (input.pointerType === "mouse" && input.button === MOUSE_PRIMARY && (input.target.kind === "blank" || input.target.kind === "edge") && !spacePan) {
			this.callbacks.onInteraction();
			return false;
		}
		this.callbacks.onInteraction();
		this.pointers.set(input.id, { ...activeInput, start: { ...input.point } });

		if (touch) {
			this.startTouchGesture(activeInput);
			return true;
		}
		if (this.pointers.size >= 2) {
			this.beginPinch();
			return true;
		}
		if (spacePan || auxiliaryPan) {
			this.gesture = { kind: spacePan ? "space-pan" : "pan", pointerId: input.id, start: input.point, origin: this.callbacks.getTransform() };
			return true;
		}
		if (input.target.kind === "board") {
			this.gesture = { kind: "node", pointerId: input.id, path: input.target.path, origin: { ...input.target.position }, start: input.point, moved: false };
			return true;
		}
		this.gesture = { kind: "pan", pointerId: input.id, start: input.point, origin: this.callbacks.getTransform() };
		return true;
	}

	pointerMove(id: number, point: CanvasPoint): boolean {
		const pointer = this.pointers.get(id);
		if (!pointer || this.destroyed) return false;
		pointer.point = { ...point };
		const gesture = this.gesture;
		if (!gesture) return true;
		if (gesture.kind === "pinch") {
			this.updatePinch(gesture.baseline);
			return true;
		}
		if (gesture.pointerId !== id) return true;
		const dx = point.x - gesture.start.x;
		const dy = point.y - gesture.start.y;
		if (gesture.kind === "touch-pending") {
			if (Math.hypot(dx, dy) > TOUCH_LONG_PRESS_SLOP) {
				this.clearLongPress();
				this.gesture = { kind: "touch-pan", pointerId: id, target: { kind: "board", path: gesture.path, position: gesture.origin }, start: gesture.start, origin: this.callbacks.getTransform(), moved: true };
				this.movePan(id, point);
			}
			return true;
		}
		if (gesture.kind === "pan" || gesture.kind === "space-pan" || gesture.kind === "touch-pan") {
			if (gesture.kind === "touch-pan" && Math.hypot(dx, dy) > TOUCH_PAN_THRESHOLD) gesture.moved = true;
			this.callbacks.setTransform({ ...gesture.origin, panX: gesture.origin.panX + dx, panY: gesture.origin.panY + dy });
			return true;
		}
		if (gesture.kind === "node") {
			if (!gesture.moved && Math.hypot(dx, dy) <= NODE_DRAG_THRESHOLD) return true;
			gesture.moved = true;
			const transform = this.callbacks.getTransform();
			this.callbacks.setNodePosition(gesture.path, { x: Math.max(0, gesture.origin.x + dx / transform.zoom), y: Math.max(0, gesture.origin.y + dy / transform.zoom) }, "preview");
		}
		return true;
	}

	pointerUp(id: number, point: CanvasPoint): boolean {
		const pointer = this.pointers.get(id);
		if (!pointer || this.destroyed) return false;
		pointer.point = { ...point };
		const gesture = this.gesture;
		const completedTouch = pointer.pointerType === "touch";
		this.pointers.delete(id);
		this.clearLongPress();
		if (gesture?.kind === "node" && gesture.pointerId === id) {
			if (gesture.moved) {
				const position = this.getNodePosition(gesture, point);
				this.callbacks.setNodePosition(gesture.path, position, "preview");
				this.callbacks.setNodePosition(gesture.path, position, "commit");
			}
			else if (completedTouch) this.callbacks.onTap({ kind: "board", path: gesture.path, position: gesture.origin }, pointer.pointerType, point);
		} else if (gesture?.kind === "touch-pending" && gesture.pointerId === id) {
			this.callbacks.onTap({ kind: "board", path: gesture.path, position: gesture.origin }, pointer.pointerType, point);
		} else if (gesture?.kind === "touch-pan" && gesture.pointerId === id && !gesture.moved) {
			this.callbacks.onTap(gesture.target, pointer.pointerType, point);
		} else if (completedTouch && gesture?.kind === "pinch") {
			// A pinch owns both contacts; lifting either one never becomes a tap.
		} else if (gesture?.kind === "pan" && gesture.pointerId === id && completedTouch) {
			this.callbacks.onTap(pointer.target, pointer.pointerType, point);
		} else if (gesture?.kind === "space-pan" && gesture.pointerId === id) {
			// Space pan is a temporary mouse gesture; it never selects the target.
		}
		if (gesture?.kind === "node" && gesture.pointerId === id && gesture.moved === false) {
			// A node tap is dispatched above; no position was written.
		}
		if (gesture?.kind === "pinch" && !gesture.baseline.ids.includes(id)) {
			// A third contact was not part of the active pinch; keep its original baseline.
		} else if (gesture?.kind === "pinch" && gesture.baseline.ids.includes(id) && this.pointers.size >= 2) this.beginPinch();
		else if (gesture?.kind === "pinch" && gesture.baseline.ids.includes(id) && this.pointers.size === 1) this.beginOnePointerContinuation();
		else if (this.pointers.size >= 2) this.beginPinch();
		else if (this.pointers.size === 1) this.beginOnePointerContinuation();
		else this.gesture = undefined;
		return true;
	}

	pointerCancel(id: number): boolean {
		if (!this.pointers.has(id)) return false;
		const gesture = this.gesture;
		this.pointers.delete(id);
		this.clearLongPress();
		if (gesture?.kind === "node" && gesture.pointerId === id) this.callbacks.setNodePosition(gesture.path, gesture.origin, "cancel");
		if (gesture?.kind === "pinch") this.rebuildGestureAfterPointerRemoval(gesture.baseline.ids.includes(id));
		else if (gesture && "pointerId" in gesture && gesture.pointerId === id) {
			if (this.pointers.size >= 2) this.beginPinch();
			else if (this.pointers.size === 1) this.beginOnePointerContinuation();
			else this.gesture = undefined;
		}
		return true;
	}

	wheel(input: WheelInput, onPan: (delta: CanvasPoint) => void, onZoom: (factor: number, point: CanvasPoint) => void): boolean {
		if (this.destroyed || this.gesture) return false;
		const action = resolveWheelAction(input);
		if (action.kind === "pan") onPan(action.delta);
		else onZoom(action.factor, action.point);
		return true;
	}

	setSpaceHeld(held: boolean): void { this.spaceHeld = held; }

	cancel(): void {
		this.clearLongPress();
		if (this.gesture?.kind === "node") this.callbacks.setNodePosition(this.gesture.path, this.gesture.origin, "cancel");
		this.pointers.clear();
		this.gesture = undefined;
		this.spaceHeld = false;
	}

	destroy(): void {
		this.cancel();
		this.destroyed = true;
	}

	private startTouchGesture(input: ActivePointerInput): void {
		if (this.pointers.size >= 2) {
			if (this.gesture?.kind === "pinch" && this.gesture.baseline.ids.every((id) => this.pointers.has(id))) return;
			if (this.gesture?.kind === "node") this.callbacks.setNodePosition(this.gesture.path, this.gesture.origin, "cancel");
			this.clearLongPress();
			this.beginPinch();
			return;
		}
		if (input.target.kind === "board") {
			const { path, position } = input.target;
			this.gesture = { kind: "touch-pending", pointerId: input.id, path, origin: { ...position }, start: input.point };
			this.longPressTimer = this.callbacks.setTimeout(() => {
				if (this.gesture?.kind !== "touch-pending" || this.gesture.pointerId !== input.id) return;
				this.gesture = { kind: "node", pointerId: input.id, path, origin: { ...position }, start: input.point, moved: false };
			}, TOUCH_LONG_PRESS_MS);
		} else {
			this.gesture = { kind: "touch-pan", pointerId: input.id, target: input.target, start: input.point, origin: this.callbacks.getTransform(), moved: false };
		}
	}

	private beginPinch(): void {
		const selected = [...this.pointers.values()].slice(0, 2);
		if (selected.length < 2) return;
		this.clearLongPress();
		const [first, second] = selected as [TrackedPointer, TrackedPointer];
		const center = midpoint(first.point, second.point);
		const baseline = pinchBaseline(this.callbacks.getTransform(), center, distance(first.point, second.point));
		baseline.ids = [first.id, second.id];
		this.gesture = { kind: "pinch", baseline };
	}

	private updatePinch(baseline: PinchBaseline): void {
		const first = this.pointers.get(baseline.ids[0]);
		const second = this.pointers.get(baseline.ids[1]);
		if (!first || !second) return;
		this.callbacks.setTransform(transformForPinch(baseline, midpoint(first.point, second.point), distance(first.point, second.point), this.bounds));
	}

	private beginOnePointerContinuation(): void {
		const [pointer] = this.pointers.values();
		if (!pointer) return;
		this.gesture = { kind: "touch-pan", pointerId: pointer.id, target: pointer.target, start: pointer.point, origin: this.callbacks.getTransform(), moved: true };
	}

	private rebuildGestureAfterPointerRemoval(participantRemoved: boolean): void {
		if (!participantRemoved) return;
		if (this.pointers.size >= 2) this.beginPinch();
		else if (this.pointers.size === 1) this.beginOnePointerContinuation();
		else this.gesture = undefined;
	}

	private movePan(id: number, point: CanvasPoint): void {
		const gesture = this.gesture;
		if (!gesture || (gesture.kind !== "pan" && gesture.kind !== "touch-pan")) return;
		const dx = point.x - gesture.start.x;
		const dy = point.y - gesture.start.y;
		this.callbacks.setTransform({ ...gesture.origin, panX: gesture.origin.panX + dx, panY: gesture.origin.panY + dy });
	}

	private getNodePosition(gesture: Extract<ActiveGesture, { kind: "node" }>, point: CanvasPoint): CanvasPoint {
		const transform = this.callbacks.getTransform();
		return {
			x: Math.max(0, gesture.origin.x + (point.x - gesture.start.x) / transform.zoom),
			y: Math.max(0, gesture.origin.y + (point.y - gesture.start.y) / transform.zoom),
		};
	}

	private clearLongPress(): void {
		if (this.longPressTimer === undefined) return;
		this.callbacks.clearTimeout(this.longPressTimer);
		this.longPressTimer = undefined;
	}
}

function midpoint(a: CanvasPoint, b: CanvasPoint): CanvasPoint {
	return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function distance(a: CanvasPoint, b: CanvasPoint): number {
	return Math.hypot(b.x - a.x, b.y - a.y);
}
