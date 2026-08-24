export type CanvasLinkMode = "heading" | "block";

export const CANVAS_EXTENSION = ".canvas";
export const END_QUERY_HEADING = "#";
export const END_QUERY_BLOCK = `${END_QUERY_HEADING}^`;

/** 根据 Canvas 链接查询识别标题链接、块链接或普通查询。 */
export function getCanvasLinkMode(query: string): CanvasLinkMode | null {

	if (query.includes(CANVAS_EXTENSION + END_QUERY_BLOCK)) return "block";
	if (query.includes(CANVAS_EXTENSION + END_QUERY_HEADING)) return "heading";
	return null;
}
