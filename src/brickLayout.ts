/**
 * 矩形打包问题：重排矩形
 * * 🎯所有矩形不重叠
 * * 🎯外接矩形面积尽可能小
 * * 🎯外接矩形长宽差值尽可能小（形状尽可能是正方形）
 *
 * @param w 所有矩形的宽
 * @param h 所有矩形的高
 * @returns 对应位置矩形的相对位置(x,y)，以及外接矩形的宽高(w,h)
 */
export function packRectangles(w: number[], h: number[]): { x: number[], y: number[], width: number, height: number } {
	const n = w.length;
	// 按面积大小排序
	const sortOrder = Array.from({ length: n }, (_, i) => i).sort((a, b) => w[b] * h[b] - w[a] * h[a]);
	const ws = new Array(n).fill(0);
	const hs = new Array(n).fill(0);
	for (let i = 0; i < n; ++i) {
		ws[i] = w[sortOrder[i]];
		hs[i] = h[sortOrder[i]];
	}
	// 用排序后的面积计算
	const { x, y, ...res } = _packRectangles(ws, hs)
	// 从排序中还原
	for (let i = 0; i < n; ++i) {
		ws[sortOrder[i]] = x[i];
		hs[sortOrder[i]] = y[i];
	}
	// 返回修改后的结果
	return { x: ws, y: hs, ...res }
}
type RectPlaced = { x: number, y: number, x2: number, y2: number }
function _packRectangles(w: number[], h: number[]): { x: number[], y: number[], width: number, height: number } {
	const n = w.length;
	const x = new Array(n).fill(0);
	const y = new Array(n).fill(0);

	// 当前外接矩形
	let bound = { left: 0, right: 0, bottom: 0, top: 0 };

	// 已放置矩形缓存
	const placed: RectPlaced[] = [];

	// 工具：是否重叠
	function overlap(a: RectPlaced, b: RectPlaced): boolean {
		return !(a.x >= b.x2 || b.x >= a.x2 || a.y >= b.y2 || b.y >= a.y2);
	}

	// 工具：判断矩形放在 (X,Y) 是否合法
	function valid(X: number, Y: number, W: number, H: number): boolean {
		const r = { x: X, y: Y, x2: X + W, y2: Y + H };
		for (const p of placed) if (overlap(r, p)) return false;
		return true;
	}

	// 工具：链式比较，返回第一个负值，或者最后一个
	function cmpChain(...args: number[]) {
		for (let i = 0; i < args.length - 1; i++) {
			if (args[i] > 0) return args[i]
		}
		return args[args.length - 1];
	}

	// 工具：计算方案优先级的指标
	function priorityIndexes(X: number, Y: number, W: number, H: number) {
		const L = Math.min(bound.left, X);
		const R = Math.max(bound.right, X + W);
		const B = Math.min(bound.bottom, Y);
		const T = Math.max(bound.top, Y + H);

		const nW = R - L, nH = T - B;
		const oW = bound.right - bound.left, oH = bound.top - bound.bottom;

		const A = nW * nH;
		const originalA = oW * oH;

		const dWH = Math.abs(nW - nH);
		const dWHo = Math.abs(oW - oH);

		return [dWH - dWHo, A - originalA];
	}

	for (let i = 0; i < n; ++i) {
		const W = w[i], H = h[i];
		const candidates: { x: number, y: number }[] = [];

		// 1. 内部候选：已放置矩形四角
		placed.forEach(p => {
			[[p.x2, p.y], [p.x, p.y2], [p.x2, p.y2], [p.x, p.y]].forEach(([cx, cy]) => {
				if (valid(cx, cy, W, H)) candidates.push({ x: cx, y: cy });
			});
		});

		// 2. 边界候选：四条边外侧贴边
		if (!candidates.length) {
			[
				[bound.left - W, bound.bottom],        // 贴左
				[bound.right, bound.bottom],        // 贴右
				[bound.left, bound.bottom - H],      // 贴下
				[bound.left, bound.top],           // 贴上
			].forEach(([cx, cy]) => {
				if (valid(cx, cy, W, H)) candidates.push({ x: cx, y: cy });
			});
		}

		// 3. 排序：先不扩大，再扩大最小 | 最终按优先级从大到小排序
		candidates.sort((a, b) => {
			const [ddWh1, dA1] = priorityIndexes(a.x, a.y, W, H);
			const [ddWh2, dA2] = priorityIndexes(b.x, b.y, W, H);
			return cmpChain(ddWh1 - ddWh2, dA1 - dA2);
		});

		// 4. 选最优
		const best = candidates[0];
		x[i] = best.x;
		y[i] = best.y;
		placed.push({ x: x[i], y: y[i], x2: x[i] + W, y2: y[i] + H });

		// 5. 更新全局外接矩形
		bound.left = Math.min(bound.left, x[i]);
		bound.right = Math.max(bound.right, x[i] + W);
		bound.bottom = Math.min(bound.bottom, y[i]);
		bound.top = Math.max(bound.top, y[i] + H);
	}

	// 归一化到 (0,0)
	const dx = -bound.left, dy = -bound.bottom;
	for (let i = 0; i < n; i++) { x[i] += dx; y[i] += dy; }

	return { x, y, width: bound.right - bound.left, height: bound.top - bound.bottom };
}
