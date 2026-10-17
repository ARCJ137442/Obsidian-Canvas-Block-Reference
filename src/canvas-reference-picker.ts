import { FuzzySuggestModal, Notice, type App } from "obsidian";
import { planCanvasReferenceSelection, planCanvasReferenceSourceSelection, sortCanvasCandidatesByRecency } from "./canvas-reference-model";
import type { CanvasReferenceOccurrence, CanvasReferenceRecencyResolver, CanvasReferenceSourceGroup, CanvasReferenceNavigationDirection } from "./canvas-reference-model";
import { DEFAULT_CANVAS_SHORTCUT_SETTINGS, formatShortcutCode } from "./canvas-shortcuts";

export type CanvasTarget = { path: string; name: string; lastJumpedAt?: number };
type NavigationPickerOptions = { direction?: CanvasReferenceNavigationDirection; shortcutCode?: string };
export type CanvasReferencePickerOptions = NavigationPickerOptions & {
	getSourceRecency?: (path: string) => number | undefined;
	getEntryRecency?: CanvasReferenceRecencyResolver;
	onFocused?: (entry: CanvasReferenceOccurrence) => void | Promise<void>;
};

export function openCanvasTargetPicker(
	app: App,
	targets: readonly CanvasTarget[],
	onChoose: (target: CanvasTarget) => void,
	options: NavigationPickerOptions = {},
): void {
	new CanvasTargetPicker(app, sortCanvasCandidatesByRecency(targets, (target) => target.lastJumpedAt), onChoose, options).open();
}

type FocusReference = (canvasPath: string, nodeId: string) => Promise<boolean>;

export function openCanvasReferencePicker(
	app: App,
	occurrences: readonly CanvasReferenceOccurrence[],
	focusReference: FocusReference,
	options: CanvasReferencePickerOptions = {},
): void {
	const direction = options.direction ?? "back";
	const plan = planCanvasReferenceSelection(occurrences, options.getEntryRecency, options.getSourceRecency);
	if (plan.kind === "empty") {
		new Notice("没有白板入口引用当前白板。");
		return;
	}
	const chooseEntry = (entry: CanvasReferenceOccurrence) => { void focusAndReport(entry, focusReference, direction, options.onFocused); };
	if (plan.kind === "direct") {
		chooseEntry(plan.entry);
		return;
	}
	if (plan.kind === "choose-entry") {
		new CanvasEntryPicker(app, plan.source, chooseEntry, { ...options, direction }).open();
		return;
	}
	new CanvasSourcePicker(app, plan.sources, (source, sourceWindow) => {
		const next = planCanvasReferenceSourceSelection(source);
		if (next.kind === "direct") chooseEntry(next.entry);
		else sourceWindow.setTimeout(() => new CanvasEntryPicker(app, next.source, chooseEntry, { ...options, direction }).open(), 0);
	}, { ...options, direction }).open();
}

class CanvasSourcePicker extends FuzzySuggestModal<CanvasReferenceSourceGroup> {
	constructor(
		app: App,
		private readonly sources: CanvasReferenceSourceGroup[],
		private readonly onChoose: (source: CanvasReferenceSourceGroup, win: Window) => void,
		options: NavigationPickerOptions,
	) {
		super(app);
		this.setPlaceholder("选择引用当前白板的来源白板…");
		this.setInstructions([
			{ command: "↑↓", purpose: "选择白板" },
			{ command: "↵", purpose: "查看入口" },
			...navigationInstructions(options, "back"),
		]);
		registerFirstItemShortcut(this, options, "back", (item) => this.onChoose(item, this.containerEl.ownerDocument.defaultView ?? window));
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
		this.close();
		if (win) this.onChoose(item, win);
	}
}

class CanvasEntryPicker extends FuzzySuggestModal<CanvasReferenceOccurrence> {
	constructor(
		app: App,
		private readonly source: CanvasReferenceSourceGroup,
		private readonly onChoose: (entry: CanvasReferenceOccurrence) => void,
		options: NavigationPickerOptions,
	) {
		super(app);
		this.setPlaceholder(`选择「${source.name}」中的入口…`);
		this.setInstructions([
			{ command: "↑↓", purpose: "选择入口" },
			{ command: "↵", purpose: "聚焦节点" },
			...navigationInstructions(options, "back"),
		]);
		registerFirstItemShortcut(this, options, "back", (item) => this.onChoose(item));
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

	onChooseItem(item: CanvasReferenceOccurrence): void {
		this.close();
		this.onChoose(item);
	}
}

class CanvasTargetPicker extends FuzzySuggestModal<CanvasTarget> {
	constructor(
		app: App,
		private readonly targets: CanvasTarget[],
		private readonly onChoose: (target: CanvasTarget) => void,
		options: NavigationPickerOptions,
	) {
		super(app);
		this.setPlaceholder("选择要前进到的白板…");
		this.setInstructions([
			{ command: "↑↓", purpose: "选择白板" },
			{ command: "↵", purpose: "打开白板" },
			...navigationInstructions(options, "forward"),
		]);
		registerFirstItemShortcut(this, options, "forward", (item) => this.onChoose(item));
	}

	getItems(): CanvasTarget[] { return this.targets; }
	getItemText(item: CanvasTarget): string { return item.name; }

	renderSuggestion(match: { item: CanvasTarget }, element: HTMLElement): void {
		super.renderSuggestion(match as never, element);
		element.createEl("small", { cls: "arc-canvas-reference-suggestion-detail", text: match.item.path });
	}

	onChooseItem(item: CanvasTarget): void {
		this.close();
		this.onChoose(item);
	}
}

function navigationShortcutCode(options: NavigationPickerOptions, defaultDirection: CanvasReferenceNavigationDirection): string {
	return options.shortcutCode ?? DEFAULT_CANVAS_SHORTCUT_SETTINGS[(options.direction ?? defaultDirection) === "back" ? "backtrackReference" : "forwardReference"];
}

function navigationInstructions(options: NavigationPickerOptions, defaultDirection: CanvasReferenceNavigationDirection): { command: string; purpose: string }[] {
	const code = navigationShortcutCode(options, defaultDirection);
	return code ? [{ command: `Alt+${formatShortcutCode(code)}`, purpose: "直接选第一项" }] : [];
}

function registerFirstItemShortcut<T>(
	modal: FuzzySuggestModal<T>,
	options: NavigationPickerOptions,
	defaultDirection: CanvasReferenceNavigationDirection,
	choose: (item: T) => void,
): void {
	const code = navigationShortcutCode(options, defaultDirection);
	if (!code) return;
	modal.scope.register(["Alt"], null, (event) => {
		if (event.code !== code || event.isComposing || event.repeat) return;
		const first = modal.getSuggestions(modal.inputEl.value)[0];
		if (!first) return;
		event.preventDefault();
		modal.close();
		choose(first.item);
		return false;
	});
}

async function focusAndReport(
	entry: CanvasReferenceOccurrence,
	focusReference: FocusReference,
	direction: CanvasReferenceNavigationDirection,
	onFocused?: (entry: CanvasReferenceOccurrence) => void | Promise<void>,
): Promise<void> {
	try {
		const focused = await focusReference(entry.sourceCanvasPath, entry.sourceNodeId);
		if (!focused) new Notice(`无法聚焦入口节点：${entry.sourceCanvasPath}`);
		else await onFocused?.(entry);
	} catch (error) {
		const action = direction === "back" ? "回溯" : "前进";
		new Notice(`${action}白板入口失败：${error instanceof Error ? error.message : String(error)}`);
	}
}
