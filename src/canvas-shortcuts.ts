/**
 * 白板快捷键的集中定义与持久化配置。
 *
 * 配置保存 KeyboardEvent.code，而不是本地化后的 key 文本；这样在不同
 * 键盘布局和主窗口/独立窗口之间都保持同一语义。
 */

export type ShortcutModifier = boolean | "any"

export interface CanvasShortcutDefinition {
	keys?: readonly string[]
	codes?: readonly string[]
	codePattern?: RegExp
	shift?: ShortcutModifier
	ctrl?: ShortcutModifier
	alt?: ShortcutModifier
	meta?: ShortcutModifier
}

export interface CanvasShortcutSettings {
	edit: string[]
	deleteSelection: string
	cancelSelection: string[]
	cycleColor: string
	moveNorth: string
	moveWest: string
	moveSouth: string
	moveEast: string
	extend: string
	focus: string
	zoom: string
	createEdge: string
	compactLayout: string
	counter: string
	/** Index is the Markdown title level (0~9); value is a KeyboardEvent.code. */
	formatTitle: string[]
	splitList: string
	/** 白板内轮换聚焦（当前白板）：单按前进、Shift 后退。 */
	rotationNext: string
}

export type CanvasShortcutSettingKey = keyof CanvasShortcutSettings
export type CanvasShortcutSingleSettingKey = Exclude<CanvasShortcutSettingKey, "edit" | "cancelSelection" | "formatTitle">
export type CanvasShortcutFamilySettingKey = "edit" | "cancelSelection" | "formatTitle"

export type CanvasShortcutId =
	| "edit" | "deleteSelection" | "cancelSelection" | "cycleColor" | "directional"
	| "extend" | "focus" | "zoom" | "createEdge" | "compactLayout" | "counter"
	| "formatTitle" | "splitList" | "rotationNext"

