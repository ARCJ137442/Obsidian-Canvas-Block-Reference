/**
 * 反转白板中选中的边
 *
 * ! 实验性：仅用于个人实验
 * * ❗【2025-04-23 16:51:43】后续可能会独立出一个插件
 */

import { App } from "obsidian";
import { CanvasEdge, CanvasEdgeData } from "obsidian/canvas";
import { getActiveCanvasView, isCanvasEdge } from "src/utils";

/** 对接外部插件 */
export const CMD_reverseSelectedCanvasEdges = (app: App) => ({
	id: 'reverse-selected-canvas-edge',
	name: 'Reverse Selected Canvas Edge',
	checkCallback(checking: boolean) {
		// Conditions to check
		const result = getActiveCanvasView(app);
		if (!result) return;

		// If checking is true, we're simply "checking" if the command can be run.
		if (checking) return true;
		// If checking is false, then we want to actually perform the operation.

		// Copy card reference
		const { canvas } = result

		// 获取所有选中的连边
		for (const element of canvas.selection) {
			if (isCanvasEdge(element))
				// 反转
				reverseEdge(element)
		}

		// This command will only show up in Command Palette when the check function returns true
		return true;
	}
})

/** 反转一个边对象 */
export function reverseEdge(e: CanvasEdge): void {
	// 获取一个data对象（与e引用解绑）
	const data = e.getData();
	// 反转之
	reverseEdgeData(data)
	// 设置回去
	e.setData(data)
}

/**
 * 反转后的数据：修改并返回修改后的数据
 * * 🚩实质上就是交换变量的值
 */
export function reverseEdgeData(data: CanvasEdgeData): CanvasEdgeData {
	// ! ❌【2025-04-23 17:02:15】不能直接用解构赋值：逐条赋值会产生读写冲突，必须显式强调「临时缓存」
	const { // 📝ES6的对象解构赋值，必须要用括号括起，与此同时前边要有分号
		toNode: fromNode,
		toSide: fromSide,
		toEnd: fromEnd,
		fromNode: toNode,
		fromSide: toSide,
		fromEnd: toEnd
	} = data;

	// 再赋值回去
	data.toNode = toNode;
	data.toSide = toSide;
	data.toEnd = toEnd;
	data.fromNode = fromNode;
	data.fromSide = fromSide;
	data.fromEnd = fromEnd;

	return data
}
