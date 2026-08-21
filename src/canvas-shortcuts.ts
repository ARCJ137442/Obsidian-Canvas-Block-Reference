/**
 * 白板快捷键的集中定义。
 *
 * 这里先保存默认快捷键与匹配逻辑，后续设置界面可以直接把默认值替换为
 * 用户配置，而不需要再在功能实现中散落修改修饰键判断。
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

export const CANVAS_SHORTCUTS = {
	edit: { keys: [" ", "Enter"], shift: false, ctrl: false, alt: false, meta: false },
	deleteSelection: { keys: ["x"], shift: false, ctrl: false, alt: false, meta: false },
	cancelSelection: { keys: ["q", "Escape"], shift: false, ctrl: false, alt: false, meta: false },
	cycleColor: { codes: ["KeyC"], shift: "any", ctrl: false, alt: false, meta: false },
	directional: { codes: ["KeyW", "KeyA", "KeyS", "KeyD"], shift: "any", ctrl: false, alt: false, meta: false },
	extend: { codes: ["KeyE"], shift: false, ctrl: false, alt: false, meta: false },
	focus: { codes: ["KeyF"], shift: false, ctrl: false, alt: false, meta: false },
	zoom: { codes: ["KeyZ"], shift: "any", ctrl: false, alt: false, meta: false },
	createEdge: { codes: ["KeyR"], shift: true, ctrl: false, alt: false, meta: false },
	compactLayout: { codes: ["KeyE"], shift: true, ctrl: true, alt: true, meta: false },
	counter: { codes: ["KeyY"], shift: "any", ctrl: false, alt: false, meta: false },
	formatTitle: { codePattern: /^Digit[0-9]$/, shift: false, ctrl: false, alt: "any", meta: false },
	splitList: { codes: ["KeyK"], shift: true, ctrl: false, alt: false, meta: false },
} as const

export type CanvasShortcutId = keyof typeof CANVAS_SHORTCUTS

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

const CANVAS_SHORTCUT_ORDER: CanvasShortcutId[] = [
	"edit", "deleteSelection", "cancelSelection", "cycleColor", "directional",
	"extend", "focus", "zoom", "createEdge", "compactLayout", "counter",
	"formatTitle", "splitList",
]

/** 返回当前事件对应的插件快捷键；未命中时返回 undefined。 */
export function getCanvasShortcutId(
	event: Pick<KeyboardEvent, "key" | "code" | "shiftKey" | "ctrlKey" | "altKey" | "metaKey">,
): CanvasShortcutId | undefined {
	for (const id of CANVAS_SHORTCUT_ORDER) {
		if (matchesCanvasShortcut(event, CANVAS_SHORTCUTS[id])) return id
	}
	return undefined
}
