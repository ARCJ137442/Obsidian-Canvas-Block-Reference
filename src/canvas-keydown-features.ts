/**
 * 存放白板中只用键盘事件就能生效的功能
 */

import { Canvas, CanvasElementSide, CanvasNode } from "obsidian/canvas";
import { addEdge, enumerate, isCanvasEdge, isCanvasNode, isCanvasTextNode, nLines, panToElements, selectedNodes, setNodePosition, sum, updateNodeData } from "./utils";
import { Notice } from "obsidian";
import { packRectangles } from "./brickLayout";
import { DEFAULT_CANVAS_SHORTCUT_SETTINGS, getCanvasDirection, getCanvasShortcutId } from "./canvas-shortcuts";
import type { CanvasShortcutSettings } from "./canvas-shortcuts";
import { commitCanvasMutation } from "./canvas-mutations";
import { createCanvasTextNode } from "./canvas-node-operations";

export interface CanvasKeyboardActions {
	startContinuousZoom?: (canvas: Canvas, shiftKey: boolean) => void;
}

// 独立出的功能：白板中键盘按下的功能
export function onCanvasKeyDown(
	e: KeyboardEvent,
	isKeyDown: { [code: string]: boolean },
	canvas: Canvas,
	actions: CanvasKeyboardActions = {},
	settings: CanvasShortcutSettings = DEFAULT_CANVAS_SHORTCUT_SETTINGS,
): boolean {
	const shortcutId = getCanvasShortcutId(e, settings)
	if (!shortcutId) return false

	const {
		code, shiftKey,
	} = e

	// 空格+节点 开始编辑（连边作用无效）
	if (shortcutId === "edit") {
		const firstElement = canvas.selection.values()?.next()?.value
		if (!firstElement) return false;
		const isEditing = firstElement?.isEditing
		if (!isEditing) {
			if (isCanvasNode(firstElement))
				setTimeout(() => firstElement.startEditing(), 0)
			// else if (isCanvasEdge(firstElement))
			// 	firstElement.setLabel()
		}
	}
	// x 删除选区
	if (shortcutId === "deleteSelection" && canvas.selection.size > 0) {
		canvas.deleteSelection()
	}
	// q/Esc 取消编辑与选中
	if (shortcutId === "cancelSelection") {
		// ✅【2025-07-10 01:39:41】在结束文本编辑后，可取消编辑
		if (canvas.selection.size > 0) {
			canvas.deselectAll()
		}
	}
	// c 调整颜色（shift反向）
	if (shortcutId === "cycleColor") {
		const AVAILABLE_COLORS = ['', '1', '2', '3', '4', '5', '6', '#000000', '#ffffff']
		const N_COLORS = AVAILABLE_COLORS.length
		if (canvas.selection.size <= 0) return true
		commitCanvasMutation(canvas, () => {
		for (const element of [...canvas.selection]) {
			// 正在编辑的元素不修改颜色
			if (isCanvasNode(element) && element.isEditing) continue
			// 其它情况
			if (isCanvasEdge(element) || isCanvasNode(element)) {
				// 获取索引
				// ! 空颜色并不与'0'等价，前者才是Obsidian的默认值
				let colorIndex = AVAILABLE_COLORS.indexOf(element.color)
				if (colorIndex < 0) continue
				// 计算新索引
				const step = shiftKey ? N_COLORS - 1 : 1
				const newColorIndex = (colorIndex + step) % N_COLORS
				const newColor = AVAILABLE_COLORS[newColorIndex]
				element.setColor(newColor)
			}
		}
		}, { refresh: false })
	}
	// 选中+WASD：在节点之间移动选择
	while (shortcutId === "directional") {
		const direction = getCanvasDirection(code, settings)
		if (!direction) break
		// E「Expand」：组合键+WASD 创建一个文本节点，并进行延展
		if (isKeyDown[settings.extend]) {
			const newNodes: CanvasNode[] = []

			const node: CanvasNode = canvas.selection.values().next().value // ! 📌【2025-08-09 14:40:23】还是只选中一个
			if (!node) break

			const selected = [...selectedNodes(canvas)].filter(node => 'text' in node)
			if (selected.length <= 0) break
			commitCanvasMutation(canvas, () => {
			for (const node of selected) {
				// 目前仅针对文本节点

				// 计算要偏移的位置、要连接的两侧
				let dx, dy
				let fromSide: CanvasElementSide, toSide: CanvasElementSide
				const padding = 20
				switch (direction) {
					case 'north': // 向上：出现在上方，dy上一个height
						dx = 0
						dy = -node.height - padding
						fromSide = 'top', toSide = 'bottom' // 从顶面连到底面
						break
					case 'south': // 向下：出现在下方，dy下一个height
						dx = 0
						dy = node.height + padding
						fromSide = 'bottom', toSide = 'top' // 从底面连到顶面
						break
					case 'west': // 向左：出现在左侧，dx左一个width
						dx = -node.width - padding
						dy = 0
						fromSide = 'left', toSide = 'right' // 从左侧连到右侧
						break
					case 'east': // 向右：出现在右侧，dx右一个width
						dx = node.width + padding
						dy = 0
						fromSide = 'right', toSide = 'left' // 从右侧连到左侧
						break
					default:
						dx = dy = 0
						fromSide = toSide = 'right'
						break
				}

				// 仿制一个文本节点
				const newNode = createCanvasTextNode(canvas, {
					x: node.x + dx,
					y: node.y + dy,
					width: node.width,
					height: node.height,
					text: (node as any)?.text ?? '',
					color: node.color,
				})
				// updateNodeData(newNode, { // ! ⚠️【2025-08-09 14:53:19】必须放在addNode后边，不然没有id，也会表现得像是「不在白板中」
				// 	// 除了id、x、y、width、height、text的字段
				// 	x: newNode.x,
				// 	y: newNode.y,
				// 	width: newNode.width,
				// 	height: newNode.height,
				// 	id: newNode.id,
				// 	text: (newNode as any).text
				// })

				// ! ❌【2025-09-18 10:44:32】不自动选中并编辑，以便连续创建节点（可用Enter进入编辑状态）

				// 添加连边
				addEdge(canvas, node, newNode, fromSide, toSide, false)

				newNodes.push(newNode)
			}
			}, { refresh: false })
			// 选中所有新增的节点
			if (newNodes.length <= 0) break

			if (!shiftKey) canvas.deselectAll() // shift可以扩增选择
			for (const newNode of newNodes) canvas.select(newNode)

			canvas.requestFrame()

			// 跟随选中：将画布平移到所有选中的节点处
			panToElements(canvas, newNodes)

			break
		}
		// R「Resize」：调整选中节点的大小
		if (isKeyDown[settings.createEdge]) {
			const selected = [...selectedNodes(canvas)].filter(node => 'text' in node)
			const node: CanvasNode = selected[0] // ! 📌【2025-08-09 14:40:23】还是只选中一个
			if (!node) break

			commitCanvasMutation(canvas, () => {
			for (const node of selected) {

				// 计算要偏移的位置、要连接的两侧
				let dx, dy
				const step = 20
				switch (direction) {
					case 'north': // 向上：高度减少
						dx = 0
						dy = -step
						break
					case 'south': // 向下：高度增加
						dx = 0
						dy = step
						break
					case 'west': // 向左：宽度减少
						dx = -step
						dy = 0
						break
					case 'east': // 向右：宽度增加
						dx = step
						dy = 0
						break
					default: // 不变
						dx = dy = 0
						break
				}

				// 计算新的尺寸
				const width = Math.max(node.width + dx, 10)
				const height = Math.max(node.height + dy, 10)

				updateNodeData(node, { width, height })
			}
			}, { refresh: false })

			canvas.requestFrame()

			// 跟随选中：将画布平移到所有选中的节点处
			panToElements(canvas, selected)

			break
		}

		// 若无选中节点⇒退出
		if (!selectedNodes(canvas).next().value) break

		// 获取按键对应的方向角
		const rightDirectionDeg: number = { east: 0, south: 90, west: 180, north: 270 }[direction]
		const newSelectedNodes = transportedSelectedNodes(canvas, rightDirectionDeg);

		// 选中节点
		if (newSelectedNodes.size <= 0) break
		if (!shiftKey) canvas.deselectAll() // shift可以扩增选择
		for (const node of newSelectedNodes)
			canvas.select(node)
		// 跟随选中：将画布平移到所有选中的节点处
		panToElements(canvas, newSelectedNodes)

		break
	}
	// E「Extend」：若按E键时没有选中的节点（有选中→扩展），则在屏幕中心创建一个新节点
	while (shortcutId === "extend") {
		if (canvas.selection.size > 0) break

		const { minX, minY, maxX, maxY } = canvas.getViewportBBox()
		// 仿制一个文本节点，使用默认样式
		const newNode = commitCanvasMutation(canvas, () => createCanvasTextNode(canvas, {
			x: (minX + maxX) / 2,
			y: (minY + maxY) / 2,
		}), { refresh: true });

		// 切换到选中状态
		setTimeout(() => {
			canvas.selectOnly(newNode);
			isKeyDown[settings.extend] = false;
			newNode.startEditing();
		}, 0);

		break
	}
	// F「Focus」：单按 聚焦到选中的元素
	if (shortcutId === "focus")
		// 没节点⇒坐标回到原点
		if (canvas.nodes.size <= 0)
			canvas.panTo(0, 0)
		// 有选择⇒聚焦到选择
		else if (canvas.selection.size > 0) canvas.zoomToSelection()
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
	if (shortcutId === "zoom") {
		if (actions.startContinuousZoom) actions.startContinuousZoom(canvas, shiftKey)
		else canvas.zoomBy(shiftKey ? -0.1 : 0.1)
	}
	// Shift+R：在俩节点之间随机添加连边
	while (shortcutId === "createEdge") {
		const selected = selectedNodes(canvas)
		const node1 = selected.next().value
		const node2 = selected.next().value
		if (!node1 || !node2) break
		// * 🚧目前不整那么多花里胡哨的连边：❌两边之间自适应→可以 Alt+Shift+A 调整，❌方向反了→可以反转连边
		commitCanvasMutation(canvas, () => {
			addEdge(canvas, node1, node2, 'right', 'left', false)
		})
		break
	}
	// Shift+Alt+Ctrl+E：紧凑布局
	if (shortcutId === "compactLayout") {
		const ns = Array.from(canvas.nodes.values())
		if (ns.length <= 0) {
			new Notice('紧凑布局：白板中没有节点')
		} else {
			const progressNotice = new Notice(`紧凑布局：正在处理 0/${ns.length} 个节点`, 0)
			try {
				const w = ns.map(node => node.width), h = ns.map(node => node.height)
				const { x, y } = packRectangles(w, h)
				commitCanvasMutation(canvas, () => {
					for (let i = 0; i < x.length; i++) {
						setNodePosition(ns[i], x[i], y[i])
						if ((i + 1) % 100 === 0 || i + 1 === x.length)
							progressNotice.setMessage(`紧凑布局：正在处理 ${i + 1}/${ns.length} 个节点`)
					}
				})
				progressNotice.hide()
				new Notice(`紧凑布局完成：${ns.length} 个节点`)
			} catch (error) {
				progressNotice.hide()
				console.error('[CanvasReferencePlugin] compact layout failed', error)
				new Notice('紧凑布局失败，请查看开发者控制台')
			}
		}
	}
	// Y/Shift+Y: CTDP快速计数
	// * 📅2025-08-20
	// * 📌适用于末尾是整数的所有文字笔记
	// * Y：计数+1
	// * Shift+Y：计数清零
	if (shortcutId === "counter") {
		// 遍历所有选中的文本节点
		commitCanvasMutation(canvas, () => {
		for (const node of selectedNodes(canvas)) {
			if (!isCanvasTextNode(node)) continue
			let text = node.text
			// 获取当前数值：文本最后的digits
			let oldValue = NaN
			let lastI = text.length - 1
			for (; lastI >= 0; lastI--) {
				const newNumber = parseInt(text.slice(lastI), 10)
				if (isNaN(newNumber)) break
				else oldValue = newNumber
			}

			// 无效⇒提前退出
			const invalid = !isFinite(oldValue) || isNaN(oldValue)
			if (invalid) break

			// 有效→看Shift获得新值
			const newValue = shiftKey ? 0 : oldValue + 1
			text = text.slice(0, lastI + 1) + newValue
			node.setText(text)

			// Notice通知
			const briefTitle = text.split('\n')[0]
			let message
			if (shiftKey) { // 清零
				message = `🚫CTDP计数 ${briefTitle}\n清零：${oldValue}→${newValue}`
			} else { // 新增
				message = `✅CTDP计数 ${briefTitle}\n增加：${oldValue}→${newValue}`
			}
			new Notice(message)
		}
		}, { refresh: false })
	}
	// 数字键Digit，小键盘Numpad | ❗Alt组合键被占用了
	if (shortcutId === "formatTitle") {
		commitCanvasMutation(canvas, () => {
		for (const node of selectedNodes(canvas)) {
			if (!isCanvasTextNode(node)) continue
			let n: number // 拆分 Digit
			try { n = parseInt(code.slice(5), 10) } catch { continue }
			const text = node.text
			const { title, rest } = extractNodeTextTitle(text);
			const [mdTitle, _] = extractTitleFromLine(title)
			const newMdTitle = formatMdTitle(mdTitle, n)
			const newText = newMdTitle + rest
			node.setText(newText)
		}
		}, { refresh: false })
	}
	// 大写K → 拆分Markdown无序列表
	if (shortcutId === "splitList") {
		commitCanvasMutation(canvas, () => {
		for (const node of selectedNodes(canvas)) {
			if (!isCanvasTextNode(node)) continue
			// 先拆分笔记内容
			const { title, level, content, unorderedList } = splitNoteText(node.text);

			// 然后将内容分别组织成文本节点

			const selfLines = nLines(title) + nLines(content)
			const subLines = unorderedList.map(
				({ text, level: subLevel, children }) => {
					// 递归降级
					for (const item of iterListItems(children)) {
						item.level -= 1
					}
					// 提取标题：第一行
					const { title: subtitle, rest } = extractNodeTextTitle(text);
					const content = rest.trimStart() // 若开头有换行，去掉换行

					text = formatNoteText({
						title: ( // 标题：路径/仅子标题 灵活使用
							title.length > subtitle.length
								? `${title} / ${subtitle}` // 父标题长，用路径形式
								: subtitle // 子标题长，只用子标题
						),
						level: ( // 级别+1：大→小→无
							level <= 0 || level > 7 ? 0 // 没有级别
								: level + subLevel + 1 // 有级别
						),
						content,
						unorderedList: children,
					});
					return {
						text,
						lines: nLines(text),
					}
				}
			)
			const sumLines = selfLines + sum(subLines.map(x => x.lines))

			// 创建新文本节点
			let nowTotalLines = selfLines
			for (const { text, lines } of subLines) {
				// 创建文本节点
				createCanvasTextNode(canvas, {
					text,
					position: "top",
					x: (node.x + node.width / 2),
					y: node.y + (nowTotalLines / sumLines) * node.height,
					width: node.width,
					height: (lines / sumLines) * node.height,
					color: node.color,
				});
				// 增加行数
				nowTotalLines += lines
			}

			// 自身节点
			const selfNewNodeText = formatNoteText({
				title,
				level,
				content: content.trimStart(),
				unorderedList: [], // 删除，独立出去
			})
			updateNodeData(node, {
				text: selfNewNodeText,
				height: (selfLines / sumLines) * node.height,
			});
		}

		}, { refresh: false })
	}
	return true
}

