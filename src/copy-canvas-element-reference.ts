/**
 * 可通过快捷键调用的命令
 * * 白板中复制卡片引用
 *
 * TODO: 💡【2025-04-23 16:02:00】基于已发现的canvas API，可以通过特定格式的「坐标链接」来实现「复制坐标链接」与「跳转到指定坐标」的功能
 *
 * 📌通知功能`Notice`参考自 <https://github.com/Vinzent03/obsidian-git>
 */

import { Canvas, CanvasEdge, CanvasElement, CanvasNode } from 'obsidian/canvas';
import { App, Menu, MenuItem, Notice, TFile } from 'obsidian';
import { getActiveCanvasView, getCanvasElementTitle, isCanvasNode, ParamEventRegister } from './utils';

/**
 * 注册事件：右键菜单复制选区内容
 * * 🔗参考：<https://forum.obsidian.md/t/creating-an-event-for-menus-on-canvas-items/85646/7>
 */
export const EVENT_copyCanvasCardReferenceMenu: ParamEventRegister = {
	// 在白板中右键卡片、边或选中多个元素时，添加菜单项
	on: ["canvas:edge-menu", "canvas:node-menu", "canvas:selection-menu"],
	callback: (menu: Menu, toBeClick: Canvas | CanvasEdge | CanvasNode) => {
		menu.addItem((item: MenuItem) => {
			item.setTitle("Copy link(s) of selected items in canvas")
				.setIcon("link")
				.setSection('action')
				.onClick((_event: unknown) => {
					const app = getAppFromCCC(toBeClick);
					if (!app) {
						new Notice("copyCanvasCardReferenceMenu: Can't find the app instance");
						return;
					}

					// Conditions to check
					const result = getActiveCanvasView(app);
					if (!result) return;

					// Copy card reference
					const { canvas, file } = result
					copyCanvasCardReference(canvas, file);
				})
		})
	}
}

/** 从白板或其元素中获得APP，以便读写文件 */
function getAppFromCCC(obj: Canvas | CanvasElement): App {
	return (
		(obj as Canvas)?.app ?? // Canvas
		(obj as CanvasElement).canvas.app // CanvasElement
	)
}

/** 对接外部插件 */
export const CMD_copyCanvasCardReference = (app: App) => ({
	id: 'copy-canvas-card-reference',
	name: 'Copy Canvas Card Reference',
	checkCallback(checking: boolean) {
		// Conditions to check
		const result = getActiveCanvasView(app);
		if (!result) return;

		// If checking is true, we're simply "checking" if the command can be run.
		if (checking) return true;
		// If checking is false, then we want to actually perform the operation.

		// Copy card reference
		const { canvas, file } = result
		copyCanvasCardReference(canvas, file);

		// This command will only show up in Command Palette when the check function returns true
		return true;
	}
})

/**
 * 实际功能：复制白板中卡片的引用
 * * ✨配合「链接自动重定向」使用
 * * 📜原先只对「选择了单个卡片」有用
 *   * ✨【2025-04-20 16:23:55】现对多个有用，只需一个复制一行
 * * 💡复制时通知（类似Git的扩展→可以去找）
 */
function copyCanvasCardReference(canvas: Canvas, file: TFile | null): void {
	// Get the path of file
	const path: string | undefined = file?.path  // * 💭【2025-04-20 16:02:40】这里的路径可以优化——只使用文件名
	if (!path) {
		console.error("copyCanvasCardReference: can't get file's path", file);
		return;
	}

	// Get the selected node
	const selection = canvas.selection;
	if (selection.size === 0) {
		new Notice("No canvas node/edge selected");
		return;
	}

	// Get the first node
	let text = "";
	for (const node of selection.values())
		// 支持多个节点
		text += "\n" + generateLinkFromCanvasNode(path, node);

	// Copy to clipboard
	copyToClipboard(text.slice(1)); // 移除开头的换行符

	// If copied, notice
	new Notice(generateNoticeOnCopied(selection, path));
}

/** 生成文件路径链接 */
const generateLinkFromCanvasNode = (path: string, element: CanvasElement) => (
	`[[${path}#^${element.id}]]`
)

/** 🎯封装逻辑，以便日后更改 */
function copyToClipboard(text: string) {
	navigator.clipboard.writeText(text);
}

/** 标题预览最长的长度（字符） */
const MAX_TITLE_PREVIEW_LENGTH = 10

/** 生成通知信息 */
function generateNoticeOnCopied(elements: Set<CanvasElement>, path: string): string {
	let text = `${path}: Path${elements.size > 1 ? 's' : ''} of ${elements.size} canvas blocks ${elements.size > 1 ? 'are' : 'is'} copied to clipboard!`
	// 节点信息
	let i = 0
	for (const element of elements.values()) {
		// 追加
		text += `\n${++i}. `
		text += isCanvasNode(element) ? `Node` : `Link`
		text += ` ^${element.id}`
		let title = getCanvasElementTitle(element)
		if (title) {
			// 缩减标题
			if (title.length > MAX_TITLE_PREVIEW_LENGTH)
				title = `${title.slice(0, MAX_TITLE_PREVIEW_LENGTH)}...`
			// 换掉换行符
			title = title.replace(/\r?\n/g, ' ')
			text += `\n    with content \"${title}\"`
		}
		if (isCanvasNode(element))
			text += `\n    @ (${element.x},${element.y})`
	}
	// 文件信息
	return text
}
