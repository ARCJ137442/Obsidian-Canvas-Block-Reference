import type { App } from "obsidian"
import type { Canvas } from "obsidian/canvas"

/**
 * 从事件所属的 DOM 树解析 Canvas，而不是从 App 的 active view 猜测。
 *
 * Obsidian 的独立窗口拥有自己的 Document；通过所有 workspace leaf 的
 * containerEl 判断归属，可以让主窗口、分栏和 popout 使用同一个解析路径。
 */
export function getCanvasFromEvent(app: App, event: Event): Canvas | undefined {
	const targets = getEventTargets(event)
	let result: Canvas | undefined

	app.workspace.iterateAllLeaves(leaf => {
		if (result) return
		const view = leaf.view as (typeof leaf.view & {
			canvas?: Canvas
			containerEl?: HTMLElement
		}) | null
		if (!view || view.getViewType() !== "canvas" || !view.canvas || !view.containerEl) return
		if (targets.some(target => isInsideContainer(view.containerEl!, target))) {
			result = view.canvas
		}
	})

	return result
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
