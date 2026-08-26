/**
 * 按需移动端诊断协议。默认关闭、只保留内存中的有限条目，并且只接受白名单字段。
 * 这里不接触节点正文、输入文本或 KeyboardEvent.key。
 */
export const DIAGNOSTIC_SCHEMA_VERSION = 1
export const DEFAULT_DIAGNOSTIC_MAX_ENTRIES = 1024

export type DiagnosticElement = {
	elementType?: string
	role?: string
	contenteditable?: boolean
}

export type DiagnosticRecord = {
	schemaVersion: number
	sessionId: string
	pluginId: string
	timestampMs: number
	seq: number
	event: string
	[key: string]: unknown
}

export type DiagnosticReport = {
	schemaVersion: number
	sessionId: string
	pluginId: string
	records: DiagnosticRecord[]
}

export type DiagnosticInput = {
	event: string
	code?: string
	pointerType?: string
	vaultName?: string
	canvasPath?: string
	viewType?: string
	nodeId?: string
	selectionCount?: number
	isEditing?: boolean
	windowId?: string
	documentId?: string
	target?: DiagnosticElement
	activeElement?: DiagnosticElement
	accepted?: boolean
	shortcutId?: string
	effectObserved?: boolean
	reason?: string
	phase?: string
	contextSource?: string
	leaseReason?: string
	pluginVersion?: string
	diagnosticRevision?: string
	before?: { tx?: number; ty?: number; zoom?: number }
	after?: { tx?: number; ty?: number; zoom?: number }
	callPath?: string
	exception?: string
	redrawRequested?: boolean
}

type DiagnosticOptions = {
	maxEntries?: number
	now?: () => number
	idFactory?: () => string
}

const windowIds = new WeakMap<object, string>()
const documentIds = new WeakMap<object, string>()
let nextWindowId = 1
let nextDocumentId = 1

export function describeDiagnosticElement(value: unknown): DiagnosticElement | undefined {
	if (!value || typeof value !== "object") return undefined
	const element = value as {
		tagName?: unknown
		getAttribute?: (name: string) => string | null
		isContentEditable?: unknown
	}
	const elementType = typeof element.tagName === "string" ? element.tagName.toUpperCase() : undefined
	const roleValue = element.getAttribute?.("role")
	const contentEditableValue = element.getAttribute?.("contenteditable")
	const contenteditable = typeof element.isContentEditable === "boolean"
		? element.isContentEditable
		: contentEditableValue === "" || contentEditableValue?.toLowerCase() === "true" || contentEditableValue?.toLowerCase() === "plaintext-only"
	if (!elementType && !roleValue && contentEditableValue === null && contenteditable === undefined) return undefined
	return {
		...(elementType ? { elementType } : {}),
		...(roleValue ? { role: roleValue.toLowerCase() } : {}),
		...(contenteditable !== undefined ? { contenteditable } : {}),
	}
}

export function getDiagnosticWindowIds(eventWindow: Window | null | undefined): { windowId?: string; documentId?: string } {
	if (!eventWindow || typeof eventWindow !== "object") return {}
	const windowObject = eventWindow as unknown as object
	let windowId = windowIds.get(windowObject)
	if (!windowId) {
		windowId = `window-${nextWindowId++}`
		windowIds.set(windowObject, windowId)
	}
	const documentObject = eventWindow.document as unknown as object | undefined
	if (!documentObject) return { windowId }
	let documentId = documentIds.get(documentObject)
	if (!documentId) {
		documentId = `document-${nextDocumentId++}`
		documentIds.set(documentObject, documentId)
	}
	return { windowId, documentId }
}

function createSessionId(pluginId: string): string {
	try {
		const cryptoObject = globalThis.crypto
		if (cryptoObject?.getRandomValues) {
			const values = new Uint32Array(2)
			cryptoObject.getRandomValues(values)
			return `${pluginId}-${Date.now().toString(36)}-${values[0].toString(36)}${values[1].toString(36)}`
		}
	} catch {
		// Fall through to the browser-compatible fallback.
	}
	return `${pluginId}-${Date.now().toString(36)}-${Math.floor(Math.random() * 0x100000).toString(36)}`
}

