import { ItemView, Notice, Plugin, TFile, ViewState, WorkspaceLeaf } from 'obsidian';
import { around } from "monkey-around";
import { CMD_copyCanvasElementReference, EVENT_copyCanvasCardReferenceMenu } from './copy-canvas-element-reference';
import { openingFile } from './canvas-link-redirection';
import { BuiltInSuggest } from './typings/suggest';
import { suggestAround } from './canvas-link-suggest';
import { CMD_reverseSelectedCanvasEdges, EVENT_reverseEdges } from './reverse-edge';
import { CMD_changeElementID, EVENT_changeElementID } from './change-element-id';
import { CMD_selectDownstreamNodes, EVENT_selectDownstreamNodesMenu, CMD_selectUpstreamNodes, EVENT_selectUpstreamNodesMenu } from './select-nodes-via-edges';
import { BoundedBox, Canvas, CanvasNode } from 'obsidian/canvas';
import { isCanvasEdge, isCanvasNode, selectedNodes } from './utils';
import { CMD_adjustEdgeOnside, CMD_toggleNodeEdgeSelect, EVENT_adjustEdgeOnside, EVENT_toggleNodeEdgeSelect } from './adjust-edge-onside';
// import { CMD_selectAllEdgesInCanvas } from './commands/select-all-edges';
// ! ✅「选择所有连边」的功能，在AdvancedCanvas中有了

export default class CanvasReferencePlugin extends Plugin {