export const DEFAULT_CANVAS_SHORTCUT_SETTINGS: CanvasShortcutSettings = {
	edit: ["Space", "Enter"],
	deleteSelection: "KeyX",
	cancelSelection: ["KeyQ", "Escape"],
	cycleColor: "KeyC",
	moveNorth: "KeyW",
	moveWest: "KeyA",
	moveSouth: "KeyS",
	moveEast: "KeyD",
	extend: "KeyE",
	focus: "KeyF",
	zoom: "KeyZ",
	createEdge: "KeyR",
	compactLayout: "KeyE",
	counter: "KeyY",
	formatTitle: ["Digit0", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9"],
	splitList: "KeyK",
	rotationNext: "KeyG",
}

/** Actions that use one configurable key. Key families are rendered separately in settings. */
export const CONFIGURABLE_CANVAS_SHORTCUTS: ReadonlyArray<{
	id: CanvasShortcutSingleSettingKey
	name: string
	description: string
}> = [
	{ id: "deleteSelection", name: "删除选区", description: "删除当前选中的节点或连边" },
	{ id: "cycleColor", name: "轮换白板颜色", description: "按下 Shift 时反向轮换" },
	{ id: "moveNorth", name: "选择/扩展：向上", description: "WASD 方向键中的上方向" },
	{ id: "moveWest", name: "选择/扩展：向左", description: "WASD 方向键中的左方向" },
	{ id: "moveSouth", name: "选择/扩展：向下", description: "WASD 方向键中的下方向" },
	{ id: "moveEast", name: "选择/扩展：向右", description: "WASD 方向键中的右方向" },
	{ id: "extend", name: "延展/创建节点", description: "与方向键组合时延展节点" },
	{ id: "focus", name: "聚焦选区", description: "将视图聚焦到选区" },
	{ id: "zoom", name: "缩放白板", description: "按住连续缩放，Shift 反向" },
	{ id: "createEdge", name: "创建连边", description: "默认使用 Shift+R" },
	{ id: "compactLayout", name: "紧凑布局", description: "默认使用 Ctrl+Shift+Alt+E" },
	{ id: "counter", name: "CTDP 计数", description: "按下 Shift 时清零" },
	{ id: "splitList", name: "拆分 Markdown 列表", description: "默认使用 Shift+K" },
	{ id: "rotationNext", name: "轮换聚焦（当前白板）", description: "单按前进到下一个匹配节点，Shift 后退；改绑或清除可禁用" },
]

export const CANVAS_SHORTCUTS = createCanvasShortcutDefinitions(DEFAULT_CANVAS_SHORTCUT_SETTINGS)

function matchesModifier(actual: boolean, expected: ShortcutModifier | undefined): boolean {
	return expected === undefined || expected === "any" || actual === expected
}

export function matchesCanvasShortcut(
	event: Pick<KeyboardEvent, "key" | "code" | "shiftKey" | "ctrlKey" | "altKey" | "metaKey">,
	shortcut: CanvasShortcutDefinition,
): boolean {
	const matchesKey = !shortcut.keys || shortcut.keys.includes(event.key)
	const matchesCode = !shortcut.codes || shortcut.codes.includes(event.code)
	const matchesCodePattern = !shortcut.codePattern || shortcut.codePattern.test(event.code)

	return matchesKey && matchesCode && matchesCodePattern
		&& matchesModifier(event.shiftKey, shortcut.shift)
		&& matchesModifier(event.ctrlKey, shortcut.ctrl)
		&& matchesModifier(event.altKey, shortcut.alt)
		&& matchesModifier(event.metaKey, shortcut.meta)
}

function createCanvasShortcutDefinitions(settings: CanvasShortcutSettings): Record<CanvasShortcutId, CanvasShortcutDefinition> {
	return {
		edit: { codes: settings.edit, shift: false, ctrl: false, alt: false, meta: false },
		deleteSelection: { codes: [settings.deleteSelection], shift: false, ctrl: false, alt: false, meta: false },
		cancelSelection: { codes: settings.cancelSelection, shift: false, ctrl: false, alt: false, meta: false },
		cycleColor: { codes: [settings.cycleColor], shift: "any", ctrl: false, alt: false, meta: false },
		directional: {
			codes: [settings.moveNorth, settings.moveWest, settings.moveSouth, settings.moveEast],
			shift: "any", ctrl: false, alt: false, meta: false,
		},
		extend: { codes: [settings.extend], shift: false, ctrl: false, alt: false, meta: false },
		focus: { codes: [settings.focus], shift: false, ctrl: false, alt: false, meta: false },
		zoom: { codes: [settings.zoom], shift: "any", ctrl: false, alt: false, meta: false },
		createEdge: { codes: [settings.createEdge], shift: true, ctrl: false, alt: false, meta: false },
		compactLayout: { codes: [settings.compactLayout], shift: true, ctrl: true, alt: true, meta: false },
		counter: { codes: [settings.counter], shift: "any", ctrl: false, alt: false, meta: false },
		// Title levels are a configurable key family. Alt remains optional for compatibility;
		// Shift/Ctrl/Meta remain disallowed so ordinary editor shortcuts are not swallowed.
		formatTitle: { codes: settings.formatTitle, shift: false, ctrl: false, alt: "any", meta: false },
		splitList: { codes: [settings.splitList], shift: true, ctrl: false, alt: false, meta: false },
		rotationNext: { codes: [settings.rotationNext], shift: "any", ctrl: false, alt: false, meta: false },
	}
}

const CANVAS_SHORTCUT_ORDER: CanvasShortcutId[] = [
	"edit", "deleteSelection", "cancelSelection", "cycleColor", "directional",
	"extend", "focus", "zoom", "createEdge", "compactLayout", "counter",
	"formatTitle", "splitList", "rotationNext",
]

export function getCanvasShortcutId(
	event: Pick<KeyboardEvent, "key" | "code" | "shiftKey" | "ctrlKey" | "altKey" | "metaKey">,
	settings: CanvasShortcutSettings = DEFAULT_CANVAS_SHORTCUT_SETTINGS,
): CanvasShortcutId | undefined {
	const shortcuts = createCanvasShortcutDefinitions(settings)
	for (const id of CANVAS_SHORTCUT_ORDER) {
		if (matchesCanvasShortcut(event, shortcuts[id])) return id
	}
	return undefined
}

/** Directional shortcuts may be shared with a companion Canvas viewport plugin. */
export function canPropagateCanvasShortcut(
	event: Pick<KeyboardEvent, "key" | "code" | "shiftKey" | "ctrlKey" | "altKey" | "metaKey">,
	settings: CanvasShortcutSettings = DEFAULT_CANVAS_SHORTCUT_SETTINGS,
): boolean {
	return getCanvasShortcutId(event, settings) === "directional"
}

/** Return configurable shortcuts whose modifier/code domain overlaps a candidate. */
export function getCanvasShortcutConflicts(
	settings: CanvasShortcutSettings,
	id: CanvasShortcutSettingKey,
	candidateCode: string,
	index = 0,
): CanvasShortcutId[] {
	const proposed = withCanvasShortcutCode(settings, id, candidateCode, index)
	const definitions = createCanvasShortcutDefinitions(proposed)
	const conflicts = new Set<CanvasShortcutId>()
	const proposedId = shortcutIdForSetting(id)
	const otherCodesInSameBinding = getOtherCodesInBinding(proposed, id, index)
	if (otherCodesInSameBinding.includes(candidateCode)) conflicts.add(proposedId)
	const modifiers = [false, true]
	for (const shiftKey of modifiers) {
		for (const ctrlKey of modifiers) {
			for (const altKey of modifiers) {
				for (const metaKey of modifiers) {
					const event = { key: candidateCode, code: candidateCode, shiftKey, ctrlKey, altKey, metaKey }
					const proposedDefinition = definitions[proposedId]
					if (!matchesCanvasShortcut(event, proposedDefinition)) continue
					for (const otherId of CANVAS_SHORTCUT_ORDER) {
						if (otherId === proposedId) continue
						if (matchesCanvasShortcut(event, definitions[otherId])) conflicts.add(otherId)
					}
				}
			}
		}
	}
	return [...conflicts]
}

export function getShortcutCodes(settings: CanvasShortcutSettings, id: CanvasShortcutId): readonly string[] {
	switch (id) {
		case "edit": return settings.edit
		case "deleteSelection": return [settings.deleteSelection]
		case "cancelSelection": return settings.cancelSelection
		case "cycleColor": return [settings.cycleColor]
		case "directional": return [settings.moveNorth, settings.moveWest, settings.moveSouth, settings.moveEast]
		case "extend": return [settings.extend]
		case "focus": return [settings.focus]
		case "zoom": return [settings.zoom]
		case "createEdge": return [settings.createEdge]
		case "compactLayout": return [settings.compactLayout]
		case "counter": return [settings.counter]
		case "formatTitle": return settings.formatTitle
		case "splitList": return [settings.splitList]
		case "rotationNext": return [settings.rotationNext]
	}
}

export type CanvasDirection = "north" | "west" | "south" | "east"

export function getCanvasDirection(code: string, settings: CanvasShortcutSettings): CanvasDirection | undefined {
	if (code === settings.moveNorth) return "north"
	if (code === settings.moveWest) return "west"
	if (code === settings.moveSouth) return "south"
	if (code === settings.moveEast) return "east"
	return undefined
}

/** Return the title level represented by a configured title-family key. */
export function getCanvasTitleLevel(code: string, settings: CanvasShortcutSettings): number | undefined {
	const level = settings.formatTitle.indexOf(code)
	return level >= 0 ? level : undefined
}

/** Replace one slot in a single shortcut or shortcut family. */
export function withCanvasShortcutCode(
	settings: CanvasShortcutSettings,
	id: CanvasShortcutSettingKey,
	code: string,
	index = 0,
): CanvasShortcutSettings {
	switch (id) {
		case "edit": return { ...settings, edit: replaceShortcutCode(settings.edit, code, index) }
		case "cancelSelection": return { ...settings, cancelSelection: replaceShortcutCode(settings.cancelSelection, code, index) }
		case "formatTitle": return { ...settings, formatTitle: replaceShortcutCode(settings.formatTitle, code, index) }
		case "deleteSelection": return { ...settings, deleteSelection: code }
		case "cycleColor": return { ...settings, cycleColor: code }
		case "moveNorth": return { ...settings, moveNorth: code }
		case "moveWest": return { ...settings, moveWest: code }
		case "moveSouth": return { ...settings, moveSouth: code }
		case "moveEast": return { ...settings, moveEast: code }
		case "extend": return { ...settings, extend: code }
		case "focus": return { ...settings, focus: code }
		case "zoom": return { ...settings, zoom: code }
		case "createEdge": return { ...settings, createEdge: code }
		case "compactLayout": return { ...settings, compactLayout: code }
		case "counter": return { ...settings, counter: code }
		case "splitList": return { ...settings, splitList: code }
		case "rotationNext": return { ...settings, rotationNext: code }
	}
}

function replaceShortcutCode(codes: readonly string[], code: string, index: number): string[] {
	const next = [...codes]
	if (index >= 0 && index < next.length) next[index] = code
	return next
}

function shortcutIdForSetting(id: CanvasShortcutSettingKey): CanvasShortcutId {
	return id === "moveNorth" || id === "moveWest" || id === "moveSouth" || id === "moveEast"
		? "directional"
		: id
}

function getOtherCodesInBinding(settings: CanvasShortcutSettings, id: CanvasShortcutSettingKey, index: number): string[] {
	if (id === "edit") return settings.edit.filter((_, slot) => slot !== index)
	if (id === "cancelSelection") return settings.cancelSelection.filter((_, slot) => slot !== index)
	if (id === "formatTitle") return settings.formatTitle.filter((_, slot) => slot !== index)
	if (id === "moveNorth" || id === "moveWest" || id === "moveSouth" || id === "moveEast") {
		return [
			["moveNorth", settings.moveNorth],
			["moveWest", settings.moveWest],
			["moveSouth", settings.moveSouth],
			["moveEast", settings.moveEast],
		]
			.filter(([slot]) => slot !== id)
			.map(([, code]) => code)
	}
	return []
}

export function normalizeCanvasShortcutSettings(value: unknown): CanvasShortcutSettings {
	const source = value && typeof value === "object" ? value as Partial<CanvasShortcutSettings> : {}
	const stringValue = (candidate: unknown, fallback: string): string =>
		typeof candidate === "string" && candidate.length > 0 ? candidate : fallback
	const stringArray = (candidate: unknown, fallback: string[]): string[] => {
		if (!Array.isArray(candidate)) return [...fallback]
		const result = candidate.filter((code): code is string => typeof code === "string" && code.length > 0)
		return result.length > 0 ? result : [...fallback]
	}
	const fixedStringArray = (candidate: unknown, fallback: string[], length: number): string[] => {
		if (!Array.isArray(candidate) || candidate.length !== length) return [...fallback]
		const result = candidate.filter((code): code is string => typeof code === "string" && code.length > 0)
		return result.length === length && new Set(result).size === length ? result : [...fallback]
	}

	return {
		edit: stringArray(source.edit, DEFAULT_CANVAS_SHORTCUT_SETTINGS.edit),
		deleteSelection: stringValue(source.deleteSelection, DEFAULT_CANVAS_SHORTCUT_SETTINGS.deleteSelection),
		cancelSelection: stringArray(source.cancelSelection, DEFAULT_CANVAS_SHORTCUT_SETTINGS.cancelSelection),
		cycleColor: stringValue(source.cycleColor, DEFAULT_CANVAS_SHORTCUT_SETTINGS.cycleColor),
		moveNorth: stringValue(source.moveNorth, DEFAULT_CANVAS_SHORTCUT_SETTINGS.moveNorth),
		moveWest: stringValue(source.moveWest, DEFAULT_CANVAS_SHORTCUT_SETTINGS.moveWest),
		moveSouth: stringValue(source.moveSouth, DEFAULT_CANVAS_SHORTCUT_SETTINGS.moveSouth),
		moveEast: stringValue(source.moveEast, DEFAULT_CANVAS_SHORTCUT_SETTINGS.moveEast),
		extend: stringValue(source.extend, DEFAULT_CANVAS_SHORTCUT_SETTINGS.extend),
		focus: stringValue(source.focus, DEFAULT_CANVAS_SHORTCUT_SETTINGS.focus),
		zoom: stringValue(source.zoom, DEFAULT_CANVAS_SHORTCUT_SETTINGS.zoom),
		createEdge: stringValue(source.createEdge, DEFAULT_CANVAS_SHORTCUT_SETTINGS.createEdge),
		compactLayout: stringValue(source.compactLayout, DEFAULT_CANVAS_SHORTCUT_SETTINGS.compactLayout),
		counter: stringValue(source.counter, DEFAULT_CANVAS_SHORTCUT_SETTINGS.counter),
		formatTitle: fixedStringArray(source.formatTitle, DEFAULT_CANVAS_SHORTCUT_SETTINGS.formatTitle, 10),
		splitList: stringValue(source.splitList, DEFAULT_CANVAS_SHORTCUT_SETTINGS.splitList),
		rotationNext: stringValue(source.rotationNext, DEFAULT_CANVAS_SHORTCUT_SETTINGS.rotationNext),
	}
}

export function formatShortcutCode(code: string): string {
	if (code === "Space") return "Space"
	if (code === "Escape") return "Esc"
	if (code.startsWith("Key")) return code.slice(3)
	if (code.startsWith("Digit")) return code.slice(5)
	return code
}
