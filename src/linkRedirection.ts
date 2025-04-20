/**
 * 打开Obsidian白板时，对链接的重定位
 */


import { TFile, ViewState, WorkspaceLeaf } from 'obsidian';

/** Custom logic when go to file */
export function openingFile(leaf: WorkspaceLeaf, file: TFile, state?: ViewState) {
	// Check if file is a canvas file
	console.log('openingFile', leaf, file, state);
	// @ts-ignore
	if (file.extension === "canvas" && state?.eState?.subpath); else return;
	// @ts-ignore
	const canvas = leaf.view?.canvas;
	if (!canvas) return;

	// Get the node id
	// @ts-ignore
	const id = state.eState.subpath.replace("#\^", "");
	redirectToNode(canvas, id)
}

/**
 * 功能：画面重定向到节点
 * @param canvas 所在白板
 * @param nodeId 节点的id（类似MD5值）
 * @returns 空
 */
function redirectToNode(canvas: any, nodeId: string) {
	// Try to get node in canvas
	const node = canvas.nodes.get(nodeId);
	if (!node) {
		console.warn(`node with id=${nodeId} not found in `, canvas);
		return;
	}
	else console.log(`found node with id=${nodeId} in `, canvas, 'node=', node);


	// Go to the block
	canvas.selectOnly(node);
	canvas.zoomToSelection();
}
