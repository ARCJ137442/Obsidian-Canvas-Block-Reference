/**
 * 可通过快捷键调用的命令
 * * 顺着连边选择下游节点
 *
 * 📌通知功能`Notice`参考自《copy-canvas-element-reference.ts》
 */

import { Canvas, CanvasElement, CanvasNode } from 'obsidian/canvas';
import { App, Notice } from 'obsidian';
import { getActiveCanvasView, getCanvasTitleOneLine, isCanvasNode, ParamEventRegister, registerCanvasMenuItem } from './utils';
import { EN_US, i18nText, ZH_CN } from './i18n';

/**
 * 注册事件：右键菜单选择下游节点
 */
export const EVENT_selectDownstreamNodesMenu: ParamEventRegister = registerCanvasMenuItem({
	on: ["canvas:node-menu", "canvas:selection-menu"],
	item: {
		title: (_) => i18nText({
			[EN_US]: "Select downstream nodes",
			[ZH_CN]: "选择下游节点",
		}),
		icon: "arrow-down",
		section: "action",
		onClick: (canvas: Canvas) => {
			selectDownstreamNodes(canvas);
		}
	}
})

/**
 * 注册事件：右键菜单选择上游节点
 */
export const EVENT_selectUpstreamNodesMenu: ParamEventRegister = registerCanvasMenuItem({
	on: ["canvas:node-menu", "canvas:selection-menu"],
	item: {
		title: (_) => i18nText({
			[EN_US]: "Select upstream nodes",
			[ZH_CN]: "选择上游节点",
		}),
		icon: "arrow-up",
		section: "action",
		onClick: (canvas: Canvas) => {
			selectUpstreamNodes(canvas);
		}
	}
})

/** 对接外部插件 */
export const CMD_selectDownstreamNodes = (app: App) => ({
	id: 'select-downstream-nodes',
	name: i18nText({
		[EN_US]: 'Select downstream nodes via edges',
		[ZH_CN]: '顺着连边选择下游节点',
	}),
	checkCallback(checking: boolean) {
		const result = getActiveCanvasView(app);
		if (!result) return false;

		if (checking) return true;

		const { canvas } = result;
		selectDownstreamNodes(canvas);
		return true;
	}
})

/** 对接外部插件 - 上游节点 */
export const CMD_selectUpstreamNodes = (app: App) => ({
	id: 'select-upstream-nodes',
	name: i18nText({
		[EN_US]: 'Select upstream nodes via edges',
		[ZH_CN]: '顺着连边选择上游节点',
	}),
	checkCallback(checking: boolean) {
		const result = getActiveCanvasView(app);
		if (!result) return false;

		if (checking) return true;

		const { canvas } = result;
		selectUpstreamNodes(canvas);
		return true;
	}
})

/**
 * 核心功能：通过边选择节点
 * @param canvas 画布实例
 * @param maxDepth 最大搜索深度，默认1
 * @param getAdjacentNodes 获取相邻节点的函数
 * @param isUpstream 是否为上游节点选择
 */
function selectNodesViaEdges(
	canvas: Canvas,
	maxDepth: number = 1,
	getAdjacentNodes: (canvas: Canvas, node: CanvasNode) => CanvasNode[],
	isUpstream: boolean = false,
): void {
	const selection = canvas.selection;
	if (selection.size === 0) {
		new Notice(i18nText({
			[EN_US]: "No node selected",
			[ZH_CN]: "未选择任何节点",
		}));
		return;
	}

	// 获取起始节点
	const startNodes: CanvasNode[] = Array.from(selection.values()).filter(isCanvasNode);

	// 执行节点搜索
	const { selectedNodes, depthReached } = findNodesViaEdges(canvas, startNodes, maxDepth, getAdjacentNodes);

	// 更新画布选择
	canvas.deselectAll();
	selectedNodes.forEach(node => canvas.select(node));

	// 显示通知
	new Notice(generateSelectionNotice(selectedNodes, depthReached, isUpstream));
}

/**
 * 快捷方式：选择当前节点的下游节点
 */
function selectDownstreamNodes(canvas: Canvas, maxDepth: number = 1): void {
	selectNodesViaEdges(canvas, maxDepth,
		(canvas, node) => canvas.getEdgesForNode(node)
			.filter(edge => edge.from.node === node)
			.map(edge => edge.to.node),
		false
	);
}

/**
 * 快捷方式：选择当前节点的上游节点
 */
function selectUpstreamNodes(canvas: Canvas, maxDepth: number = 1): void {
	selectNodesViaEdges(canvas, maxDepth,
		(canvas, node) => canvas.getEdgesForNode(node)
			.filter(edge => edge.to.node === node)
			.map(edge => edge.from.node),
		true
	);
}


/**
 * 通过边查找节点
 */
function findNodesViaEdges(
	canvas: Canvas,
	startNodes: CanvasNode[],
	maxDepth: number,
	getAdjacentNodes: (canvas: Canvas, node: CanvasNode) => CanvasNode[],
	isUpstream: boolean = false,
) {
	const visited = new Set<string>(startNodes.map(node => node.id));
	const queue: { node: CanvasNode; depth: number }[] = startNodes.map(node => ({ node, depth: 0 }));
	const selectedNodes: CanvasNode[] = [...startNodes];
	let depthReached = 0;

	while (queue.length > 0) {
		const current = queue.shift()!;
		depthReached = Math.max(depthReached, current.depth);

		if (current.depth >= maxDepth) continue;

		// 获取相邻节点
		const adjacentNodes = getAdjacentNodes(canvas, current.node);

		for (const nextNode of adjacentNodes) {
			if (!visited.has(nextNode.id)) {
				visited.add(nextNode.id);
				selectedNodes.push(nextNode);
				queue.push({ node: nextNode, depth: current.depth + 1 });
			}
		}
	}

	return { selectedNodes, depthReached };
}

/** 生成选择结果通知 */
function generateSelectionNotice(nodes: CanvasElement[], depthReached: number, isUpstream: boolean = false): string {
	let text = i18nText({
		[EN_US]: isUpstream
			? `Selected ${nodes.length} upstream nodes (depth: ${depthReached})`
			: `Selected ${nodes.length} downstream nodes (depth: ${depthReached})`,
		[ZH_CN]: isUpstream
			? `已选择${nodes.length}个上游节点 (深度: ${depthReached})`
			: `已选择${nodes.length}个下游节点 (深度: ${depthReached})`,
	});

	// 节点信息摘要
	const MAX_DISPLAY = 3;
	for (let i = 0; i < Math.min(nodes.length, MAX_DISPLAY); i++) {
		const node = nodes[i];
		const title = getCanvasTitleOneLine(node, 15);
		text += `\n${i + 1}. ${title || `Node ${node.id.substring(0, 4)}`}`;
	}

	if (nodes.length > MAX_DISPLAY) {
		text += i18nText({
			[EN_US]: `\n...and ${nodes.length - MAX_DISPLAY} more`,
			[ZH_CN]: `\n...及${nodes.length - MAX_DISPLAY}个节点`,
		});
	}

	return text;
}
