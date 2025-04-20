/**
 * 有关「输入文件建议」的方案
 */

import { App, Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, ItemView, OpenViewState, Plugin, prepareFuzzySearch, TFile, ViewState, WorkspaceLeaf } from 'obsidian';
import { BuiltInSuggest, BuiltInSuggestItem } from './typings/suggest';
import { CanvasNodeData } from 'obsidian/canvas';

/**
 * 实际的「文件输入建议」功能
 */
export class PatchEditorSuggest extends EditorSuggest<string> {

	constructor(app: App) {
		super(app);
		console.log('PatchEditorSuggest: constructor');
	}

	latestTriggerInfo: EditorSuggestTriggerInfo;

	onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
		console.log('onTrigger', 'cursor:', cursor, 'editor:', editor, 'file:', file);

		const sub = editor.getLine(cursor.line).substring(0, cursor.ch);
		const match = sub.match(/(\w*)\.canvas$/)?.[1];
		console.log('onTrigger', 'sub:', sub, 'match:', match);
		if (match !== undefined) {
			this.latestTriggerInfo = {
				end: cursor,
				start: {
					ch: cursor.ch - match.length,
					line: cursor.line,
				},
				query: match,
			};
			return this.latestTriggerInfo;
		}

		return null
	}

	async getSuggestions(context: EditorSuggestContext): Promise<string[]> {
		const result: string[] = [];
		console.log('context:', context);

		// 下边是原班代码

		// if (!context?.file) return result;

		// if (context.query.lastIndexOf(".canvas") !== -1 && (this.mode === "block" || this.mode === "heading")) {
		// 	// Get current canvas path from query string
		// 	const path = context.query.substring(0, context.query.lastIndexOf(".canvas") + 7);

		// 	const canvasFile = this.app.metadataCache.getFirstLinkpathDest(path, context.file ? context.file.path : "");

		// 	if (!canvasFile) return result;

		// 	// Get nodes from canvas file
		// 	const nodes = await getNodesFromCanvas(this, canvasFile);

		// 	if (!nodes) return result;
		// 	const suggestions: any[] = [];

		// 	const cM = /\u00A0/g;
		// 	let inputStr = "";
		// 	if (this.mode === "heading") {
		// 		inputStr = (context.query.replace(cM, " ")).normalize("NFC").split("#")[1];
		// 	} else if (this.mode === "block") {
		// 		inputStr = (context.query.replace(cM, " ")).normalize("NFC").split("^")[1];
		// 	}
		// 	const query = prepareFuzzySearch(inputStr);

		// 	let textNodes: any[];
		// 	if (this.mode === "heading") textNodes = nodes.filter((node: any) => (node.label !== undefined));
		// 	else textNodes = nodes.filter((node: any) => (node.text !== undefined));

		// 	textNodes.forEach((node: any) => {
		// 		const queryResult = query(node?.text ?? node?.label);

		// 		if (queryResult !== null) {
		// 			suggestions.push({
		// 				content: node.text ?? node.label,
		// 				display: (node.text ?? node.label).replace(/\n/g, " "),
		// 				path: path,
		// 				type: "block",
		// 				file: canvasFile,
		// 				// @ts-ignore
		// 				node: {
		// 					id: node.id,
		// 					type: "paragraph",
		// 					position: undefined,
		// 					children: [{
		// 						type: "text",
		// 						value: node.text ?? node.label,
		// 						position: undefined
		// 					}]
		// 				},
		// 				idMatch: queryResult.matches,
		// 				matches: null,
		// 				score: queryResult.score,
		// 			});
		// 		}
		// 	});

		// 	return suggestions.length > 0 ? suggestions : result;

		// }
		// console.log(result);
		return result;
	}
	renderSuggestion(value: string, el: HTMLElement): void {
		throw new Error('Method not implemented.');
	}
	selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
		throw new Error('Method not implemented.');
	}
}

export async function tryGetCanvasNodes(suggest: BuiltInSuggest, plugin: Plugin, app: App, context: EditorSuggestContext): Promise<{
	query: string,
	nodes: CanvasNodeData[],
	path: string,
	canvasFile: TFile,
} | null> {
	// * 🚨suggest没有`mode`
	// * ✅有context.query

	const { query, file } = context;
	const END_QUERY_HEADING = '#'
	const END_QUERY_BLOCK = END_QUERY_HEADING + '^'
	// should be either heading or block
	const modeCriterion = query.endsWith(END_QUERY_HEADING) || query.endsWith(END_QUERY_BLOCK)
	const isSuggestForCanvas = query.contains(".canvas") && modeCriterion

	if (!isSuggestForCanvas) return null;
	// Get current canvas path from query string
	const path = query.substring(0, query.lastIndexOf(".canvas") + 7);
	// console.info("path:", path);

	//
	const canvasFile = app.metadataCache.getFirstLinkpathDest(path, file ? file.path : "");
	// console.info("canvasFile:", canvasFile);

	if (!canvasFile) return null;

	// Get nodes from canvas file
	// @ts-ignore
	const nodes = await plugin.getNodesFromCanvas(canvasFile);
	return {
		nodes, query, path, canvasFile
	}
}