// * 下边都是工具函数 * //

/**
 * 沿着方向选中节点
 * @param canvas 白板
 * @param rightDirectionDeg 要选中的方向
 * @returns 方向下所有选中的节点
 */
function transportedSelectedNodes(canvas: Canvas, rightDirectionDeg: number) {
	const rightDirectionRad = rightDirectionDeg * Math.PI / 180;
	// 限制角度范围，避免选中到边缘 | 此即：即便再近，也不会选中反方向的节点
	const restrictedAngleRangeRad = 45 * Math.PI / 180;

	const transportedSelectedNodes = new Set<CanvasNode>();
	for (const firstNode of selectedNodes(canvas)) {
		const { x, y, width, height } = firstNode;
		const baseX = x + width / 2;
		const baseY = y + height / 2;

		// 计算距离最近的节点
		let mostFit: { node: CanvasNode; distance: number; } | undefined = undefined;
		for (const targetNode of canvas.nodes.values()) {
			if (targetNode === firstNode) continue;
			const { x, y, width, height } = targetNode;
			const targetX = x + width / 2;
			const targetY = y + height / 2;

			let diffAngleRad = Math.atan2(targetY - baseY, targetX - baseX);
			if (diffAngleRad < 0) diffAngleRad += 2 * Math.PI; // 规范范围到 0 ~ 2π
			const absDiffAngleRestricted = Math.min(
				Math.abs(diffAngleRad - rightDirectionRad),
				Math.abs(diffAngleRad - (rightDirectionRad + 2 * Math.PI))
			);
			if (absDiffAngleRestricted > restrictedAngleRangeRad) {
				// console.error('angle out of range', (targetNode as any)?.text, diffAngleRad, absDiffAngleRestricted, restrictedAngleRangeRad)
				continue;
			}

			const dx = Math.min(Math.abs(baseX - targetX), Math.abs(firstNode.bbox.minX - targetNode.bbox.maxX), Math.abs(targetNode.bbox.minX - firstNode.bbox.maxX)), dy = Math.min(Math.abs(baseY - targetY), Math.abs(firstNode.bbox.minY - targetNode.bbox.maxY), Math.abs(targetNode.bbox.minY - firstNode.bbox.maxY)), distanceCenter = Math.sqrt((baseX - targetX) ** 2 + (baseY - targetY) ** 2), distance = Math.min(Math.sqrt(dx * dx + dy * dy), distanceCenter);
			// console.warn((targetNode as any)?.text, dx, dy, distance)
			mostFit ??= { node: targetNode, distance };
			if (mostFit.distance > distance) {
				mostFit.node = targetNode;
				mostFit.distance = distance;
			}
		}


		// 若有选中节点，则移动选择
		if (!mostFit?.node) continue;
		transportedSelectedNodes.add(mostFit.node);
	}

	return transportedSelectedNodes;
}

