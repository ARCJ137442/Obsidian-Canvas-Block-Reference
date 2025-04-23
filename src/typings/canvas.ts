import { App, FileView, View, WorkspaceLeaf } from 'obsidian';
declare module "obsidian/canvas" {

	/** 一个矩形区域 */
	interface BoundedBox {
		minX: number
		minY: number
		maxX: number
		maxY: number
	}

	/** 白板中的元素，可以是节点 也可以是边 */
	class CanvasElement {
		/** id */
		id: string

		/** 碰撞箱 */
		bbox: BoundedBox
		getBBox(): BoundedBox

		/** 颜色 */
		color: string

		// 反向引用
		canvas: Canvas

		/**
		 * 选中该元素
		 * * ⚠️执行后白板不会响应，建议使用`Canvas.select`代替
		*/
		select(): void
		/**
		 * 取消选中该元素
		 * * ⚠️执行后白板不会响应，建议使用`Canvas.deselect`代替
		*/
		deselect(): void
		/**
		 * 聚焦该元素（eg.使之可编辑）
		 * * ⚠️执行后白板不会响应，建议使用`Canvas.focus`代替
		 */
		focus(): void
	}

	/** 一个白板节点/卡片 */
	class CanvasNode extends CanvasElement {
		// 反向引用
		app: App

		x: number
		y: number
		width: number
		height: number

		/** 构造函数 */
		constructor(canvas: Canvas, id: string)

		/** 获取JSON形式的数据 */
		getData(): CanvasNodeData
		/**
		 * 设置JSON形式的数据
		 * * 📌立马更新
		 */
		setData(data: CanvasNodeData): void

		// 批量添加的属性
		unknownData: object
		initialized: boolean
		zIndex: number
		aspectRatio: number
		isEditing: boolean
		destroyed: boolean
		renderedZIndex: number
		nodeEl: object
		isContentMounted: boolean
		alwaysKeepLoaded: boolean
		resizeDirty: boolean
		setIsEditing: Function
		initialize: Function
		containerEl: object
		contentEl: object
		contentBlockerEl: object
		placeholderEl: object
		child: object
		setText: Function
		render: Function
		showMenu: Function
		convertToFile: Function
		blur: Function
		destroy: Function
		unloadChild: Function
		startEditing: Function
		isEditable: Function
		onClick: Function
		onResizeDblclick: Function
		moveAndResize: Function
		attach: Function
		preDetach: Function
		detach: Function
		updateBreakpoint: Function
		mountContent: Function
		unmountContent: Function
		setColor: Function
		moveTo: Function
		resize: Function
		updateZIndex: Function
		renderZIndex: Function
		onPointerdown: Function
		onContextMenu: Function
		onResizePointerdown: Function
		onConnectionPointerdown: Function
		getConnectedFiles: Function
	}

	/** 一个白板连线/边 */
	class CanvasEdge extends CanvasElement {
		/** 边上的标签 */
		label: string | undefined

		from: {
			node: CanvasNode,
			side: 'up' | 'down' | 'left' | 'right',
			end: 'none' | 'arrow' | unknown
		}
		to: {
			node: CanvasNode,
			side: 'up' | 'down' | 'left' | 'right',
			end: 'none' | 'arrow' | unknown
		}

		/** 获取JSON形式的数据 */
		getData(): CanvasEdgeData
		/**
		 * 设置JSON形式的数据
		 * * 📌立马更新
		 */
		setData(data: CanvasEdgeData): void

		// 批量添加的属性
		unknownData: object
		initialized: boolean
		lineGroupEl: object
		lineEndGroupEl: object
		render: Function
		getCenter: Function
		initialize: Function
		path: object
		bezier: object
		fromLineEnd: object
		toLineEnd: object
		center: undefined
		attach: Function
		detach: Function
		destroy: Function
		setColor: Function
		setLabel: Function
		update: Function
		blur: Function
		editLabel: Function
		updatePath: Function
		createEdgeEnd: Function
		onClick: Function
		onContextMenu: Function
		showMenu: Function
		onConnectionPointerdown: Function
	}

	/**
	 * 在`Canvas.createXXXXNode`函数的`position`参数中，所使用的值
	 * * 📌白板的哪个边靠近其`pos`参数，就代表哪个位置
	 * * 📄使用`center`，则新生成节点的中心就是`pos`所在位置
	 * * 📄使用`left`，则新生成节点的左边界就压着`pos`所在位置
	 */
	type ParamCanvasCreateNodePosition = "center" | "left" | "top" | "right" | "bottom"

