/**
 * 可通过快捷键调用的命令
 * * 白板中复制卡片引用
 */

import { App, ItemView } from 'obsidian';

/** 对接外部插件 */
export const CMD_copyCanvasCardReference = (app: App) => ({
	id: 'copy-canvas-card-reference',
	name: 'Copy Canvas Card Reference',
	checkCallback(checking: boolean) {
		// Conditions to check
		const canvasView = app.workspace.getActiveViewOfType(ItemView);
		if (canvasView?.getViewType() === "canvas") { } else return;

		// If checking is true, we're simply "checking" if the command can be run.
		if (checking) return true;
		// If checking is false, then we want to actually perform the operation.

		// Copy card reference
		copyCanvasCardReference(canvasView);

		// This command will only show up in Command Palette when the check function returns true
		return true;
	}
})

/**
 * 实际功能：复制白板中卡片的引用
 * * ✨配合「链接自动重定向」使用
 * * 📜原先只对「选择了单个卡片」有用
 *   * 💡或许也可以对多个有用，只需一个复制一行
 * * 💡复制时通知（类似Git的扩展→可以去找）
 */
function copyCanvasCardReference(canvasView: ItemView) {
	// Get the current canvas
	// @ts-ignore
	const { canvas, file } = canvasView;

	// Get the selected node
	const selection = canvas.selection;
	console.debug("copyCanvasCardReference: selection", selection)
	if (selection.size !== 1) return; // 若选择了多于一个，则不执行

	// Get the first node
	const node = selection.values().next().value;
	// ↓测试
	try { for (const node of selection.values()) console.debug('copyCanvasCardReference: try to iterate node:', node) } catch (e) { console.error(e) }
	const text = `[[${file?.path}#^${node.id}]]`;

	// Copy to clipboard
	copyToClipboard(text);
}

/** 🎯封装逻辑，以便日后更改 */
function copyToClipboard(text: string) {
	navigator.clipboard.writeText(text);
}