/**
 * 拆分文本节点的标题和内容
 * @param text Obsidian白板中的文本
 * @returns 标题，剩余部分（前半部分包含换行符，后半部分包含）
 */
function extractNodeTextTitle(text: string) {
	const title = text.split('\n')[0]; // 不包含换行符
	const rest = text.slice(title.length);
	return { title, rest };
}

/**
 * 提取Markdown标题
 * @param line 形如「# 标题」或「**标题**」的行
 * * 对于加粗，视作7级标题
 * @returns 提取后的「标题」及其层级
 */
function extractTitleFromLine(line: string): [string, number] {
	const mdTitleI = line.indexOf('# ')
	return mdTitleI >= 0 ? [line.slice(mdTitleI + 2), line.slice(0, mdTitleI + 1).length]
		: line.startsWith('**') && line.endsWith('**') ? [line.slice(2, -2), 7]
			: [line, 0];
}

/**
 * 格式化标题
 * @param title 标题，纯文本「标题」
 * @param level 标题级别 0~7
 * @returns 格式化后的标题「标题」「## 标题」「**标题**」
 */
function formatMdTitle(title: string, level: number) {
	return level == 0 ? title // 0→空标题
		: level > 6 ? `**${title}**` // 6级以上→加粗
			: '#'.repeat(level) + ' ' + title;
}