	/**
	 * 在`Canvas.createXXXXNode`函数的`param`参数中，所使用的值
	 *
	 * 📝获知参数类型的方法论：开发者工具通过「直接运行→报错堆栈→app.js溯源」得到源码（混淆后）
	 * * 🚩对于有参函数，直接调用`func()`得到类似`app.js:1 Uncaught TypeError: Cannot read properties of undefined (reading 'pos')`的文本
	 * * ✅即便是混淆后的代码，也有「参数提取」的步骤，以此便能确认object内部的参数
	 *
	 * 📄从开发者工具得到的源码：
	 * ```
	 *  e.prototype.createTextNode = function(e) {
			var t = e.pos
				, n = e.size
				, i = e.position
				, r = e.text
				, o = e.save
				, a = e.focus
				, s = new v$(this);
			return n || (n = this.config.defaultTextNodeDimensions),
			s.moveAndResize(sX(t, n, i)),
			r && s.setText(r),
			this.addNode(s),
			!1 !== o && this.requestSave(),
			!1 !== a && (s.attach(),
			s.render(),
			this.selectOnly(s),
			s.startEditing()),
			s
		}
		```
	 */
	interface ParamCanvasCreateNode {
		/** 坐标（必选） */
		pos: { x: number, y: number }
		/** 尺寸（长宽，否则使用默认尺寸） */
		size?: { width: number, height: number }
		/** 卡片相对于pos的位置（哪个地方压着pos，默认左上角） */
		position?: ParamCanvasCreateNodePosition
		/** 创建之后立马保存 */
		save: boolean
		/** 创建之后立马聚焦（开始编辑） */
		focus: boolean
	}

	interface ParamCanvasCreateTextNode extends ParamCanvasCreateNode {
		/** 内部文本 */
		text: string
	}

	interface ParamCanvasCreateFileNode extends ParamCanvasCreateNode {
		/** 链接到的文件 */
		file: File
		/** 文件内的路径 */
		subpath: string
	}

	interface ParamCanvasCreateLinkNode extends ParamCanvasCreateNode {
		/** 网页链接 */
		url: string
	}

	interface ParamCanvasCreateGroupNode extends ParamCanvasCreateNode {
		/** 分组节点的标签名 */
		label: string
	}

	abstract class CanvasView extends FileView {
		/** 白板视图中的当前白板 */
		canvas: Canvas
	}

	/**
	 * Obsidian中存储数据和方法的白板对象
	 * * 📄对应`leaf.view?.canvas`，这儿的Leaf是{@link WorkspaceLeaf}，`leaf.view`对应{@link View}
	 * * ✨控制白板：移动视图、选择/取消 节点の选择
	 * * ✨获取白板信息：所有节点
	 *
	 * 📝从Obsidian窗口中开发者工具for-in出来属性，填充类型注释
	 * * 📄命令形式（对于c）：`for (const i in c) console.log(i, ':',typeof c[i],'=',c[i])`
	 * * 📄函数形式：`function logKeys(c) { for (const i in c) console.log(`${i}:`, typeof c[i],'=',c[i]) }`
	 * * 📄字符串形式（用于类型注释）：`function getKeys(c) { let s = ''; for (const i in c) s += `${i}: ${typeof c[i]}\n`.replace('function', 'Function'); return s }`
	 */
	interface Canvas {
		// 反向引用
		app: App

		nodes: Map<string, CanvasNode>
		edges: Map<string, CanvasEdge>

		view: View
		data: CanvasData

		/** 当前视图中心的x坐标 */
		x: number
		/** 当前视图中心的y坐标 */
		y: number
		/** 当前视图中心的缩放（不是比例，有正负） */
		zoom: number
		/** 当前视图缩放中心（❓） */
		zoomCenter: {
			x: number,
			y: number
		}

		/** 白板配置（具体使用方式未知） */
		config: {
			zoomMultiplier: number
			objectSnapDistance: number
			minContainerDimension: number
			defaultTextNodeDimensions: {
				width: number
				height: number
			},
			defaultFileNodeDimensions: {
				width: number
				height: number
			}
		}
		tx: number
		ty: number

		// 移动相关 //

		/** 将选区聚焦在选中的节点上 */
		zoomToSelection(): void
		/** 将选区聚焦在所有节点上 */
		zoomToFit(): void
		/** 将选区聚焦在「上下左右」的矩形区域 */
		zoomToBbox(bbox: BoundedBox): void
		/** 调整选区比率：负数拉远，正数拉近，1为100%倍数 */
		zoomBy(dZoom: number): void
		/** 将选区移动到某个中心点 */
		panTo(x: number, y: number): void
		/** 选区位移 */
		panBy(dx: number, dy: number): void

		/** 获取白板数据（JSON） */
		getData(): CanvasData
		/** 设置白板数据（JSON） */
		setData(data: CanvasData): CanvasData

		/** 
		 * 为白板节点获取连边
		 * * ⚠️不仅仅有发出的边，还有收到的边
		 */
		getEdgesForNode(node: CanvasNode): CanvasEdge[]


		/** 当前所见区域截图 */
		takeScreenshot(pngPath: string): void


		/**
		 * ⚠️【危险】彻底清空白板
		 *
		 * ! 包括历史记录
		 * * 📝清空之后不会立即保存到文件，此时文件的内容还在
		 */
		clear(): void

		/** 添加一个「节点对象」（暂时没弄懂） */
		addNode(_: unknown): void
		/** 添加一个「节点对象」 */
		removeNode(...args: CanvasNode[]): void

