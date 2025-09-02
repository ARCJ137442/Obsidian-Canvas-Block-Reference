/**
 * 存放白板中只用键盘事件就能生效的功能
 */

import { Canvas, CanvasElementSide, CanvasNode } from "obsidian/canvas";
import { addEdge, isCanvasEdge, isCanvasNode, isCanvasTextNode, panToElements, selectedNodes, setNodePosition, updateNodeData } from "./utils";
import { Notice } from "obsidian";
import { packRectangles } from "./brickLayout";

// 独立出的功能：白板中键盘按下的功能
export async function onCanvasKeyDown(e: KeyboardEvent, isKeyDown: { [code: string]: boolean }, canvas: Canvas) {
	const {
		key, code,
		ctrlKey, metaKey, altKey, shiftKey,
	} = e

	// 空格+节点 开始编辑（连边作用无效）
	if ([' ', 'Enter'].includes(key) && !shiftKey && !ctrlKey && !altKey && !metaKey) {
		const firstElement = canvas.selection.values()?.next()?.value
		if (!firstElement) return;
		const isEditing = firstElement?.isEditing
		if (!isEditing) {
			if (isCanvasNode(firstElement))
				setTimeout(() => firstElement.startEditing(), 0)
			// else if (isCanvasEdge(firstElement))
			// 	firstElement.setLabel()
		}
	}
	// x 删除选区
	if (key === 'x' && canvas.selection.size > 0 && !shiftKey && !ctrlKey && !altKey && !metaKey) {
		canvas.deleteSelection()
	}
	// q/Esc 取消编辑与选中
	if (['q', 'Escape'].includes(key) && !shiftKey && !ctrlKey && !altKey && !metaKey) {
		// ✅【2025-07-10 01:39:41】在结束文本编辑后，可取消编辑
		if (canvas.selection.size > 0) {
			canvas.deselectAll()
		}
	}
	// c 调整颜色（shift反向）
	if (code === 'KeyC' && !ctrlKey && !altKey && !metaKey) {
		const MAX_COLOR_LENGTH = 7
		for (const element of canvas.selection.values()) {
			// 正在编辑的元素不修改颜色
			if (isCanvasNode(element) && element.isEditing) continue
			// 其它情况
			if (isCanvasEdge(element) || isCanvasNode(element)) {
				const color = Number(element.color)
				const step = shiftKey ? MAX_COLOR_LENGTH - 1 : 1
				if (isFinite(color)) {
					const newColor = (color + step) % MAX_COLOR_LENGTH
					element.setColor(newColor.toString())
				}
			}
		}
	}
	// 选中+WASD：在节点之间移动选择
	while (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(code) && !ctrlKey && !altKey && !metaKey) {
		// E「Expand」：组合键+WASD 创建一个文本节点，并进行延展
		if (isKeyDown['KeyE']) {
			const newNodes = []

			const node: CanvasNode = canvas.selection.values().next().value // ! 📌【2025-08-09 14:40:23】还是只选中一个
			if (!node) break

			const selected = [...selectedNodes(canvas)]
			for (const node of selected) {
				// 目前仅针对文本节点
				if (!('text' in node)) continue

				// 计算要偏移的位置、要连接的两侧
				let dx, dy
				let fromSide: CanvasElementSide, toSide: CanvasElementSide
				const padding = 20
				switch (code) {
					case 'KeyW': // 向上：出现在上方，dy上一个height
						dx = 0
						dy = -node.height - padding
						fromSide = 'top', toSide = 'bottom' // 从顶面连到底面
						break
					case 'KeyS': // 向下：出现在下方，dy下一个height
						dx = 0
						dy = node.height + padding
						fromSide = 'bottom', toSide = 'top' // 从底面连到顶面
						break
					case 'KeyA': // 向左：出现在左侧，dx左一个width
						dx = -node.width - padding
						dy = 0
						fromSide = 'left', toSide = 'right' // 从左侧连到右侧
						break
					case 'KeyD': // 向右：出现在右侧，dx右一个width
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
				const newNode = canvas.createTextNode({
					pos: { x: node.x + dx, y: node.y + dy },
					save: true, focus: false,
					size: { width: node.width, height: node.height },
					text: (node as any)?.text ?? ''
				})
				// * ℹ️需要更新碰撞箱：刚创建的节点没有
				newNode.bbox = { minX: newNode.x, minY: newNode.y, maxX: newNode.x + newNode.width, maxY: newNode.y + newNode.height }

				canvas.addNode(newNode)
				canvas.requestSave()

				newNode.color = node.color
				// updateNodeData(newNode, { // ! ⚠️【2025-08-09 14:53:19】必须放在addNode后边，不然没有id，也会表现得像是「不在白板中」
				// 	// 除了id、x、y、width、height、text的字段
				// 	x: newNode.x,
				// 	y: newNode.y,
				// 	width: newNode.width,
				// 	height: newNode.height,
				// 	id: newNode.id,
				// 	text: (newNode as any).text
				// })

				if (!newNode) continue

				// 添加连边
				addEdge(canvas, node, newNode, fromSide, toSide, false)

				newNodes.push(newNode)
			}
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
		if (isKeyDown['KeyR']) {
			const node: CanvasNode = selectedNodes(canvas).next().value // ! 📌【2025-08-09 14:40:23】还是只选中一个
			if (!node) break

			for (const node of selectedNodes(canvas)) {
				// 目前仅针对文本节点
				if (!('text' in node)) break

				// 计算要偏移的位置、要连接的两侧
				let dx, dy
				const step = 20
				switch (code) {
					case 'KeyW': // 向上：高度减少
						dx = 0
						dy = -step
						break
					case 'KeyS': // 向下：高度增加
						dx = 0
						dy = step
						break
					case 'KeyA': // 向左：宽度减少
						dx = -step
						dy = 0
						break
					case 'KeyD': // 向右：宽度增加
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

			canvas.requestFrame()

			// 跟随选中：将画布平移到所有选中的节点处
			panToElements(canvas, selectedNodes(canvas))

			break
		}

		// 若无选中节点⇒退出
		if (!selectedNodes(canvas).next().value) break

		// 获取按键对应的方向角
		const rightDirectionDeg: number = { KeyD: 0, KeyS: 90, KeyA: 180, KeyW: 270 }[code]!
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
				const absDiffAngleRestricted = Math.min(
					Math.abs(diffAngleRad - rightDirectionRad),
					Math.abs(diffAngleRad - (rightDirectionRad + 2 * Math.PI)), // 角度相同，应对 0=2π 的状况
				)
				if (absDiffAngleRestricted > restrictedAngleRangeRad) {
					// console.error('angle out of range', (targetNode as any)?.text, diffAngleRad, absDiffAngleRestricted, restrictedAngleRangeRad)
					continue
				}

				const dx = Math.min(Math.abs(baseX - targetX), Math.abs(firstNode.bbox.minX - targetNode.bbox.maxX), Math.abs(targetNode.bbox.minX - firstNode.bbox.maxX))
					, dy = Math.min(Math.abs(baseY - targetY), Math.abs(firstNode.bbox.minY - targetNode.bbox.maxY), Math.abs(targetNode.bbox.minY - firstNode.bbox.maxY))
					, distanceCenter = Math.sqrt((baseX - targetX) ** 2 + (baseY - targetY) ** 2)
					, distance = Math.min(Math.sqrt(dx * dx + dy * dy), distanceCenter)
				// console.warn((targetNode as any)?.text, dx, dy, distance)

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
		if (!shiftKey) canvas.deselectAll() // shift可以扩增选择
		for (const node of transportedSelectedNodes)
			canvas.select(node)
		// 跟随选中：将画布平移到所有选中的节点处
		panToElements(canvas, transportedSelectedNodes)

		break
	}
	// E「Extend」：若按E键时没有选中的节点（有选中→扩展），则在屏幕中心创建一个新节点
	while (code === 'KeyE' && !shiftKey && !ctrlKey && !altKey && !metaKey) {
		if (canvas.selection.size > 0) break

		const { minX, minY, maxX, maxY } = canvas.getViewportBBox()
		const x = (minX + maxX) / 2
		const y = (minY + maxY) / 2
		const width = 260 // Obsidian默认长宽
		const height = 60 // Obsidian默认长宽
		const text = '' // 空文本
		// 仿制一个文本节点
		const newNode = canvas.createTextNode({
			pos: { x, y },
			position: 'center',
			save: true, focus: false,
			size: { width, height },
			text,
		})
		// * ℹ️需要更新碰撞箱：刚创建的节点没有
		newNode.bbox = { minX: newNode.x, minY: newNode.y, maxX: newNode.x + newNode.width, maxY: newNode.y + newNode.height }

		canvas.addNode(newNode)
		canvas.requestSave()

		setTimeout(() => {
			canvas.selectOnly(newNode)
			isKeyDown['KeyE'] = false
			newNode.startEditing()
		}, 0);

		break
	}
	// F「Focus」：单按 聚焦到选中的元素
	if (code === 'KeyF' && !shiftKey && !ctrlKey && !altKey && !metaKey)
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
	if (code === 'KeyZ' && !ctrlKey && !altKey && !metaKey)
		canvas.zoomBy(shiftKey ? -0.1 : 0.1)
	// Shift+R：在俩节点之间随机添加连边
	while (code === 'KeyR' && shiftKey && !ctrlKey && !altKey && !metaKey) {
		const selected = selectedNodes(canvas)
		const node1 = selected.next().value
		const node2 = selected.next().value
		if (!node1 || !node2) break
		// * 🚧目前不整那么多花里胡哨的连边：❌两边之间自适应→可以 Alt+Shift+A 调整，❌方向反了→可以反转连边
		addEdge(canvas, node1, node2, 'right', 'left', false)
		break
	}
	// Shift+Alt+Ctrl+E：紧凑布局
	if (code === 'KeyE' && shiftKey && altKey && ctrlKey && !metaKey) {
		const sxy = (n: CanvasNode, x: number, y: number) => setNodePosition(n, x, y)
		const ns = Array.from(canvas.nodes.values())
		const w = ns.map(x => x.width), h = ns.map(x => x.height)
		const { x, y } = packRectangles(w, h)
		for (let i = 0; i < x.length; i++) {
			sxy(ns[i], x[i], y[i])
		}
		new Notice('触发：紧凑布局')
	}
	// Y/Shift+Y: CTDP快速计数
	// * 📅2025-08-20
	// * 📌适用于末尾是整数的所有文字笔记
	// * Y：计数+1
	// * Shift+Y：计数清零
	if (code === 'KeyY' && !ctrlKey && !altKey && !metaKey) {
		// 遍历所有选中的文本节点
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
	}
	// 数字键Digit，小键盘Numpad | ❗被占用了
	if (code.startsWith('Digit') && !shiftKey && !ctrlKey /* && altKey */ && !metaKey) {
		for (const node of selectedNodes(canvas)) {
			if (!isCanvasTextNode(node)) continue
			let n: number
			try { n = parseInt(code.slice(5), 10) } catch { continue }
			const text = node.text
			const line$1 = text.split('\n')[0]
			const rest = text.slice(line$1.length)
			const mdTitleI = line$1.indexOf('# ')
			const mdTitle = mdTitleI >= 0 ? line$1.slice(mdTitleI + 2)
				: line$1.startsWith('**') && line$1.endsWith('**') ? line$1.slice(2, -2) // 对于加粗，视作7级标题
					: line$1
			const newMdTitle = ( // * 📌无需换行
				n == 0 ? mdTitle // 0→空标题
					: n > 6 ? `**${mdTitle}**` // 6级以上→加粗
						: '#'.repeat(n) + ' ' + mdTitle
			)
			const newText = newMdTitle + rest
			node.setText(newText)
		}
	}
}
