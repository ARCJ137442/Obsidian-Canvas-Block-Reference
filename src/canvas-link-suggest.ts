/**
 * 有关「输入文件建议」的方案
 * * 📌【2025-04-20 23:59:31】目前是借鉴了原仓库的方案，以及 <https://github.com/RyotaUshio/obsidian-rendered-block-link-suggestions>
 * * 💡【2025-04-20 23:59:34】后续或可参考 <https://github.com/Doggy-Footprint/Suggest-Notes/blob/master/obsidian_srcs/main.ts#L189> 的方案，更加文雅
 */

import { App, Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, ItemView, MetadataCache, OpenViewState, Plugin, prepareFuzzySearch, TFile, ViewState, WorkspaceLeaf } from 'obsidian';
import { BlockLinkInfo, BuiltInSuggest, BuiltInSuggestItem } from './typings/suggest';
import { CanvasNode, CanvasView } from 'obsidian/canvas';
import { getCanvasElementTitle, getFileLink } from './utils';
import { parseCanvasNodes } from './canvas-link-suggest-data';

// /**
//  * 实际的「文件输入建议」功能
//  */
// export class PatchEditorSuggest extends EditorSuggest<BuiltInSuggestItem> {

// 	constructor(app: App) {
// 		super(app);
// 		console.log('PatchEditorSuggest: constructor');
// 	}

// 	latestTriggerInfo: EditorSuggestTriggerInfo;

// 	onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
// 		// console.log('onTrigger', 'cursor:', cursor, 'editor:', editor, 'file:', file);

// 		// const sub = editor.getLine(cursor.line).substring(0, cursor.ch);
// 		// const match = sub.match(/(\w*)\.canvas$/)?.[1];
// 		// console.log('onTrigger', 'sub:', sub, 'match:', match);
// 		// if (match !== undefined) {
// 		// 	this.latestTriggerInfo = {
// 		// 		end: cursor,
// 		// 		start: {
// 		// 			ch: cursor.ch - match.length,
// 		// 			line: cursor.line,
// 		// 		},
// 		// 		query: match,
// 		// 	};
// 		// 	return this.latestTriggerInfo;
// 		// }

// 		return null
// 	}

// 	async getSuggestions(context: EditorSuggestContext): Promise<BuiltInSuggestItem[]> {
// 		console.log('class/getSuggestions context:', context);

// 		return await getSuggestions(context, this.app);
// 	}
// 	renderSuggestion(value: BuiltInSuggestItem, el: HTMLElement): void {
// 		throw new Error('Method not implemented.');
// 	}
// 	selectSuggestion(value: BuiltInSuggestItem, evt: MouseEvent | KeyboardEvent): void {
// 		throw new Error('Method not implemented.');
// 	}
// }

const CANVAS_EXTENSION = '.canvas'
const END_QUERY_HEADING = '#'
const END_QUERY_BLOCK = END_QUERY_HEADING + '^'

const canvasNodesCache = new Map<string, { mtime: number, nodes: CanvasNode[] }>()


/** 获取链接的模式，如`[[file#title]]`、`[[file#^block]]` */
function tryGetLinkMode(query: string): 'heading' | 'block' | null {
	// should be either heading or block
	const mode = (
		query.contains(CANVAS_EXTENSION + END_QUERY_BLOCK) ? 'block'
			: query.contains(CANVAS_EXTENSION + END_QUERY_HEADING) ? 'heading' // 必须放后边：包括了 `#`
				: null
	)

	return mode
}

async function tryGetCanvasNodes(app: App, context: EditorSuggestContext): Promise<{
	query: string,
	nodes: CanvasNode[],
	path: string,
	canvasFile: TFile,
} | null> {
	// * 🚨suggest没有`mode`
	// * ✅有context.query

	const { query, file } = context;
	const isSuggestForCanvas = query.contains(CANVAS_EXTENSION)

	if (!isSuggestForCanvas) return null;
	// Get current canvas path from query string
	const path = query.substring(0, query.lastIndexOf(CANVAS_EXTENSION) + 7);
	// console.info("path:", path);

	//
	const canvasFile = app.metadataCache.getFirstLinkpathDest(path, file ? file.path : "");
	// console.info("canvasFile:", canvasFile);

	if (!canvasFile) return null;

	// Get nodes from canvas file
	// @ts-ignore
	const nodes = await getNodesFromCanvas(app, canvasFile);

	return { nodes, query, path, canvasFile }
}

/** 通过读取文件的方式，获取白板中的所有节点 */
async function getNodesFromCanvas(app: App, canvasFile: TFile) {
	// 白板已打开时优先使用内存中的 Canvas，避免读取磁盘缓存看不到未保存变更。
	for (const leaf of app.workspace.getLeavesOfType('canvas')) {
		const view = leaf.view as CanvasView | null
		if (view?.file?.path !== canvasFile.path || !view.canvas) continue
		return [...view.canvas.nodes.values()]
	}

	// 未打开的白板才回退到 Vault 缓存；按文件 mtime 缓存解析结果，避免每次输入都 JSON.parse。
	const cached = canvasNodesCache.get(canvasFile.path)
	if (cached?.mtime === canvasFile.stat.mtime) return cached.nodes

	try {
		const canvasFileContent = await app.vault.cachedRead(canvasFile)
		const nodes = parseCanvasNodes(canvasFileContent) as CanvasNode[]
		canvasNodesCache.set(canvasFile.path, { mtime: canvasFile.stat.mtime, nodes })
		return nodes
	} catch (error) {
		console.warn(`[CanvasReferencePlugin] unable to read canvas file: ${canvasFile.path}`, error)
		return []
	}
}

