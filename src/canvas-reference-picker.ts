import { FuzzySuggestModal, Notice, type App } from "obsidian";
import { planCanvasReferenceSelection, planCanvasReferenceSourceSelection } from "./canvas-reference-model";
import type { CanvasReferenceOccurrence, CanvasReferenceSourceGroup } from "./canvas-reference-model";

type FocusReference = (canvasPath: string, nodeId: string) => Promise<boolean>;

export function openCanvasReferencePicker(
	app: App,
	occurrences: readonly CanvasReferenceOccurrence[],
	focusReference: FocusReference,
): void {
	const plan = planCanvasReferenceSelection(occurrences);
	if (plan.kind === "empty") {
		new Notice("没有白板入口引用当前白板。");
		return;
	}
	const chooseEntry = (entry: CanvasReferenceOccurrence) => { void focusAndReport(entry, focusReference); };
	if (plan.kind === "direct") {
		chooseEntry(plan.entry);
		return;
	}
	if (plan.kind === "choose-entry") {
		new CanvasEntryPicker(app, plan.source, chooseEntry).open();
		return;
	}
	new CanvasSourcePicker(app, plan.sources, (source, sourceWindow) => {
		const next = planCanvasReferenceSourceSelection(source);
		if (next.kind === "direct") chooseEntry(next.entry);
		else sourceWindow.setTimeout(() => new CanvasEntryPicker(app, next.source, chooseEntry).open(), 0);
	}).open();
}

class CanvasSourcePicker extends FuzzySuggestModal<CanvasReferenceSourceGroup> {
	constructor(app: App, private readonly sources: CanvasReferenceSourceGroup[], private readonly onChoose: (source: CanvasReferenceSourceGroup, win: Window) => void) {
		super(app);
		this.setPlaceholder("选择引用当前白板的来源白板…");
		this.setInstructions([{ command: "↑↓", purpose: "选择白板" }, { command: "↵", purpose: "查看入口" }]);
	}

	getItems(): CanvasReferenceSourceGroup[] { return this.sources; }
	getItemText(item: CanvasReferenceSourceGroup): string { return item.name; }

	renderSuggestion(match: { item: CanvasReferenceSourceGroup }, element: HTMLElement): void {
		super.renderSuggestion(match as never, element);
		const detail = element.createEl("small", { cls: "arc-canvas-reference-suggestion-detail" });
		detail.setText(`${match.item.entries.length > 1 ? `${match.item.entries.length} 个入口 · ` : ""}${match.item.path}`);
	}

	onChooseItem(item: CanvasReferenceSourceGroup): void {
		const win = this.containerEl.ownerDocument.defaultView;
		if (win) this.onChoose(item, win);
	}
}

class CanvasEntryPicker extends FuzzySuggestModal<CanvasReferenceOccurrence> {
	constructor(app: App, private readonly source: CanvasReferenceSourceGroup, private readonly onChoose: (entry: CanvasReferenceOccurrence) => void) {
		super(app);
		this.setPlaceholder(`选择「${source.name}」中的入口…`);
		this.setInstructions([{ command: "↑↓", purpose: "选择入口" }, { command: "↵", purpose: "聚焦节点" }]);
	}

	getItems(): CanvasReferenceOccurrence[] { return this.source.entries; }
	getItemText(item: CanvasReferenceOccurrence): string { return item.entryLabel; }

	renderSuggestion(match: { item: CanvasReferenceOccurrence }, element: HTMLElement): void {
		super.renderSuggestion(match as never, element);
		const entry = match.item;
		const kind = entry.kind === "file-node"
			? "白板文件节点"
			: entry.syntax === "embed" ? "嵌入链接" : "文本链接";
		const detail = element.createEl("small", { cls: "arc-canvas-reference-suggestion-detail" });
		detail.setText(`入口类型：${kind}`);
	}

	onChooseItem(item: CanvasReferenceOccurrence): void { this.onChoose(item); }
}

async function focusAndReport(entry: CanvasReferenceOccurrence, focusReference: FocusReference): Promise<void> {
	try {
		const focused = await focusReference(entry.sourceCanvasPath, entry.sourceNodeId);
		if (!focused) new Notice(`无法聚焦入口节点：${entry.sourceCanvasPath}`);
	} catch (error) {
		new Notice(`回溯白板入口失败：${error instanceof Error ? error.message : String(error)}`);
	}
}