interface NoteText {
	title: string, level: number,
	content: string,
	unorderedList: ListItem[],
}

/**
 * 按笔记的格式拆分文本节点的内容，带无序列表
 * @returns 纯标题+层级，无序列表前正文，无序列表
 */
function splitNoteText(text: string): NoteText {
	let { title: line$1, rest } = extractNodeTextTitle(text);

	const [title, level] = extractTitleFromLine(line$1);
	const listHead0 = formatListHead2split(0)

	// 分离内容与列表
	const unorderedListI = rest.indexOf(listHead0)

	// 拆分出内容
	const content = unorderedListI >= 0 ? rest.slice(0, unorderedListI) : rest;

	// 解析列表
	const unorderedList = unorderedListI >= 0 ? splitUnorderedList(rest.slice(unorderedListI)) : []

	return { title, level, content, unorderedList }
}

function formatListHead(level: number) {
	return `${'\t'.repeat(level)}- `
}

/**
 * 拆分无序列表
 * * 按层级递归拆解
 */
function splitUnorderedList(text: string): ListItem[] {
	return (
		function inner(
			text: string,
			base: ListItem[] = [],
			level: number = 0,
		) {
			const add = (text: string, level: number) => {
				// 清理首尾换行符
				const cleanedText = text.replace(/^\n+|\n+$/g, '');
				const item = { level, text: cleanedText, children: [] };
				base.push(item);
				return item;
			};

			// 只在 level 0 时确保开头有换行符（避免递归时重复添加）
			if (level === 0 && !text.startsWith('\n')) {
				text = '\n' + text;
			}

			const listHead2split = formatListHead2split(level);
			const splitted = text.split(listHead2split);

			if (splitted.length <= 1) {
				// 没有匹配到当前层级的列表项，把整个作为文本节点
				if (splitted[0].trim()) { // 避免添加空节点
					add(splitted[0], level);
				}
			} else {
				const nextHead = formatListHead2split(level + 1);

				// level 0 时，第一个分片是前导内容（可能为空），跳过
				if (level === 0) {
					splitted.shift();
				}

				for (const fragment of splitted) {
					if (!fragment.trim()) continue; // 跳过空白片段

					const nextHeadI = fragment.indexOf(nextHead);
					const title = nextHeadI === -1 ? fragment : fragment.slice(0, nextHeadI);
					const rest = nextHeadI === -1 ? '' : fragment.slice(nextHeadI);

					const item = add(title, level);
					if (rest) {
						inner(rest, item.children, level + 1);
					}
				}
			}
			return base;
		})(text);
}
interface ListItem {
	level: number
	text: string
	children: ListItem[]
}

/**
 * 构造无序列表的格式化头部
 * @param level 层级
 * @returns 格式化后的头部
 */
function formatListHead2split(level: number) {
	return `\n${formatListHead(level)}`;
}

/** 递归遍历 */
function* iterListItems(items: ListItem[]): Generator<ListItem> {
	for (const item of items) {
		yield item
		if (item.children.length) {
			yield* iterListItems(item.children);
		}
	}
}

/**
 * splitNoteText的逆函数
 */
function formatListItems(items: ListItem[]): string {


	let s = ''
	for (const item of iterListItems(items)) {
		s += formatListHead(item.level) + item.text + '\n'
	}
	return s
}

/**
 * splitNoteText的逆函数
 */
function formatNoteText({
	title, level,
	content,
	unorderedList,
}: NoteText): string {
	return (formatMdTitle(title, level)
		+ (content ? '\n' + content : '')
		+ (unorderedList.length ? '\n' + formatListItems(unorderedList) : ''))
}
