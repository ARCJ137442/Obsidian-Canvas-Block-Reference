export type CanvasPointerLeaseReason =
	| "lease-hit"
	| "lease-missing"
	| "lease-document-mismatch"
	| "lease-non-shell-target"
	| "lease-active-element-blocked"
	| "lease-overlay-blocked"
	| "lease-canvas-unavailable"

type DocumentLike = {
	activeElement?: unknown
}

type WindowLike = {
	document?: DocumentLike
}

type CanvasLease<TCanvas extends object> = {
	canvas: TCanvas
	document: DocumentLike
}

export type CanvasPointerLeaseResolution<TCanvas extends object> = {
	canvas?: TCanvas
	reason: CanvasPointerLeaseReason
}

/**
 * Remembers only an explicitly observed pointer interaction with a Canvas.
 * BODY/HTML keyboard events may reuse that proof while the same Window,
 * Document and Canvas stay valid. This never guesses from activeLeaf.
 */
export class CanvasPointerLeaseRegistry<TCanvas extends object> {
	private readonly leases = new WeakMap<object, CanvasLease<TCanvas>>()

	remember(eventWindow: WindowLike | null | undefined, canvas: TCanvas): boolean {
		if (!eventWindow || typeof eventWindow !== "object" || !eventWindow.document) return false
		this.leases.set(eventWindow as object, { canvas, document: eventWindow.document })
		return true
	}

	clear(eventWindow: WindowLike | null | undefined): void {
		if (eventWindow && typeof eventWindow === "object") this.leases.delete(eventWindow as object)
	}

	has(eventWindow: WindowLike | null | undefined): boolean {
		return Boolean(eventWindow && typeof eventWindow === "object" && this.leases.has(eventWindow as object))
	}

	resolve(
		event: Pick<Event, "target" | "composedPath">,
		eventWindow: WindowLike | null | undefined,
		options: { blocked?: boolean; isCanvasAvailable: (canvas: TCanvas) => boolean },
	): CanvasPointerLeaseResolution<TCanvas> {
		if (!eventWindow || typeof eventWindow !== "object" || !eventWindow.document)
			return { reason: "lease-missing" }

		if (options.blocked) {
			this.clear(eventWindow)
			return { reason: "lease-overlay-blocked" }
		}

		const targets = [event.target, ...(typeof event.composedPath === "function" ? event.composedPath() : [])]
		const elementTargets = targets.filter((target): target is EventTarget & { nodeType?: unknown; tagName?: unknown } => isElementLike(target))
		if (!elementTargets.length || elementTargets.some(target => !isShellElement(target))) {
			this.clear(eventWindow)
			return { reason: "lease-non-shell-target" }
		}

		const activeElement = eventWindow.document.activeElement
		if (activeElement && (!isElementLike(activeElement) || !isShellElement(activeElement))) {
			this.clear(eventWindow)
			return { reason: "lease-active-element-blocked" }
		}

		const lease = this.leases.get(eventWindow as object)
		if (!lease) return { reason: "lease-missing" }
		if (lease.document !== eventWindow.document) {
			this.clear(eventWindow)
			return { reason: "lease-document-mismatch" }
		}
		if (!options.isCanvasAvailable(lease.canvas)) {
			this.clear(eventWindow)
			return { reason: "lease-canvas-unavailable" }
		}
		return { canvas: lease.canvas, reason: "lease-hit" }
	}
}

function isElementLike(value: unknown): value is { nodeType?: unknown; tagName?: unknown } {
	return Boolean(value && typeof value === "object" && (value as { nodeType?: unknown }).nodeType === 1)
}

function isShellElement(value: { tagName?: unknown }): boolean {
	const tagName = typeof value.tagName === "string" ? value.tagName.toUpperCase() : ""
	return tagName === "BODY" || tagName === "HTML"
}