export class CanvasDiagnostics {
	private readonly maxEntries: number
	private readonly now: () => number
	private readonly idFactory: () => string
	private records: DiagnosticRecord[] = []
	private currentSessionId = ""
	private active = false

	constructor(private readonly pluginId: string, options: DiagnosticOptions = {}) {
		this.maxEntries = Math.max(1, Math.floor(options.maxEntries ?? DEFAULT_DIAGNOSTIC_MAX_ENTRIES))
		this.now = options.now ?? (() => Date.now())
		this.idFactory = options.idFactory ?? (() => createSessionId(pluginId))
	}

	get enabled(): boolean {
		return this.active
	}

	get sessionId(): string {
		return this.currentSessionId
	}

	start(sessionId?: string): string {
		this.records = []
		this.currentSessionId = sessionId || this.idFactory()
		this.active = true
		return this.currentSessionId
	}

	stop(): DiagnosticReport {
		const report = this.snapshot()
		this.active = false
		this.records = []
		this.currentSessionId = ""
		return report
	}

	snapshot(): DiagnosticReport {
		return {
			schemaVersion: DIAGNOSTIC_SCHEMA_VERSION,
			sessionId: this.currentSessionId,
			pluginId: this.pluginId,
			records: this.records.map(record => ({ ...record })),
		}
	}

	record(input: DiagnosticInput): void {
		if (!this.active) return
		const record: DiagnosticRecord = {
			schemaVersion: DIAGNOSTIC_SCHEMA_VERSION,
			sessionId: this.currentSessionId,
			pluginId: this.pluginId,
			timestampMs: this.now(),
			seq: this.records.length ? this.records[this.records.length - 1].seq + 1 : 1,
			event: input.event,
		}
		const keys: Array<keyof DiagnosticInput> = [
			"code", "pointerType", "vaultName", "canvasPath", "viewType", "nodeId", "selectionCount", "isEditing",
			"windowId", "documentId", "target", "activeElement", "accepted", "shortcutId", "effectObserved", "reason",
			"phase", "contextSource", "leaseReason", "pluginVersion", "diagnosticRevision",
			"before", "after", "callPath", "exception", "redrawRequested",
		]
		for (const key of keys) {
			const value = input[key]
			if (value !== undefined) (record as Record<string, unknown>)[key] = value
		}
		this.records.push(record)
		if (this.records.length > this.maxEntries) this.records.shift()
	}
}

type CanvasActionStateLike = {
	tx?: number
	ty?: number
	zoom?: number
	selection?: Iterable<unknown>
	nodes?: { size?: number }
	edges?: { size?: number }
}

/**
 * Build an in-memory-only fingerprint for diagnosing whether a matched shortcut
 * caused a synchronous Canvas change. Text is reduced to a numeric hash and the
 * fingerprint itself is never added to the report.
 */
export function captureCanvasActionState(canvas: CanvasActionStateLike): string {
	const selection = [...(canvas.selection ?? [])].map(element => {
		const value = element as {
			id?: unknown
			color?: unknown
			x?: unknown
			y?: unknown
			width?: unknown
			height?: unknown
			isEditing?: unknown
			text?: unknown
		}
		return {
			id: typeof value.id === "string" ? value.id : "",
			color: typeof value.color === "string" ? value.color : "",
			x: typeof value.x === "number" ? value.x : undefined,
			y: typeof value.y === "number" ? value.y : undefined,
			width: typeof value.width === "number" ? value.width : undefined,
			height: typeof value.height === "number" ? value.height : undefined,
			isEditing: value.isEditing === true,
			textHash: typeof value.text === "string" ? hashDiagnosticText(value.text) : undefined,
		}
	}).sort((left, right) => left.id.localeCompare(right.id))
	return JSON.stringify({
		tx: canvas.tx,
		ty: canvas.ty,
		zoom: canvas.zoom,
		nodeCount: canvas.nodes?.size,
		edgeCount: canvas.edges?.size,
		selection,
	})
}

function hashDiagnosticText(value: string): number {
	let hash = 2166136261
	for (let index = 0; index < value.length; index++) {
		hash ^= value.charCodeAt(index)
		hash = Math.imul(hash, 16777619)
	}
	return hash >>> 0
}
