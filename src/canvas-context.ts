import type { App } from "obsidian"
import type { Canvas } from "obsidian/canvas"
import type { CanvasPointerLeaseReason, CanvasPointerLeaseRegistry } from "./canvas-pointer-lease"

type CanvasViewCandidate = {
	canvas: Canvas
	container: HTMLElement
	view: unknown
}

/**
 * 从事件所属的 DOM 树解析 Canvas，而不是从 App 的 active view 猜测。
 *
 * Obsidian 的独立窗口拥有自己的 Document；通过所有 workspace leaf 的
 * containerEl 判断归属，可以让主窗口、分栏和 popout 使用同一个解析路径。
 */
export function getCanvasFromEvent(app: App, event: Event, eventWindow?: Window): Canvas | undefined {
	const targets = getEventTargets(event)
	const candidates: CanvasViewCandidate[] = []
	let directCandidate: CanvasViewCandidate | undefined

	app.workspace.iterateAllLeaves(leaf => {
		const view = leaf.view as (typeof leaf.view & {
			canvas?: Canvas
			containerEl?: HTMLElement
		}) | null
		if (!view || view.getViewType() !== "canvas" || !view.canvas || !view.containerEl) return
		const candidate = { canvas: view.canvas, container: view.containerEl, view }
		candidates.push(candidate)
		if (!directCandidate && targets.some(target => isInsideContainer(candidate.container, target)))
			directCandidate = candidate
	})

	if (directCandidate) return directCandidate.canvas
	if (!eventWindow) return undefined
	// A real element outside every Canvas (for example a modal, command palette,
	// or settings control) is an explicit negative context. Never fall back to
	// the only Canvas in that window for such an event.
	const hasOutsideElementTarget = targets.some(target =>
		isElementTarget(target) && !candidates.some(candidate => isInsideContainer(candidate.container, target)))
	if (hasOutsideElementTarget) return undefined

	const windowCandidates = candidates.filter(candidate => candidate.container.ownerDocument.defaultView === eventWindow)
	if (windowCandidates.length === 1) return windowCandidates[0].canvas

	const activeElement = eventWindow.document.activeElement
	const activeCandidate = windowCandidates.find(candidate => isInsideContainer(candidate.container, activeElement))
	if (activeCandidate) return activeCandidate.canvas

	const activeLeafView = app.workspace.activeLeaf?.view
	return windowCandidates.find(candidate => candidate.view === activeLeafView)?.canvas
}

export type CanvasContextResolution = {
	canvas?: Canvas
	source: "event-dom" | "pointer-lease" | "none"
	leaseReason?: CanvasPointerLeaseReason
}

/** Resolve direct DOM ownership first, then a previously proven BODY/HTML pointer lease. */
export function resolveCanvasFromEvent(
	app: App,
	event: Event,
	eventWindow: Window,
	leases: CanvasPointerLeaseRegistry<Canvas>,
): CanvasContextResolution {
	const direct = getCanvasFromEvent(app, event, eventWindow)
	if (direct) return { canvas: direct, source: "event-dom" }

	const leased = leases.resolve(event, eventWindow, {
		blocked: hasBlockingCanvasOverlay(eventWindow.document),
		isCanvasAvailable: canvas => isCanvasAvailableInWindow(app, canvas, eventWindow),
	})
	return leased.canvas
		? { canvas: leased.canvas, source: "pointer-lease", leaseReason: leased.reason }
		: { source: "none", leaseReason: leased.reason }
}

/** Pointer DOM is the only operation that may create or replace a lease. */
export function updateCanvasPointerLeaseFromEvent(
	app: App,
	event: Event,
	eventWindow: Window,
	leases: CanvasPointerLeaseRegistry<Canvas>,
): CanvasContextResolution {
	const direct = getCanvasFromEvent(app, event, eventWindow)
	if (direct) {
		leases.remember(eventWindow, direct)
		return { canvas: direct, source: "event-dom", leaseReason: "lease-hit" }
	}
	leases.clear(eventWindow)
	return { source: "none", leaseReason: "lease-non-shell-target" }
}

function isCanvasAvailableInWindow(app: App, canvas: Canvas, eventWindow: Window): boolean {
	let available = false
	app.workspace.iterateAllLeaves(leaf => {
		if (available) return
		const view = leaf.view as (typeof leaf.view & { canvas?: Canvas; containerEl?: HTMLElement }) | null
		if (view?.canvas === canvas && view.containerEl?.ownerDocument.defaultView === eventWindow) available = true
	})
	return available
}

function hasBlockingCanvasOverlay(document: Document): boolean {
	try { return Boolean(document.querySelector?.(".modal-container, .prompt")) } catch { return true }
}

function isElementTarget(target: unknown): target is Element {
	return typeof target === "object" && target !== null && (target as { nodeType?: unknown }).nodeType === 1
}

function getEventTargets(event: Event): unknown[] {
	const path = typeof event.composedPath === "function" ? event.composedPath() : []
	return [event.target, ...path]
}

function isInsideContainer(container: HTMLElement, target: unknown): boolean {
	if (!target || target === container) return target === container

	const rootDocument = container.ownerDocument
	const targetDocument = (target as { ownerDocument?: Document }).ownerDocument
	if (rootDocument && targetDocument && rootDocument !== targetDocument) return false

	if (typeof container.contains !== "function") return false
	try {
		return container.contains(target as Node)
	} catch {
		return false
	}
}

/** 判断事件目标是否是输入控件、可编辑区域或搜索框。 */
export function isEditableTarget(target: EventTarget | null): boolean {
	let current = target as (Element & {
		isContentEditable?: boolean
		parentElement?: Element | null
		parentNode?: Node | null
	}) | null

	for (let depth = 0; current && depth < 32; depth++) {
		const tagName = current.tagName?.toLowerCase()
		if (["input", "textarea", "select", "option"].includes(tagName)) return true

		const role = current.getAttribute?.("role")?.toLowerCase()
		if (role === "textbox" || current.isContentEditable) return true

		const contentEditable = current.getAttribute?.("contenteditable")?.toLowerCase()
		if (contentEditable === "" || contentEditable === "true" || contentEditable === "plaintext-only") return true

		current = current.parentElement ?? (current.parentNode as Element | null) ?? null
	}

	return false
}

/** Canvas 节点处于编辑状态时，快捷键交给 Obsidian 的编辑器处理。 */
export function isCanvasEditing(canvas: Canvas): boolean {
	for (const element of canvas.selection ?? []) {
		if ((element as { isEditing?: boolean }).isEditing) return true
	}
	return false
}

/** 快捷键保护条件：输入框、编辑态、组合输入和长按重复都不进入插件逻辑。 */
export function canHandleCanvasKeyboardEvent(event: KeyboardEvent, canvas: Canvas): boolean {
	// Canvas 自己可能会先调用 preventDefault；这不代表插件快捷键不应执行。
	if (event.isComposing || event.repeat) return false
	if (isEditableTarget(event.target)) return false
	if (isCanvasEditing(canvas)) return false
	return true
}
