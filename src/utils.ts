import { App, FileView, ItemView, TFile } from "obsidian";
import { Canvas, CanvasEdge, CanvasElement, CanvasNode, CanvasView } from "obsidian/canvas";

/**
 * 功能：判断白板内元素是否为节点
 * * 🚩因为Obsidian API没有提供canvas的类，因此暂时使用属性来判断
 */
export function isCanvasNode(element: CanvasElement): element is CanvasNode {
	return 'x' in element && 'y' in element;
}
/**
 * 功能：判断白板内元素是否为连边
 * * 🚩因为Obsidian API没有提供canvas的类，因此暂时使用属性来判断
 */
export function isCanvasEdge(element: CanvasElement): element is CanvasEdge {
	return 'from' in element && 'to' in element;
}

/**
 * 功能：获得白板元素的展示文本
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

/**
 * 根据id获取白板元素（节点/连边）
 */
export function getCanvasElementById(canvas: Canvas, id: string): CanvasElement | undefined {
	return canvas.nodes.get(id) ?? canvas.edges.get(id)
}

export function isCanvasView(view: ItemView | null | undefined): view is CanvasView {
	return view?.getViewType() === "canvas"
}

/**
 * 获取当前窗口正在使用的白板（若有）
 */
export function getActiveCanvasView(app: App): {
	view: CanvasView, // 实际上可通过 canvas.view 拿到
	canvas: Canvas, // 实际上可通过 view.canvas 拿到
	file: TFile | null, // 实际上可通过 view.file 拿到
} | undefined {
	// Conditions to check
	// 可以使用「文件视图」，经过了 app.workspace.getActiveViewOfType(Object.getPrototypeOf(canvas.view)) !== null 的测试
	const view = app.workspace.getActiveViewOfType(FileView);
	if (!isCanvasView(view)) return;

	// Get the current canvas
	const canvas: Canvas = view.canvas;
	const file = view.file; // * 💭既然打开了文件，那么file应该不为空

	// 返回
	return { view, file, canvas }
}
