import { EditorSuggestContext, Plugin, prepareFuzzySearch, TFile, ViewState, WorkspaceLeaf } from 'obsidian';
import { around } from "monkey-around";
import { CMD_copyCanvasCardReference } from './commands';
import { openingFile } from './linkRedirection';
import { BuiltInSuggest, BuiltInSuggestItem } from './typings/suggest';
import { suggestAround } from './cardSuggest';

export default class CanvasReferencePlugin extends Plugin {

	async onload() {
		// 功能：链接寻路
		this.patchWorkspaceLeaf();

		// 功能：
		this.patchEditorSuggest();

		// 功能：复制块链接 | 注册命令
		this.registerCommands();
	}

	onunload() {

	}

	registerCommands() {
		// 所有命令（根据APP注册（拿到引用））
		const COMMANDS = [
			CMD_copyCanvasCardReference(this.app)
		]
		// 添加命令
		for (const cmd of COMMANDS)
			this.addCommand(cmd);
	}

	patchWorkspaceLeaf() {
		// ! ❌↓失败：「注册」不是这么用的，应该是注册一个回调函数
		// this.register(() => new PatchWorkSpaceLeaf());
		// return
		this.register(around(WorkspaceLeaf.prototype, {
			// 钩子：打开文件
			openFile: (old) => async function (file: TFile, state?: ViewState) {
				// 原先的函数
				await old.call(this, file, state);
				// 调用自定义钩子
				openingFile(this, file, state);
			}
		}));
	}

	getBuiltInSuggest(): BuiltInSuggest {
		// @ts-ignore
		return this.app.workspace.editorSuggest.suggests[0];
	}

	patchEditorSuggest() {
		// console.log('patchEditorSuggest')
		// this.registerEditorSuggest(new PatchEditorSuggest(this.app));
		// console.log('patchEditorSuggest done');
		// return

		// * 📌以下代码借鉴自 <https://github.com/RyotaUshio/obsidian-rendered-block-link-suggestions>
		// * ❗这个是「替换」而非「新增」，不一定用得上
		// * 💭【2025-04-20 18:16:39】这儿能跑通，那就不用单独的class

		// builtin suggest
		const suggest = this.getBuiltInSuggest();
		const plugin = this;
		const app = this.app;

		this.register(around(suggest.constructor.prototype, suggestAround(suggest, app)));

		return


		// @ts-ignore
		const suggests = this.app.workspace.editorSuggest.suggests;
		// @ts-ignore
		const fileSuggest = suggests.find((suggest) => suggest.mode === 'file');

		console.info("fileSuggest", fileSuggest)
		if (!fileSuggest) {
			console.log('fileSuggest not found, variables is',
				this.app.workspace,
				// @ts-ignore
				this.app.workspace?.editorSuggest.suggests,
				// @ts-ignore
				this.app.workspace?.editorSuggest?.suggests);
			return;
		}

		const fileSuggestConstructor = fileSuggest.constructor;

		// ! 🎯【2025-04-19 23:11:35】目标1：修复这个「文件小节建议」
		// ! 🎯【2025-04-19 23:11:39】目标2：不仅仅通过「内在命令」，还能直接通过白板卡片右键菜单来设置
		// * 💡【2025-04-20 15:54:40】破局：寻找那些同样有「文件输入建议」的扩展——找到了 <https://github.com/RyotaUshio/obsidian-rendered-block-link-suggestions>
		const uninstaller = around(fileSuggestConstructor.prototype, {
			getSuggestions: (next: any) =>
				async function (context: EditorSuggestContext) {
					console.log('getSuggestions');
					const result = await next.call(this, context);

					if (this.mode === "file") return result;

					if (context.query.lastIndexOf(".canvas") !== -1 && (this.mode === "block" || this.mode === "heading")) {
						// Get current canvas path from query string
						const path = context.query.substring(0, context.query.lastIndexOf(".canvas") + 7);

						const canvasFile = this.app.metadataCache.getFirstLinkpathDest(path, context.file ? context.file.path : "");

						if (!canvasFile) return result;

						// Get nodes from canvas file
						const nodes = await this.getNodesFromCanvas(canvasFile);

						if (!nodes) return result;
						const suggestions: any[] = [];

						const cM = /\u00A0/g;
						let inputStr = "";
						if (this.mode === "heading") {
							inputStr = (context.query.replace(cM, " ")).normalize("NFC").split("#")[1];
						} else if (this.mode === "block") {
							inputStr = (context.query.replace(cM, " ")).normalize("NFC").split("^")[1];
						}
						const query = prepareFuzzySearch(inputStr);

						let textNodes: any[];
						if (this.mode === "heading") textNodes = nodes.filter((node: any) => (node.label !== undefined));
						else textNodes = nodes.filter((node: any) => (node.text !== undefined));

						textNodes.forEach((node: any) => {
							const queryResult = query(node?.text ?? node?.label);

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

					}
					// console.log(result);
					return result;
				},
		});
		this.register(uninstaller);
	}
}

