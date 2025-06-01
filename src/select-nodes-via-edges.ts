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

/**
 * 核心功能：选择当前节点的下游节点
 * @param canvas 画布实例
 * @param maxDepth 最大搜索深度，默认3
 */
function selectDownstreamNodes(canvas: Canvas, maxDepth: number = 1): void {
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

	// 执行下游节点搜索
	const { selectedNodes, depthReached } = findDownstreamNodes(canvas, startNodes, maxDepth);

	// 更新画布选择
	canvas.deselectAll();
	selectedNodes.forEach(node => canvas.select(node));

	// 显示通知
	new Notice(generateSelectionNotice(selectedNodes, depthReached));
}

/**
 * 查找下游节点
 * @param canvas 画布实例
 * @param startNodes 起始节点
 * @param maxDepth 最大搜索深度
 */
function findDownstreamNodes(canvas: Canvas, startNodes: CanvasNode[], maxDepth: number) {
	const visited = new Set<string>(startNodes.map(node => node.id));
	const queue: { node: CanvasNode; depth: number }[] = startNodes.map(node => ({ node, depth: 0 }));
	const selectedNodes: CanvasNode[] = [...startNodes];
	let depthReached = 0;

	while (queue.length > 0) {
		const current = queue.shift()!;
		depthReached = Math.max(depthReached, current.depth);

		if (current.depth >= maxDepth) continue;

		// 查找从当前节点出发的边
		const edges = canvas.getEdgesForNode(current.node);
		const downstreamEdges = edges.filter(edge => edge.from.node === current.node);

		for (const edge of downstreamEdges) {
			const nextNode = edge.to.node;
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
function generateSelectionNotice(nodes: CanvasElement[], depthReached: number): string {
	let text = i18nText({
		[EN_US]: `Selected ${nodes.length} downstream nodes (depth: ${depthReached})`,
		[ZH_CN]: `已选择${nodes.length}个下游节点 (深度: ${depthReached})`,
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
			[ZH_CN]: `\n...等${nodes.length - MAX_DISPLAY}个节点`,
		});
	}

	return text;
}