	async onload(): Promise<void> {
		// 功能：链接寻路
		this.patchWorkspaceLeaf();

		// 功能：
		this.patchEditorSuggest();

		// 功能：复制块链接 | 注册命令
		this.registerCommands();

		// 功能：注册事件
		this.registerEvents();

		// 📌【2025-07-10 00:34:00】快速添加键盘功能
		this.registerDomEvent(document, "keydown", (e: KeyboardEvent) => {
			// @ts-ignore
			const canvas: Canvas = this.app.workspace.getActiveViewOfType(ItemView)?.canvas as (Canvas | undefined)
			if (!canvas) return;

			// 空格+节点 开始编辑（连边作用无效）
			if ([' ', 'Enter'].includes(e.key) && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
				const firstElement = canvas.selection.values()?.next()?.value
				if (!firstElement) return;
				const isEditing = firstElement?.isEditing
				if (!isEditing) {
					if (isCanvasNode(firstElement))
						firstElement.startEditing()
					// else if (isCanvasEdge(firstElement))
					// 	firstElement.setLabel()
				}
			}
			// x 删除选区
			if (e.key === 'x' && canvas.selection.size > 0 && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
				canvas.deleteSelection()
			}
			// q/Esc 取消编辑与选中
			if (['q', 'Escape'].includes(e.key) && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
				// ✅【2025-07-10 01:39:41】在结束文本编辑后，可取消编辑
				if (canvas.selection.size > 0) {
					canvas.deselectAll()
				}
			}
			// c 调整颜色（shift反向）
			if (e.code === 'KeyC' && !e.ctrlKey && !e.altKey && !e.metaKey) {
				const MAX_COLOR_LENGTH = 7
				for (const element of canvas.selection.values()) {
					// 正在编辑的元素不修改颜色
					if (isCanvasNode(element) && element.isEditing) continue
					// 其它情况
					if (isCanvasEdge(element) || isCanvasNode(element)) {
						const color = Number(element.color)
						const step = e.shiftKey ? MAX_COLOR_LENGTH - 1 : 1
						if (isFinite(color)) {
							const newColor = (color + step) % MAX_COLOR_LENGTH
							element.setColor(newColor.toString())
						}
					}
				}
			}
			// 选中+WASD：在节点之间移动选择
			while (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code) && !e.ctrlKey && !e.altKey && !e.metaKey) {
				// 若无选中节点⇒退出
				if (!selectedNodes(canvas).next().value) break

				// 获取按键对应的方向角
				const rightDirectionDeg: number = { KeyD: 0, KeyS: 90, KeyA: 180, KeyW: 270 }[e.code]!
				const rightDirectionRad = rightDirectionDeg * Math.PI / 180
				// 限制角度范围，避免选中到边缘 | 此即：即便再近，也不会选中反方向的节点
				const restrictedAngleRangeRad = 45 * Math.PI / 180

				const transportedSelectedNodes = new Set<CanvasNode>()
				for (const firstNode of selectedNodes(canvas)) {
					const { x, y, width, height } = firstNode
					const baseX = x + width / 2
					const baseY = y + height / 2

					// 计算距离最近的节点
					let mostFit: { node: CanvasNode, distance: number } | undefined = undefined
					for (const targetNode of canvas.nodes.values()) {
						if (targetNode === firstNode) continue
						const { x, y, width, height } = targetNode
						const targetX = x + width / 2
						const targetY = y + height / 2

						let diffAngleRad = Math.atan2(targetY - baseY, targetX - baseX)
						if (diffAngleRad < 0) diffAngleRad += 2 * Math.PI // 规范范围到 0 ~ 2π
						const absDiffAngleRestricted = Math.abs(diffAngleRad - rightDirectionRad)
						if (absDiffAngleRestricted > restrictedAngleRangeRad) continue

						const distance = Math.sqrt((targetX - baseX) ** 2 + (targetY - baseY) ** 2)

						mostFit ??= { node: targetNode, distance }
						if (mostFit.distance > distance) {
							mostFit.node = targetNode
							mostFit.distance = distance
						}
					}


					// 若有选中节点，则移动选择
					if (!mostFit?.node) continue
					transportedSelectedNodes.add(mostFit.node)
				}

				// 选中节点
				if (transportedSelectedNodes.size <= 0) break
				if (!e.shiftKey) canvas.deselectAll() // shift可以扩增选择
				for (const node of transportedSelectedNodes)
					canvas.select(node)
				// 跟随选中：将画布平移到所有选中的节点处
				// 改成for循环，一个循环计算4个值
				const selectedBBox: BoundedBox = {
					minX: undefined,
					minY: undefined,
					maxX: undefined,
					maxY: undefined,
				} as unknown as BoundedBox
				for (const node of transportedSelectedNodes) {
					const { minX, minY, maxX, maxY } = node.bbox
					selectedBBox.minX ??= minX
					selectedBBox.minX = Math.min(selectedBBox.minX, minX)
					selectedBBox.minY ??= minY
					selectedBBox.minY = Math.min(selectedBBox.minY, minY)
					selectedBBox.maxX ??= maxX
					selectedBBox.maxX = Math.max(selectedBBox.maxX, maxX)
					selectedBBox.maxY ??= maxY
					selectedBBox.maxY = Math.max(selectedBBox.maxY, maxY)
				}
				console.log(canvas)
				canvas.panIntoView(selectedBBox)

				break
			}
			// F「Focus」：单按 聚焦到选中的元素
			if (e.code === 'KeyF' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey)
				// 有选择⇒聚焦到选择
				if (canvas.selection.size > 0) canvas.zoomToSelection()
				// 没选择⇒选中离屏幕中心最近的节点
				else {
					const { minX, minY, maxX, maxY } = canvas.getViewportBBox()
					const centerX = (minX + maxX) / 2
					const centerY = (minY + maxY) / 2
					let closestNode: CanvasNode | undefined = undefined
					let closestDistance = Infinity
					for (const node of canvas.nodes.values()) {
						const { minX, minY, maxX, maxY } = node.bbox
						const x = minX + (maxX - minX) / 2
						const y = minY + (maxY - minY) / 2
						const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
						if (distance < closestDistance) {
							closestNode = node
							closestDistance = distance
						}
					}
					if (closestNode) canvas.select(closestNode)
				}
			// Z「Zoom」：单按 放大，Shift 缩小
			if (e.code === 'KeyZ' && !e.ctrlKey && !e.altKey && !e.metaKey)
				canvas.zoomBy(e.shiftKey ? -0.1 : 0.1)
		})
	}


	onunload(): void {

	}

	registerEvents(): void {
		// 所有事件
		const EVENTS = [
			EVENT_copyCanvasCardReferenceMenu,
			EVENT_reverseEdges,
			EVENT_changeElementID,
			EVENT_selectDownstreamNodesMenu,
			EVENT_selectUpstreamNodesMenu,
			EVENT_adjustEdgeOnside,
			EVENT_toggleNodeEdgeSelect,
		]
		// 注册事件
		for (const { on, callback } of EVENTS)
			if (typeof on === 'string')
				// @ts-ignore
				this.registerEvent(this.app.workspace.on(on, callback));
			else
				for (const eventType of on)
					// @ts-ignore
					this.registerEvent(this.app.workspace.on(eventType, callback));
	}

	registerCommands(): void {
		// 所有命令（根据APP注册（拿到引用））
		const COMMANDS = [
			CMD_copyCanvasElementReference,
			CMD_reverseSelectedCanvasEdges,
			CMD_changeElementID,
			CMD_selectDownstreamNodes,
			CMD_adjustEdgeOnside,
			CMD_selectUpstreamNodes,
			CMD_toggleNodeEdgeSelect,
		]
		// 添加命令
		for (const cmdF of COMMANDS)
			this.addCommand(cmdF(this.app));
	}

	patchWorkspaceLeaf(): void {
		// ! ❌↓失败：「注册」不是这么用的，应该是注册一个回调函数
		// this.register(() => new PatchWorkSpaceLeaf());
		// return
		this.register(around(WorkspaceLeaf.prototype, {
			// 钩子：打开文件
			openFile: (old) => async function (file: TFile, state?: ViewState) {
				// 原先的函数
				await old.call(this, file, state);
				// 调用自定义钩子
				openingFile(this, file, state);
			}
		}));
	}

	getBuiltInSuggest(): BuiltInSuggest {
		// @ts-ignore
		return this.app.workspace.editorSuggest.suggests[0];
	}

	patchEditorSuggest(): void {
		// console.log('patchEditorSuggest')
		// this.registerEditorSuggest(new PatchEditorSuggest(this.app));
		// console.log('patchEditorSuggest done');
		// return

		// * 📌以下代码借鉴自 <https://github.com/RyotaUshio/obsidian-rendered-block-link-suggestions>
		// * ❗这个是「替换」而非「新增」，不一定用得上
		// * 💭【2025-04-20 18:16:39】这儿能跑通，那就不用单独的class

		// builtin suggest
		const suggest = this.getBuiltInSuggest();
		const app = this.app;

		this.register(around(suggest.constructor.prototype, suggestAround(suggest, app)));
	}
}

