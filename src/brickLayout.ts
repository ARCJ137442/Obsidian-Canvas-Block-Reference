/**
 * 矩形打包问题：使用按面积降序的 shelf heuristic 重排矩形。
 *
 * 这不是 NP-hard 的最优装箱求解器，但保证不重叠、结果稳定，并把原先
 * “候选点 × 已放置矩形”嵌套扫描的最坏 O(n^3) 降到排序主导的 O(n log n)。
 * 对个人白板的快速整理，响应速度比追求全局最优更重要。
 *
 * @param w 所有矩形的宽
 * @param h 所有矩形的高
 * @returns 对应位置矩形的相对位置(x,y)，以及外接矩形的宽高(w,h)
 */
export function packRectangles(w: number[], h: number[]): { x: number[], y: number[], width: number, height: number } {
	if (w.length !== h.length) throw new Error("Rectangle width/height arrays must have the same length")

	const n = w.length
	const widths = w.map(value => Math.max(0, value))
	const heights = h.map(value => Math.max(0, value))
	const sortOrder = Array.from({ length: n }, (_, i) => i).sort((a, b) => {
		const areaDifference = widths[b] * heights[b] - widths[a] * heights[a]
		return areaDifference || Math.max(widths[b], heights[b]) - Math.max(widths[a], heights[a]) || a - b
	})
	const x = new Array<number>(n).fill(0)
	const y = new Array<number>(n).fill(0)

	const totalArea = widths.reduce((area, width, i) => area + width * heights[i], 0)
	const maximumWidth = widths.reduce((maximum, width) => Math.max(maximum, width), 0)
	const targetWidth = Math.max(maximumWidth, Math.ceil(Math.sqrt(totalArea)))

	let cursorX = 0
	let cursorY = 0
	let shelfHeight = 0
	let maximumRight = 0

	for (const originalIndex of sortOrder) {
		const width = widths[originalIndex]
		const height = heights[originalIndex]
		if (cursorX > 0 && cursorX + width > targetWidth) {
			cursorY += shelfHeight
			cursorX = 0
			shelfHeight = 0
		}

		x[originalIndex] = cursorX
		y[originalIndex] = cursorY
		cursorX += width
		shelfHeight = Math.max(shelfHeight, height)
		maximumRight = Math.max(maximumRight, cursorX)
	}

	return {
		x,
		y,
		width: maximumRight,
		height: cursorY + shelfHeight,
	}
}