		// 选择

		/** 选择一个元素（节点/边） */
		select(node: CanvasElement): void
		/** 取消选择一个元素（节点/边） */
		deselect(node: CanvasElement): void
		/** 只选择一个（取消其它选择） */
		selectOnly(node: CanvasElement): void
		/** 切换选择（若有→无，若无→有） */
		toggleSelect(node: CanvasElement): void
		/** 选择所有 */
		selectAll(): void
		/** 取消选择所有 */
		deselectAll(): void
		/** 删除选中的元素 */
		deleteSelection(): void
		/** 当前正选择着的元素 */
		selection: Set<CanvasElement>

		/**
		 * 在白板中创建文本节点
		 * * 创建之后立马显示
		 * * 参数含义参见 {@link ParamCanvasCreateNode}
		 */
		createTextNode(param: ParamCanvasCreateNode): CanvasNode

		/**
		 * 创建文件节点
		 * * 创建之后立马显示
		 */
		createFileNode(param: ParamCanvasCreateFileNode): CanvasNode

		/**
		 * 创建网页节点（链接）
		 * * 创建之后立马显示
		 */
		createLinkNode(param: ParamCanvasCreateLinkNode): CanvasNode

		/**
		 * 创建分组节点
		 * * 创建之后立马显示
		 */
		createGroupNode(param: ParamCanvasCreateGroupNode): CanvasNode

		/** 在屏幕中央创建一个占位符，用于白板无节点时（「下方拖动或双击」） */
		createPlaceholder(): void

		// 还未理解的属性
		zIndexCounter: number
		isHoldingSpace: boolean
		readonly: boolean
		scale: number
		tZoom: number
		finishViewportAnimation: boolean
		zoomToFitQueued: boolean
		screenshotting: boolean
		selectionChanged: boolean
		isDragging: boolean
		viewportChanged: boolean
		frame: number
		wasAnimating: boolean
		pauseAnimation: number
		pointerFrame: number
		lockedZoom: number
		lockedX: number
		lockedY: number

		// ❓复杂对象（还未理解）
		history: object
		nodeIndex: object
		edgeIndex: object
		edgeFrom: object
		edgeTo: object
		staleSelection: object
		keys: object
		moved: object
		dirty: object
		lastNodesInViewport: object
		lastEdgesInViewport: object
		pointer: object
		menu: object
		wrapperEl: object
		backgroundPatternEl: object
		moverEl: object
		cardMenuEl: object
		quickSettingsButton: object
		undoBtnEl: object
		redoBtnEl: object
		canvasControlsEl: object
		canvasEl: object
		edgeContainerEl: object
		edgeEndContainerEl: object
		canvasRect: object
		nodeInteractionLayer: object
		frameWin: object
		metadata: object
		pointerFrameWin: object


		// 方法（未处理过）
		requestUpdateFileOpen: Function
		requestPushHistory: Function
		onGlobalKeydown: Function
		onGlobalKeyup: Function
		getSelectionData: Function
		updateFileOpen: Function
		importData: Function
		load: Function
		unload: Function
		requestSave: Function
		overrideHistory: Function
		undo: Function
		redo: Function
		applyHistory: Function
		pushHistory: Function
		updateHistoryUI: Function
		setViewport: Function
		nudgeSelection: Function
		panIntoView: Function
		posFromEvt: Function
		domPosFromEvt: Function
		domPosFromClient: Function
		posFromClient: Function
		posFromDom: Function
		domFromPos: Function
		posCenter: Function
		posInViewport: Function
		getViewportNodes: Function
		hitTestNode: Function
		getIntersectingNodes: Function
		getContainingNodes: Function
		addEdge: Function
		removeEdge: Function
		getIntersectingEdges: Function
		updateSelection: Function
		setDragging: Function
		onResize: Function
		getZIndex: Function
		createFileNodes: Function
		markViewportChanged: Function
		markMoved: Function
		markDirty: Function
		requestFrame: Function
		cancelFrame: Function
		getViewportBBox: Function
		virtualize: Function
		rerenderViewport: Function
		setState: Function
		getState: Function
		handleCut: Function
		cloneData: Function
		handleCopy: Function
		handlePaste: Function
		toggleGridSnapping: Function
		toggleObjectSnapping: Function
		getSnapping: Function
		endSnapPointRendering: Function
		clearSnapPoints: Function
		renderSnapPoints: Function
		onKeydown: Function
		onPriorityPointerdown: Function
		onPointerdown: Function
		interactionHitTest: Function
		onPointermove: Function
		onTouchdown: Function
		handleDragToSelect: Function
		onDoubleClick: Function
		onContextMenu: Function
		setReadonly: Function
		showQuickSettingsMenu: Function
		showCreationMenu: Function
		smartZoom: Function
		onWheel: Function
		handleMoverPointerdown: Function
		onSelectionContextMenu: Function
		canSnap: Function
		dragTempNode: Function
		handleDragWithPan: Function
		handleSelectionDrag: Function
		generateHDImage: Function
	}
}