/** 根据白板数据生成相关建议 */
function generateSuggestions(context: EditorSuggestContext, query: string, nodes: CanvasNode[], app: App, file: TFile) {
	// 链接的格式：标题还是块，还是没有
	const mode = tryGetLinkMode(query);
	if (mode === null) return null;

	const suggestions: BuiltInSuggestItem[] = [];

	// 处理查询字符串，并提供模糊搜索
	const cM = /\u00A0/g; // 零宽空格
	let inputStr;
	switch (mode) {
		case "heading":
			inputStr = (query.replace(cM, " ")).normalize("NFC").split(END_QUERY_HEADING)[1];
			break;
		case "block":
			inputStr = (query.replace(cM, " ")).normalize("NFC").split(END_QUERY_BLOCK)[1];
			break;
		default:
			inputStr = "";
	}
	const searchQuery = prepareFuzzySearch(inputStr);

	// 原先要根据不同「模式」过滤，现在只需过滤「文本节点」
	// * 💡或许后续还能根据「首行是否为标题」来过滤？
	let nodePredicate;
	// 针对纯文本节点 text
	const hasText = (node: CanvasNode) => 'text' in node;
	// 针对纯文本节点 group
	const hasLabel = (node: CanvasNode) => 'label' in node;
	switch (mode) {
		case "heading":
			nodePredicate = (node: CanvasNode) => hasText(node);
			break;
		case "block":
			nodePredicate = (node: CanvasNode) => hasText(node) || hasLabel(node);
			break;
		default:
			nodePredicate = (_: CanvasNode) => true;
	}
	const textNodes: CanvasNode[] = nodes.filter(nodePredicate);

	// console.log(
	// 	'mode:', mode,
	// 	'searchQuery:', searchQuery,
	// 	'inputStr:', inputStr,
	// 	'textNodes:', textNodes,
	// )

	for (const node of textNodes) {
		// 生成建议：内容
		const content = getCanvasElementTitle(node);
		if (!content) continue;
		const queryResult = searchQuery(content);
		if (queryResult === null) continue;
		// console.log(`queryResult for node ${node.id}:`, queryResult, node);

		const { matches, score } = queryResult;
		// if (matches.length === 0) continue; // ! ❌不能这样做：很多的匹配都是没有的

		// 生成建议：位置
		// ! 不能没有：否则会让其它插件报错，导致一个报错其它全部完蛋（无法渲染）
		// 📄`Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'start')` @ plugin:rendered-block-link-suggestions:234
		const position: BlockLinkInfo['node']['position'] = {
			// * 📌【2025-04-20 23:46:01】使用假的「位置信息」：白板的卡片并非文章的块，无需组织信息
			// @ts-ignore
			start: context.start,
			// @ts-ignore
			end: context.end,
			// ! ❌【2025-04-20 23:46:27】加了反而不显示
			// start: {
			// 	col: context.start.ch,
			// 	line: context.start.line,
			// 	offset: 0
			// },
			// end: {
			// 	col: context.end.ch,
			// 	line: context.end.line,
			// 	offset: 0
			// },
			indent: []
		}
		const suggestion: BlockLinkInfo = {
			type: "block",
			content,
			display: content.replace(/\n/g, " "),
			path: getFileLink(app, file),
			subpath: node.id,
			file,
			idMatch: matches,
			matches,
			score,
			node: {
				id: node.id,
				type: "paragraph",
				position, // 实际上他们并没有位置信息
				// * 📌【2025-04-20 23:56:38】↓没了下边这个，链接就不剩下了
				children: [{
					type: "text",
					// @ts-ignore
					value: content,
					position, // 实际上他们并没有位置信息
				}]
			},
		}

		suggestions.push(suggestion);
	}

	// 按分数排列
	suggestions.sort((a: BuiltInSuggestItem, b: BuiltInSuggestItem): number => b.score - a.score);
	// console.log('suggestions:', suggestions);

	return suggestions.length > 0 ? suggestions : null;
}

/** 经过重整后能提供「链接建议」的函数 */
async function getSuggestions(context: EditorSuggestContext, app: App): Promise<BuiltInSuggestItem[] | null> {
	// 从筛选到获取对应canvas的所有节点 //

	// 【2025-04-20 17:59:37】试验结果：suggest?.context === context
	// console.log("suggest?.context:", suggest?.context, "context:", context, suggest?.context === context);

	let nodesResult = await tryGetCanvasNodes(app, context);
	// console.info("nodes_result:", nodes_result);
	if (nodesResult === null) return null;
	const { query, nodes, path, canvasFile } = nodesResult;

	// 开始根据节点提供建议 //
	return generateSuggestions(context, query, nodes, app, canvasFile);
}

/** 用于外部的 around 函数，拦截式给外部添加功能 */
export const suggestAround = (suggest: BuiltInSuggest, app: App) => ({
	// ✅【2025-04-20 17:57:55】能成功
	getSuggestions: (old: any) => async (context: EditorSuggestContext): Promise<BuiltInSuggestItem[]> => {
		const oldResult = await old.call(suggest, context) ?? [];
		// 计算并返回建议
		const totalResult = await getSuggestions(context, app) ?? oldResult; // 若没找到卡片，还是返回原来的「未找到结果」
		// @ts-ignore
		return totalResult; // 返回最终结果
	},
})
