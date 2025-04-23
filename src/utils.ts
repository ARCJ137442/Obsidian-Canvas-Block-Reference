import { MenuItem, App, FileView, ItemView, TFile, Menu, Notice } from "obsidian";
import { Canvas, CanvasEdge, CanvasElement, CanvasNode, CanvasView } from "obsidian/canvas";

/** 用于注册事件的参数类型 */
export type ParamEventRegister = {
	on: string | string[],
	callback: Function
}

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

/** 从白板或其元素中获得Canvas对象，以便和整个白板交互 */
export function getCanvasFromCCC(obj: Canvas | CanvasElement): Canvas {
	return (
		(obj as CanvasElement).canvas ?? // CanvasElement
		obj as Canvas // Canvas
	)
}

/** 从白板或其元素中获得APP，以便读写文件 */
export function getAppFromCCC(obj: Canvas | CanvasElement): App {
	return getCanvasFromCCC(obj).app
}

/**
 * 注册白板点击事件时，一般事件的范围
 */
export type ParamRegisterCanvasMenuItemWhenCanvasEvent = "canvas:edge-menu" | "canvas:node-menu" | "canvas:selection-menu"
export interface ParamRegisterCanvasMenuItemItem {
	/**
	 * 标题 | {@link MenuItem.setTitle}
	 * * 📌允许根据语言动态计算
	 */
	title?: string | ((menu: Menu) => string)

	/** 是否检查（❓） | {@link MenuItem.setChecked} */
	checked?: boolean | null

	/** 是否禁用 | {@link MenuItem.setDisabled} */
	disabled?: boolean

	/**
	 * 图标 | {@link MenuItem.setIcon}
	 * * 🔗具体参考 {@link MenuItem} 的`setIcon`
	 */
	icon?: string

	/** 是否标签（❓） | {@link MenuItem.setIsLabel} */
	isLabel?: boolean

	/** 所属小节（分组用） | {@link MenuItem.setSection} */
	section?: string

	/** 触发钩子：点击后会执行什么 */
	onClick?: (canvas: Canvas, item: MenuItem, event: KeyboardEvent | MouseEvent) => any
}

/** 注册白板右键菜单时，传入的函数参数 */
export interface ParamRegisterCanvasMenuItem {
	/**
	 * 在什么事件中注册菜单
	 */
	on: ParamRegisterCanvasMenuItemWhenCanvasEvent | ParamRegisterCanvasMenuItemWhenCanvasEvent[]
	/** 触发时构造的菜单选项 */
	item: ParamRegisterCanvasMenuItemItem | ParamRegisterCanvasMenuItemItem[]
}

/**
 * 用更方便的格式配置Obsidian白板右键菜单
 */
export const registerCanvasMenuItem = ({ on, item }: ParamRegisterCanvasMenuItem): ParamEventRegister => ({
	// 在白板中右键卡片、边或选中多个元素时，添加菜单项
	on,
	callback: (menu: Menu, toBeClick: Canvas | CanvasEdge | CanvasNode) => {
		// 一个或多个
		if (Array.isArray(item))
			for (const item1 of item)
				registerCanvasMenuItem$addMenuItem(menu, item1, toBeClick);
		else registerCanvasMenuItem$addMenuItem(menu, item, toBeClick);
	}
})
function registerCanvasMenuItem$addMenuItem(menu: Menu, paramItem: ParamRegisterCanvasMenuItemItem, toBeClick: Canvas | CanvasEdge | CanvasNode) {
	const {
		title, checked, disabled, icon, isLabel, section, onClick
	} = paramItem;
	menu.addItem((menuItem: MenuItem) => {
		// 注册各个属性
		title && menuItem.setTitle(typeof title === "function" ? title(menu) : title);
		checked && menuItem.setChecked(checked);
		disabled && menuItem.setDisabled(disabled);
		icon && menuItem.setIcon(icon);
		isLabel && menuItem.setIsLabel(isLabel);
		section && menuItem.setSection(section);
		// 注册钩子
		onClick && menuItem.onClick((event: KeyboardEvent | MouseEvent) => {
			const canvas = getCanvasFromCCC(toBeClick);
			if (!canvas) {
				new Notice(`${title}: Can't find the canvas instance`);
				return;
			}
			onClick(canvas, menuItem, event);
		});
	});
}

/**
 * 获取一个文件在Obsidian中的路径
 * * ✨相比于直接读取`path`属性，可以取到尽可能短的路径（而不总是完整路径）
 * * 📄参考Obsidian API：<https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache/fileToLinktext>
 *   * 💭从 [TFile的文档](https://docs.obsidian.md/Reference/TypeScript+API/TFile)找到的
 *   * 📝如果谷歌搜不到，那就试着直接看API（有可能问题都没问，就已经找完了）
 */
export function getFileLink(app: App, file: TFile): string {
	// ! 经过实践，是有的，而且内部的所有键都是文件名
	return app.metadataCache.fileToLinktext(file, file.path)
}


/**
 * 遍历所有选中的连边，包括间接选中的边（即：从选中的节点出发、目标节点同时也被选中的边）
 * * 📌若遍历过程涉及对节点边的操作（如转向），则仍有可能重复遍历
 */
export function traverseSelectedEdgesIncludesBetweens(canvas: Canvas, f: (e: CanvasEdge) => any) {
	// 遍历所有直接选中的连边
	for (const element of canvas.selection) {
		if (isCanvasEdge(element))
			f(element)
		// 节点：判断从其发出的边所接触的目标节点是否也被选中
		else if (isCanvasNode(element)) {
			// * 🚩从选中的节点中跟踪连边：遍历所有节点【发出】的连边，保证不会重复遍历
			for (const edge of canvas.getEdgesForNode(element)) {
				// 只获得发出的边——一个边只可能从一个节点发出，避免重复
				if (edge.from.node !== element) continue
				// 若目标节点也被选中，则处理
				if (canvas.selection.has(edge.to.node)) f(edge)
			}
		}
	}
}
