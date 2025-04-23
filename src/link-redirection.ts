/**
 * 打开Obsidian白板时，对链接的重定位
 */

import { TFile, ViewState, WorkspaceLeaf } from 'obsidian';
import { Canvas } from 'obsidian/canvas';

/** Custom logic when go to file */
export function openingFile(leaf: WorkspaceLeaf, file: TFile, state?: ViewState) {
	// Check if file is a canvas file
	// @ts-ignore
	if (file.extension === "canvas"); else return;
	// @ts-ignore
	const canvas: Canvas = leaf.view?.canvas;
	if (!canvas) return;

	// 获取子路径
	// @ts-ignore
	if (!state?.eState?.subpath) return;
	// @ts-ignore
	const subpath: string = state.eState.subpath
	// Get the node id
	const id = subpath.replace("#\^", "");
	redirectToElement(canvas, id)
}

/**
 * 功能：画面重定向到元素
 * @param canvas 所在白板
 * @param elementId 元素的id（类似MD5值）
 * @returns 空
 */
function redirectToElement(canvas: Canvas, elementId: string) {
	// Try to get element in canvas
	const element = canvas.nodes.get(elementId) ?? canvas.edges.get(elementId);
	if (!element) {
		console.warn(`element with id=${elementId} not found in `, canvas);
		return;
	}
	else console.log(`found element with id=${elementId} in `, canvas, 'element=', element);


	// Go to the block
	canvas.selectOnly(element);
	canvas.zoomToSelection();
}
