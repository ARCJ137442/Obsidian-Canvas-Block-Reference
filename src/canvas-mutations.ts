import type { Canvas } from "obsidian/canvas"

export interface CanvasMutationOptions {
	/** 是否在变更后请求一帧刷新，默认 true。 */
	refresh?: boolean
	/** 是否在变更后请求保存并进入 Canvas 历史，默认 true。 */
	save?: boolean
}

/**
 * 将一组 Canvas 内存变更合并为一次刷新和一次保存/历史请求。
 *
 * Obsidian 的 requestSave() 会同步刷新 Canvas data，并通过内部 debouncer
 * 记录历史；调用方只在所有节点/连边变更完成后调用一次，避免中间态进入历史。
 */
export function commitCanvasMutation<T>(
	canvas: Canvas,
	mutation: () => T,
	options: CanvasMutationOptions = {},
): T {
	const result = mutation()
	if (options.refresh !== false) canvas.requestFrame()
	if (options.save !== false) canvas.requestSave()
	return result
}
