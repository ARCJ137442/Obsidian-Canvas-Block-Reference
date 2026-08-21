/**
 * 编辑：
 *
 * ! 实验性：仅用于个人实验
 * * ❗【2025-04-23 16:51:43】后续可能会独立出一个插件
 */

import { ZH_CN, EN_US } from './i18n';
import { App, MenuItem, Modal, Notice, Setting, TextComponent } from "obsidian";
import { Canvas, CanvasEdge, CanvasEdgeData, CanvasElement, CanvasElementData } from "obsidian/canvas";
import { getActiveCanvasView, isCanvasEdge, isCanvasNode, registerCanvasMenuItem } from "src/utils";
import { i18nText } from "./i18n";
import { commitCanvasMutation } from "./canvas-mutations";
import { normalizeCanvasElementId, validateCanvasElementId } from "./canvas-id";

/**
 * 注册事件：右键菜单复制选区内容链接
 * * 🔗参考：<https://forum.obsidian.md/t/creating-an-event-for-menus-on-canvas-items/85646/7>
 */
export const EVENT_changeElementID = registerCanvasMenuItem({
	// 只有一个边
	on: ["canvas:edge-menu", "canvas:node-menu"],
	item: {
		title: (_) => i18nText({
			[EN_US]: "Change Selected Element's ID",
			[ZH_CN]: '修改所选元素ID',
		}),
		icon: "pencil-line", // https://lucide.dev/icons/repeat
		section: "action",
		onClick: (canvas: Canvas, _item: MenuItem, _event: KeyboardEvent | MouseEvent) =>
			changeSelectedElementIdWithUI(canvas),
	}
})

/** 对接外部插件 */
export const CMD_changeElementID = (app: App) => ({
	id: 'change-canvas-element-id',
	name: i18nText({
		[EN_US]: "Change Selected Canvas Element's ID",
		[ZH_CN]: '修改白板所选元素ID',
	}),
	checkCallback(checking: boolean) {
		// Conditions to check
		const result = getActiveCanvasView(app);
		if (!result) return;

		// If checking is true, we're simply "checking" if the command can be run.
		if (checking) return true;
		// If checking is false, then we want to actually perform the operation.

		// Copy card reference
		const { canvas } = result

		// 开始修改
		changeSelectedElementIdWithUI(canvas)

		// This command will only show up in Command Palette when the check function returns true
		return true;
	}
})

/**
 * 重命名所选单个元素的id（带UI）
 * * 🚩使用{@link Canvas.selection}获取所选的元素
 */
export function changeSelectedElementIdWithUI(canvas: Canvas) {
	// 尝试获取选中的元素
	const selected = canvas.selection.values().next().value
	if (!selected) {
		new Notice(i18nText({
			[EN_US]: "No canvas node/edge selected",
			[ZH_CN]: "未选择任何节点或连边",
		}))
		return
	}
	// 重命名
	changeElementIdWithUI(selected)
}

/**
 * 重命名单个元素的id（带UI）
 * * 🚩使用弹窗获取新元素id
 */
export function changeElementIdWithUI<D extends CanvasElementData>(element: CanvasElement<D>) {
	// 获取新的Id
	new class extends Modal {
		/** 缓存的数据：新ID */
		newID: string

		constructor(
			protected element: CanvasElement,
		) {
			super(element.canvas.app);
			this.newID = element.id
		}

		onOpen() {
			const { contentEl } = this;

			contentEl.createEl("h1", {
				text: i18nText({
					[EN_US]: "Change Element ID",
					[ZH_CN]: '修改元素ID',
				})
			});

			contentEl.createEl("p", {
				text: i18nText({
					[EN_US]: '⚠️2025-04-23 WARNING: This feature is experimental, currently only the id of a single node can be modified, and the links cannot be traced back to modify other places',
					[ZH_CN]: '⚠️2025-04-23 注意：该功能为实验性功能，目前只能修改单个节点的id，暂时无法溯源修改其它地方的链接',
				})
			});

			new Setting(contentEl).setName(i18nText({
				[EN_US]: "New ID",
				[ZH_CN]: '新ID',
			})).addText((text: TextComponent) => {
				text.setValue(this.newID).onChange((value) => {
					this.newID = value;
				})
			}); // ! ❌【2025-04-23 23:38:42】目前暂时无法让回车直接指向按钮（回车→直接修改）

			// 提交按钮
			new Setting(contentEl).addButton((btn) => btn
				.setButtonText(i18nText({
					[EN_US]: "Change",
					[ZH_CN]: '修改',
				}))
				.setCta()
				.onClick(() => {
					const oldID = element.id
					const newID = normalizeCanvasElementId(this.newID)
					if (!changeElementId<D>(element, newID)) return
					// 校验通过后关闭弹窗
					this.close();
					// 弹出通知
					new Notice(i18nText({
						[EN_US]: `Element ID changed from "${oldID}" to "${newID}"`,
						[ZH_CN]: `元素ID从"${oldID}"改为"${newID}"`,
					}))
				})
			);
		}

		onClose() {
			// 清空UI
			let { contentEl } = this;
			contentEl.empty();
		}
	}(element).open() // 打开UI
}


/**
 * 重命名单个元素的id
 * * 后续可能包括其它「后处理」逻辑
 */
export function changeElementId<D extends CanvasElementData>(element: CanvasElement<D>, newId: string) {
	const normalizedId = normalizeCanvasElementId(newId)
	const validationError = validateCanvasElementId(
		normalizedId,
		element.id,
		[...element.canvas.nodes.keys(), ...element.canvas.edges.keys()],
	)
	if (validationError === "empty") {
		new Notice(i18nText({
			[EN_US]: "Element ID cannot be empty",
			[ZH_CN]: "元素ID不能为空",
		}))
		return false
	}
	if (validationError === "duplicate") {
		new Notice(i18nText({
			[EN_US]: `Element ID already exists: "${normalizedId}"`,
			[ZH_CN]: `元素ID已存在："${normalizedId}"`,
		}))
		return false
	}
	if (normalizedId === element.id) return true

	// 改变元素的id，并把保存/历史请求纳入统一事务
	return commitCanvasMutation(element.canvas, () => _changeElementId<D>(element, normalizedId), { refresh: false })
}

/**
 * 重命名单个元素的id
 * * ⚠️除了重命名，不会干任何东西（会影响别处的链接）
 */
export function _changeElementId<D extends CanvasElementData>(element: CanvasElement<D>, newId: string) {
	// 先修改索引
	const canvas = element.canvas
	// @ts-ignore
	const elementMap: Map<string, CanvasElement<D>> | undefined = (
		isCanvasNode(element) ? canvas.nodes :
			isCanvasEdge(element) ? canvas.edges :
				undefined
	)
	if (!elementMap) {
		console.warn(`[CanvasReferencePlugin] changeElementId: unknown element type`, element)
		return false
	}

	// 在相应映射中修改id
	elementMap.delete(element.id)
	elementMap.set(newId, element)

	// 更改id
	element.id = newId
	return true
}
