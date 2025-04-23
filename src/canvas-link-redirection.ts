/**
 * 打开Obsidian白板时，对链接的重定位
 */

import { TFile, ViewState, WorkspaceLeaf } from 'obsidian';
import { Canvas } from 'obsidian/canvas';
import { getCanvasElementById } from './utils';

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
	// TODO: 💡跳转到指定坐标（通过特殊格式）
	// TODO: 💡跳转到多个元素（选中多个并跳转视图）
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
	const element = getCanvasElementById(canvas, elementId);
	if (!element) {
		console.warn(`element with id=${elementId} not found in `, canvas);
		return;
	}
	else console.log(`found element with id=${elementId} in `, canvas, 'element=', element);

	const f = () => {
		canvas.selectOnly(element);
		canvas.zoomToSelection();
	}
	// Go to the block
	// * 📌修复bug by 延时：若在白板的节点上点击链接，会被鼠标点击事件干扰而导致失去选择
	setTimeout && setTimeout(f, MIN_DELAY_TO_AVOID_MOUSE_CLICK_EVENT) || f()
}

/** 能避免鼠标点击事件的最小延迟 */
const MIN_DELAY_TO_AVOID_MOUSE_CLICK_EVENT = 0.001