export const suggestAround = (suggest: BuiltInSuggest, plugin: Plugin, app: App) => ({
	// ✅【2025-04-20 17:57:55】能成功
	getSuggestions: (old: any) => async (context: EditorSuggestContext): Promise<BuiltInSuggestItem[]> => {
		old.call(suggest, context);

		const result: BuiltInSuggestItem[] = []

		// 从筛选到获取对应canvas的所有节点 //

		// 【2025-04-20 17:59:37】试验结果：suggest?.context === context
		console.log("suggest?.context:", suggest?.context, "context:", context, suggest?.context === context);

		let nodes_result = await tryGetCanvasNodes(suggest, plugin, app, context);
		console.info("nodes:", nodes_result);
		if (nodes_result === null) return result;
		const { nodes, query, path, canvasFile } = nodes_result;

		const suggestions: any[] = [];

		const mode: string = ''; return result;

		const cM = /\u00A0/g;
		let inputStr = "";
		if (mode === "heading") {
			inputStr = (query.replace(cM, " ")).normalize("NFC").split("#")[1];
		} else if (mode === "block") {
			inputStr = (query.replace(cM, " ")).normalize("NFC").split("^")[1];
		}
		const searchQuery = prepareFuzzySearch(inputStr);

		let textNodes: any[];
		if (mode === "heading") textNodes = nodes.filter((node: any) => (node.label !== undefined));
		else textNodes = nodes.filter((node: any) => (node.text !== undefined));

		textNodes.forEach((node: any) => {
			const queryResult = searchQuery(node?.text ?? node?.label);

			if (queryResult !== null) {
				suggestions.push({
					content: node.text ?? node.label,
					display: (node.text ?? node.label).replace(/\n/g, " "),
					path: path,
					type: "block",
					file: canvasFile,
					// @ts-ignore
					node: {
						id: node.id,
						type: "paragraph",
						position: undefined,
						children: [{
							type: "text",
							value: node.text ?? node.label,
							position: undefined
						}]
					},
					idMatch: queryResult.matches,
					matches: null,
					score: queryResult.score,
				});
			}
		});

		return suggestions.length > 0 ? suggestions : result;

	},
	// 这儿的`this`也是`suggest`
	renderSuggestion: (old: any) => (item: BuiltInSuggestItem, el: HTMLElement) => {
		old.call(suggest, item, el);

		console.log('renderSuggestion', suggest, item, el);
		const { type, file } = item;
		console.log('type:', type, 'file:', file);

		// el.setAttribute('data-item-type', item.type);

		if (item.file?.extension === 'canvas') { }

		// * ℹ️这儿是借鉴的「修改」代码
		if (item.type === "block") {
			// el.setAttribute('data-item-node-type', item.node.type);

			// // if ((plugin.settings as any)[item.node.type] === false) return;

			// const start = item.node.position.start.offset;
			// const end = item.node.position.end.offset;

			// let text = item.content.slice(start, end);
			// // let limit: number | undefined = (plugin.settings as any)[item.node.type + 'Lines'];
			// // if (limit) text = extractFirstNLines(text, limit);

			// // Comments are not rendered by the MarkdownRenderer, so in this case we just show the raw comment text
			// if (item.node.type === "comment") {
			// 	render(el, (containerEl) => {
			// 		containerEl.setText(text);
			// 	});
			// 	return;
			// }

			// if (!plugin.settings.iembed) {
			// 	// Render embeds as if in Source Mode
			// 	const embeds = getLeaves(item.node)
			// 		.filter(leaf => leaf.type === 'iembed')
			// 		.sort((a, b) => b.position.start.offset - a.position.start.offset);
			// 	for (const embed of embeds) {
			// 		const embedStart = embed.position.start.offset - start;
			// 		const embedEnd = embed.position.end.offset - start;
			// 		text = text.slice(0, embedStart)
			// 			+ `<span class="cm-s-obsidian embed"><span class="cm-formatting-link"></span><span class="cm-hmd-internal-link">${text.slice(embedStart + 3, embedEnd - 2)}</span><span class="cm-formatting-link"></span></span>`
			// 			+ text.slice(embedEnd);
			// 	}
			// }

			// render(el, async (containerEl) => {
			// 	containerEl.setAttribute('data-line', item.node.position.start.line.toString());
			// 	await MarkdownRenderer.render(app, text, containerEl, item.file.path, this.renderedBlockLinkSuggestionsComponent);
			// 	containerEl.querySelectorAll('.copy-code-button').forEach((el) => el.remove());
			// 	containerEl.querySelectorAll('span.cm-s-obsidian.embed > span.cm-formatting-link:first-child').forEach((el) => {
			// 		el.textContent = '![[';
			// 	});
			// 	containerEl.querySelectorAll('span.cm-s-obsidian.embed > span.cm-formatting-link:last-child').forEach((el) => {
			// 		el.textContent = ']]';
			// 	});
			// });
		}
	},
	// 当建议被打开时
	// 此处的「this」就是`suggest`
	open: (old: any) => () => {// 就是无参的
		// if (!suggest.renderedBlockLinkSuggestionsComponent) this.renderedBlockLinkSuggestionsComponent = new Component();
		// suggest.renderedBlockLinkSuggestionsComponent.load();
		old.call(suggest);
	},
	// 当建议被关闭时
	close: (old: any) => () => { // 就是无参的
		// 此处的「this」就是`suggest`
		console.log('close', suggest);
		// if (plugin.settings.disableClose) return;
		old.call(suggest);
		// suggest.renderedBlockLinkSuggestionsComponent?.unload();
	}
})
