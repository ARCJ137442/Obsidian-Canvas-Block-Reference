/**
 * 白板颜色 → 任务语义 的配置。
 *
 * 与「轮换聚焦条件」（rotationColor）相互独立：轮换聚焦只用一个颜色条件，
 * 而颜色语义把内置色映射到任务状态（受阻/取消、待推进、推进中、已完成）。
 * life-panel 等扩展通过 getColorSemantics() 读取，按语义反查颜色码来收集任务节点。
 */

export type TaskSemanticId = "blocked" | "pending" | "progress" | "done";

export type ColorSemantics = Partial<Record<string, TaskSemanticId>>;

/** 默认语义：红=受阻/取消、橙=待推进、黄=推进中、绿=已完成。 */
export const DEFAULT_COLOR_SEMANTICS: ColorSemantics = {
	"1": "blocked",
	"2": "pending",
	"3": "progress",
	"4": "done",
};

const COLOR_CODES = ["1", "2", "3", "4"];
const TASK_SEMANTIC_IDS = new Set<TaskSemanticId>(["blocked", "pending", "progress", "done"]);

export function isTaskSemanticId(value: unknown): value is TaskSemanticId {
	return typeof value === "string" && TASK_SEMANTIC_IDS.has(value as TaskSemanticId);
}

/** 校验并补全颜色语义；旧数据或非法值回退到默认。 */
export function normalizeColorSemantics(value: unknown): ColorSemantics {
	if (!isRecord(value)) return { ...DEFAULT_COLOR_SEMANTICS };
	const result: ColorSemantics = {};
	for (const color of COLOR_CODES) {
		const semantic = value[color];
		result[color] = isTaskSemanticId(semantic)
			? semantic
			: DEFAULT_COLOR_SEMANTICS[color];
	}
	return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
