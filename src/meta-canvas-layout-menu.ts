import { Menu, Modal, type App } from "obsidian";
import type { MetaCanvasLayoutMode, MetaCanvasNodeShapeMode } from "./canvas-reference-layout";

export type MetaCanvasLayoutMenuActions = {
	layoutMode: MetaCanvasLayoutMode;
	nodeShapeMode: MetaCanvasNodeShapeMode;
	fixedNodeCount: number;
	setLayoutMode(mode: MetaCanvasLayoutMode): void;
	setNodeShapeMode(mode: MetaCanvasNodeShapeMode): void;
	softReset(): void;
	hardReset(): void;
};

export function showMetaCanvasLayoutMenu(
	app: App,
	event: MouseEvent,
	actions: MetaCanvasLayoutMenuActions,
): void {
	const menu = new Menu();
	menu.addItem((item) => item.setTitle("自动布局").setIsLabel(true));
	menu.addItem((item) => item
		.setTitle("分层布局 · Dagre")
		.setIcon("git-branch")
		.setChecked(actions.layoutMode === "layered")
		.onClick(() => actions.setLayoutMode("layered")));
	menu.addItem((item) => item
		.setTitle("力导向布局")
		.setIcon("network")
		.setChecked(actions.layoutMode === "force")
		.onClick(() => actions.setLayoutMode("force")));
	menu.addSeparator();
	menu.addItem((item) => item.setTitle("节点形状").setIsLabel(true));
	menu.addItem((item) => item
		.setTitle("正方形")
		.setIcon("square")
		.setChecked(actions.nodeShapeMode === "square")
		.onClick(() => actions.setNodeShapeMode("square")));
	menu.addItem((item) => item
		.setTitle("适配白板宽高比")
		.setIcon("rectangle-horizontal")
		.setChecked(actions.nodeShapeMode === "canvas-aspect")
		.onClick(() => actions.setNodeShapeMode("canvas-aspect")));
	menu.addSeparator();
	menu.addItem((item) => item
		.setTitle("软重置 · 保留固定节点")
		.setIcon("rotate-ccw")
		.onClick(() => actions.softReset()));
	menu.addItem((item) => item
		.setTitle("硬重置 · 清除固定节点")
		.setIcon("trash-2")
		.setDisabled(actions.fixedNodeCount === 0)
		.onClick(() => new HardResetMetaCanvasModal(app, actions.hardReset).open()));
	menu.showAtMouseEvent(event);
}

class HardResetMetaCanvasModal extends Modal {
	constructor(app: App, private readonly onConfirm: () => void) {
		super(app);
	}

	onOpen(): void {
		this.setTitle("硬重置元白板布局");
		this.contentEl.empty();
		this.contentEl.createEl("p", {
			text: "这会清除所有手动固定的位置，并按当前布局方式重新排列。此操作不能撤销。",
		});
		const actions = this.contentEl.createDiv({ cls: "modal-button-container" });
		const cancel = actions.createEl("button", { text: "取消" });
		cancel.addEventListener("click", () => this.close());
		const confirm = actions.createEl("button", { text: "清除固定位置" });
		confirm.addClass("mod-warning");
		confirm.addEventListener("click", () => {
			this.close();
			this.onConfirm();
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
