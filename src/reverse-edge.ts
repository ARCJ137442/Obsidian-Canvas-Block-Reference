/**
 * 反转白板所选连边
*
* ! 实验性：仅用于个人实验
* * ❗【2025-04-23 16:51:43】后续可能会独立出一个插件
*/

import { ZH_CN, EN_US } from './i18n';
import { App, MenuItem } from "obsidian";
import { Canvas, CanvasEdge, CanvasEdgeData } from "obsidian/canvas";
import { filteredDatasByKey, filterRepeatedDatasByKey, getActiveCanvasView, registerCanvasMenuItem, selectedEdgesIncludesBetweens, updateEdgeData } from "src/utils";
import { i18nText } from "./i18n";


/**
 * 注册事件：右键菜单复制选区内容链接
 * * 🔗参考：<https://forum.obsidian.md/t/creating-an-event-for-menus-on-canvas-items/85646/7>
 */
export const EVENT_reverseEdges = registerCanvasMenuItem({
	// 只有一个边
	on: ["canvas:edge-menu", "canvas:selection-menu"],
	item: {
		title: (_) => i18nText({
			[EN_US]: "Reverse selected edge(s)",
			[ZH_CN]: "反转所选连边",
		}),
		icon: "repeat", // https://lucide.dev/icons/repeat
		section: "action",
		onClick: (canvas: Canvas, _item: MenuItem, _event: KeyboardEvent | MouseEvent) => {
			/** 标记哪些边被转换过 */
			const turned: { [k: string]: boolean } = {}
			for (const e of selectedEdgesIncludesBetweens(canvas)) {
				// 已标记的边不再处理
				if (e.id in turned) return
				turned[e.id] = true
				reverseEdge(e)
			}
		}
	}
})

/** 对接外部插件 */
export const CMD_reverseSelectedCanvasEdges = (app: App) => ({
	id: 'reverse-selected-canvas-edge',
	name: i18nText({
		[EN_US]: 'Reverse Selected Canvas Edge',
		[ZH_CN]: '反转白板所选连边',
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

		// 获取边并反转
		/** 标记哪些边被转换过 */
		for (const e of filterRepeatedDatasByKey(selectedEdgesIncludesBetweens(canvas), (e: CanvasEdge) => e.id))
			// 已标记的边不再处理
			reverseEdge(e)

		// This command will only show up in Command Palette when the check function returns true
		return true;
	}
})


/** 反转选取内的边对象 */
export function reverseSelectedEdges(canvas: Canvas): void {
	for (const e of filteredDatasByKey(selectedEdgesIncludesBetweens(canvas), e => e.id))
		// 已标记的边不再处理
		// 遍历选择的边
		reverseEdge(e)
}

/** 反转一个边对象 */
export function reverseEdge(e: CanvasEdge): void {
	updateEdgeData(e, reverseEdgeData(e.getData()))
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
