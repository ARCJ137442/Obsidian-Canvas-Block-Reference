/**
 * 轮换聚焦的纯排序、颜色匹配与 Canvas 解析模型。
 * 可脱离 Obsidian 运行；跨白板按修改时间的排序由服务层负责，
 * 本模块只做「白板内」的空间排序、颜色条件匹配与文档解析。
 */

export type RotationColor = number | string | null;

export type RotationNode = {
	id: string;
	type: string;
	color?: RotationColor;
	x?: number;
	y?: number;
	width?: number;
	height?: number;
};

export type RotationTarget = {
	canvasPath: string;
	nodeId: string;
};

/**
 * 轮换聚焦的条件：按节点颜色筛选参与轮换的节点。
 * - `all` 全部颜色；`default` 默认／未编码（含灰色 0）；数字 0–6 对应内置色；`black`/`white` 走自定义 HEX。
 */
export type RotationColorCondition =
	| "all"
	| "default"
	| "0"
	| "1"
	| "2"
	| "3"
	| "4"
	| "5"
	| "6"
	| "black"
	| "white";

export type RotationDocument = {
	path: string;
	nodes: RotationNode[];
};

const WHITE_HEX_VALUES = new Set(["#ffffff", "#fff"]);
const BLACK_HEX_VALUES = new Set(["#000000", "#000"]);
const BUILT_IN_NUMERIC_CONDITIONS = new Set(["0", "1", "2", "3", "4", "5", "6"]);

export function isRotationColorCondition(value: unknown): value is RotationColorCondition {
	return typeof value === "string"
		&& (
			value === "all"
			|| value === "default"
			|| value === "black"
			|| value === "white"
			|| BUILT_IN_NUMERIC_CONDITIONS.has(value)
		);
}

export function matchesRotationColor(
	color: RotationColor | undefined,
	condition: RotationColorCondition,
): boolean {
	if (condition === "all") return true;
	// 📌 Obsidian Canvas JSON 把内置色存为字符串（如 "3"），历史文件也可能存数字；
	// 统一转字符串比较，数字 3 与字符串 "3" 都算命中黄色。
	const normalized = color === null || color === undefined || color === "" ? "default" : String(color);

	if (condition === "default") {
		// 默认／未编码（null、空串）与内置灰色 0 都归入「默认」。
		return normalized === "default" || normalized === "0";
	}
	if (condition === "black") return BLACK_HEX_VALUES.has(normalized);
	if (condition === "white") return WHITE_HEX_VALUES.has(normalized);
	// 内置色：严格精确匹配，不做近似映射（自定义色不并入内置色）。
	return normalized === condition;
}

export function nodeCenter(node: RotationNode): { x: number; y: number } {
	const x = (node.x ?? 0) + (node.width ?? 0) / 2;
	const y = (node.y ?? 0) + (node.height ?? 0) / 2;
	return { x, y };
}

/**
 * 按「中心点 x 升序为主、y 升序为次」对白板内节点排序，产出该白板的轮换目标。
 * 空间上相邻的节点在序列中相邻，便于依次聚焦。
 */
export function sortRotationTargetsInCanvas(
	nodes: RotationNode[],
	canvasPath: string,
	condition: RotationColorCondition,
): RotationTarget[] {
	return nodes
		.filter((node) => matchesRotationColor(node.color, condition))
		.map((node) => ({ node, center: nodeCenter(node) }))
		.sort((left, right) => left.center.x - right.center.x || left.center.y - right.center.y)
		.map(({ node }) => ({ canvasPath, nodeId: node.id }));
}

/**
 * 把按「修改时间旧→新」排列好的白板文档，展开为一条扁平的轮换目标序列。
 * 白板无匹配节点时自然被跳过；全部为空时上层据此提示。
 */
export function buildRotationSequence(
	documents: RotationDocument[],
	condition: RotationColorCondition,
): RotationTarget[] {
	const targets: RotationTarget[] = [];
	for (const document of documents) {
		targets.push(...sortRotationTargetsInCanvas(document.nodes, document.path, condition));
	}
	return targets;
}

/**
 * 轮换的当前位置锚点，由「当前焦点状态」解析而来：
 * - `selected`：当前白板选中了匹配节点，index 为该节点在序列中的位置（多选按轮换顺序取第一个）。
 * - `canvas`：聚焦了白板但无匹配选中，start 为该白板第一个匹配节点在序列中的位置。
 * - `none`：没有聚焦任何白板。
 */
export type RotationAnchor =
	| { kind: "selected"; index: number }
	| { kind: "canvas"; start: number }
	| { kind: "none" };

/**
 * 由锚点与方向计算下一个聚焦目标在序列中的下标（回环）。
 * - `selected`：从选中节点继续 → next=index+1 / previous=index-1。
 * - `canvas`：无选中时 next 落到该白板第一个匹配节点；previous 到该白板之前一个节点（首板回环到序列末尾）。
 * - `none`：next 从全局第一个开始；previous 从全局最后一个开始。
 */
export function rotationTargetIndex(
	anchor: RotationAnchor,
	direction: -1 | 1,
	length: number,
): number | undefined {
	if (length <= 0) return undefined;
	switch (anchor.kind) {
		case "selected":
			return (anchor.index + direction + length) % length;
		case "canvas":
			return direction < 0
				? (anchor.start - 1 + length) % length
				// 📌 start 可能等于 length（活动板无匹配节点且为最后一块时越界），取模回环。
				: anchor.start % length;
		case "none":
			return direction < 0 ? length - 1 : 0;
	}
}

/** 解析 Canvas JSON 文本，保留节点空间坐标（x/y/width/height）用于板内排序。 */
export function parseRotationDocument(rawText: string, path: string): RotationDocument {
	let parsed: unknown;
	try {
		parsed = JSON.parse(rawText);
	} catch {
		throw new Error(`Canvas JSON 无法解析：${path}`);
	}
	if (!isRecord(parsed) || !Array.isArray(parsed.nodes)) {
		throw new Error(`Canvas 结构无效：${path}`);
	}
	const nodes = parsed.nodes.map((value: unknown) => normalizeRotationNode(value));
	return { path, nodes };
}

function normalizeRotationNode(value: unknown): RotationNode {
	if (!isRecord(value)) return { id: "", type: "unknown" };
	return {
		id: typeof value.id === "string" ? value.id : "",
		type: typeof value.type === "string" ? value.type : "unknown",
		color: isRotationColor(value.color) ? value.color : undefined,
		x: finiteNumberOr(value.x),
		y: finiteNumberOr(value.y),
		width: finiteNumberOr(value.width),
		height: finiteNumberOr(value.height),
	};
}

function finiteNumberOr(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isRotationColor(value: unknown): value is RotationColor {
	return value === null || typeof value === "number" || typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
