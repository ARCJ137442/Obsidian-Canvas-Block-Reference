import { CanvasNodeData } from 'obsidian/canvas';
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

	// Get the path of file
	const path: string | undefined = file?.path  // * 💭【2025-04-20 16:02:40】这里的路径可以优化——只使用文件名
	if (!path) {
		console.error("copyCanvasCardReference: can't get file's path", file);
		return;
	}

	// Get the selected node
	const selection: Set<CanvasNodeData> = canvas.selection;
	console.debug("copyCanvasCardReference: selection", selection)

	// Get the first node
	let text = "";
	for (const node of selection.values())
		// 支持多个节点
		text += "\n" + generateLinkFromCanvasNode(path, node);

	// Copy to clipboard
	copyToClipboard(text.slice(1)); // 移除开头的换行符
}

/** 生成文件路径链接 */
const generateLinkFromCanvasNode = (path: string, node: CanvasNodeData) => (
	`[[${path}#^${node.id}]]`
)

/** 🎯封装逻辑，以便日后更改 */
function copyToClipboard(text: string) {
	navigator.clipboard.writeText(text);
}
