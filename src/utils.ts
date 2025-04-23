import { CanvasElement, CanvasNode } from "obsidian/canvas";

/**
 * 功能：判断白板内元素是否为节点（一般来说，不然为边）
 */
export function isCanvasNode(element: CanvasElement): element is CanvasNode {
	return 'x' in element && 'y' in element;
}

/**
 * 功能：获得白板节点的展示文本
 */
export function getCanvasElementTitle(_element: CanvasElement): string | null {
	let element: any = _element // 骗过类型检查器
	return (
		// 文本节点 text
		element?.text
		// 组节点 label
		?? element?.label
		// 链接节点 url
		?? element.url
		// 文件节点 【暂无】
		?? (element.label ?? '')
		// 连边 label
		?? null
	)
}
