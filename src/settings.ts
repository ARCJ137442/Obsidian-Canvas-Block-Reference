import { ButtonComponent, Notice, PluginSettingTab, Setting } from "obsidian"
import type { App } from "obsidian"
import type CanvasReferencePlugin from "./main"
import {
	CONFIGURABLE_CANVAS_SHORTCUTS,
	formatShortcutCode,
	getCanvasShortcutConflicts,
} from "./canvas-shortcuts"
import type { CanvasShortcutFamilySettingKey, CanvasShortcutSettingKey } from "./canvas-shortcuts"
import type { RotationColorCondition } from "./rotation-model"
import type { TaskSemanticId } from "./color-semantics"

const TASK_SEMANTIC_OPTIONS: ReadonlyArray<{ value: TaskSemanticId; label: string }> = [
	{ value: "blocked", label: "受阻/取消" },
	{ value: "pending", label: "待推进" },
	{ value: "progress", label: "推进中" },
	{ value: "done", label: "已完成" },
]

const SEMANTIC_COLOR_LABELS: ReadonlyArray<{ color: string; label: string }> = [
	{ color: "1", label: "红色" },
	{ color: "2", label: "橙色" },
	{ color: "3", label: "黄色" },
	{ color: "4", label: "绿色" },
]

const ROTATION_COLOR_OPTIONS: ReadonlyArray<{ value: RotationColorCondition; label: string }> = [
	{ value: "all", label: "全部颜色" },
	{ value: "default", label: "默认" },
	{ value: "1", label: "红" },
	{ value: "2", label: "橙" },
	{ value: "3", label: "黄" },
	{ value: "4", label: "绿" },
	{ value: "5", label: "青" },
	{ value: "6", label: "紫" },
	{ value: "black", label: "黑" },
	{ value: "white", label: "白" },
]

const MODIFIER_CODES = new Set([
	"ShiftLeft", "ShiftRight",
	"ControlLeft", "ControlRight", "AltLeft", "AltRight",
	"MetaLeft", "MetaRight",
])

/** Settings UI for data-driven Canvas key bindings. */
export class CanvasShortcutSettingTab extends PluginSettingTab {
	private activeCaptureCancel?: () => void

	constructor(app: App, private readonly plugin: CanvasReferencePlugin) {
		super(app, plugin)
	}

	display(): void {
		this.activeCaptureCancel?.()
		this.activeCaptureCancel = undefined

		const { containerEl } = this
		containerEl.empty()
		containerEl.createEl("h2", { text: "Obsidian白板推演-ARC.ver" })
		containerEl.createEl("p", {
			text: "按键只在当前事件所属的白板窗口生效；输入框、节点编辑、命令面板和带修饰键的无关操作不会触发白板快捷键。所有配置保存物理按键码，主窗口与独立窗口共用同一套设置。",
			cls: "setting-item-description",
		})

		containerEl.createEl("h3", { text: "单键快捷键" })
		for (const definition of CONFIGURABLE_CANVAS_SHORTCUTS) {
			const setting = new Setting(containerEl)
				.setName(definition.name)
				.setDesc(definition.description)
			this.addCaptureButton(
				setting,
				() => this.plugin.getShortcutSettings()[definition.id],
				definition.id,
				0,
				definition.name,
			)
		}

		containerEl.createEl("h3", { text: "轮换聚焦" })
		containerEl.createEl("p", {
			text: "在「当前白板」「已打开白板」轮换聚焦中，只跳到匹配此颜色的节点；默认黄色。自定义 CSS 颜色严格精确匹配。",
			cls: "setting-item-description",
		})
		new Setting(containerEl)
			.setName("轮换聚焦条件")
			.setDesc("轮换聚焦只跳到匹配此颜色的节点。")
			.addDropdown((dropdown) => {
				for (const option of ROTATION_COLOR_OPTIONS) dropdown.addOption(option.value, option.label)
				dropdown.setValue(this.plugin.rotationColor).onChange(async (value) => {
					await this.plugin.updateRotationColor(value as RotationColorCondition)
				})
			})

		containerEl.createEl("h3", { text: "颜色语义" })
		containerEl.createEl("p", {
			text: "把内置色映射到任务状态（受阻/取消、待推进、推进中、已完成）。life-panel 等扩展按此收集任务节点；与上方的「轮换聚焦条件」相互独立。",
			cls: "setting-item-description",
		})
		for (const { color, label } of SEMANTIC_COLOR_LABELS) {
			new Setting(containerEl)
				.setName(label)
				.addDropdown((dropdown) => {
					for (const option of TASK_SEMANTIC_OPTIONS) dropdown.addOption(option.value, option.label)
					dropdown.setValue(this.plugin.colorSemantics[color] ?? "blocked").onChange(async (value) => {
						await this.plugin.updateColorSemantics(color, value as TaskSemanticId)
					})
				})
		}

		containerEl.createEl("h3", { text: "选择切换连边" })
		containerEl.createEl("p", {
			text: "按住「连接触发键」时，若选中从旧集合无交集切换到新集合（点击已存在节点，或双击空白创建新节点），自动为 旧→新 创建最近锚点的单向连边。原生点击/双击行为保持原样。",
			cls: "setting-item-description",
		})
		new Setting(containerEl)
			.setName("连接触发键")
			.setDesc("默认 Ctrl。可设为任意键（如 E）。点击按钮捕获后按 Esc 设为「已禁用」——功能关闭且跳过鼠标解析（更省性能）。")
			.addButton((button) => {
				this.addConnectorCaptureButton(button, "连接触发键")
			})

		this.addShortcutFamily(
			containerEl,
			"编辑按键族",
			"按键不带 Ctrl、Alt、Meta 或 Shift 时，在选中节点上进入编辑。每个槽位都可以单独改键。",
			"edit",
			["编辑键 1", "编辑键 2"],
		)
		this.addShortcutFamily(
			containerEl,
			"取消选中按键族",
			"按键不带修饰键时取消当前选中。Q 和 Esc 只是默认值，不是插件硬编码的固定按键。",
			"cancelSelection",
			["取消键 1", "取消键 2"],
		)
		this.addShortcutFamily(
			containerEl,
			"标题级别按键族",
			"每个槽位对应一个 Markdown 标题级别。默认是数字行 0~9；你可以将每个级别分别改绑到其他物理按键。标题键允许 Alt 有无两种状态，但不响应 Shift、Ctrl 或 Meta 组合。",
			"formatTitle",
			Array.from({ length: 10 }, (_, level) => `标题级别 ${level}`),
		)
	}

	private addShortcutFamily(
		containerEl: HTMLElement,
		name: string,
		description: string,
		id: CanvasShortcutFamilySettingKey,
		labels: string[],
	): void {
		containerEl.createEl("h3", { text: name })
		containerEl.createEl("p", { text: description, cls: "setting-item-description" })
		for (const [index, label] of labels.entries()) {
			const setting = new Setting(containerEl).setName(label)
			this.addCaptureButton(
				setting,
				() => this.plugin.getShortcutSettings()[id][index],
				id,
				index,
				label,
			)
		}
	}

	private addCaptureButton(
		setting: Setting,
		getCode: () => string,
		id: CanvasShortcutSettingKey,
		index = 0,
		label = "白板快捷键",
	): void {
		const button = setting.controlEl.createEl("button", {
			text: formatShortcutCode(getCode()),
			attr: { "aria-label": `${label}快捷键` },
		})
		let capturing = false
		const renderButton = () => {
			button.setText(capturing ? "请按键…（再次点击取消）" : formatShortcutCode(getCode()))
			button.toggleClass("mod-warning", capturing)
		}
		const cancelCapture = () => {
			capturing = false
			if (this.activeCaptureCancel === cancelCapture) this.activeCaptureCancel = undefined
			renderButton()
		}
		button.addEventListener("click", () => {
			if (capturing) {
				cancelCapture()
				return
			}
			this.activeCaptureCancel?.()
			this.activeCaptureCancel = cancelCapture
			capturing = true
			button.focus()
			renderButton()
		})
		button.addEventListener("keydown", event => {
			if (!capturing) return
			event.preventDefault()
			event.stopPropagation()
			// Escape is intentionally a valid candidate now; clicking the active
			// button again cancels capture so Esc can be configured as a binding.
			if (MODIFIER_CODES.has(event.code)) return
			const conflicts = getCanvasShortcutConflicts(
				this.plugin.getShortcutSettings(),
				id,
				event.code,
				index,
			)
			if (conflicts.length > 0) {
				new Notice(`${formatShortcutCode(event.code)} 已与其他白板快捷键重叠，请选择另一按键。`)
				cancelCapture()
				return
			}
			void this.plugin.updateShortcut(id, event.code, index).then(() => {
				cancelCapture()
			})
		})
	}

	/** 连接触发键捕获：允许修饰键；Esc = 禁用（空串）。 */
	private addConnectorCaptureButton(button: ButtonComponent, label: string): void {
		let capturing = false
		const renderButton = () => {
			button.setButtonText(capturing ? "请按键…（Esc 禁用，再次点击取消）" : this.connectorButtonLabel())
			button.buttonEl.toggleClass("mod-warning", capturing)
		}
		const cancelCapture = () => {
			capturing = false
			if (this.activeCaptureCancel === cancelCapture) this.activeCaptureCancel = undefined
			renderButton()
		}
		button.buttonEl.setAttr("tabindex", "0")
		button.buttonEl.setAttr("aria-label", `${label}（Esc 禁用）`)
		button.onClick(() => {
			if (capturing) {
				cancelCapture()
				return
			}
			this.activeCaptureCancel?.()
			this.activeCaptureCancel = cancelCapture
			capturing = true
			button.buttonEl.focus()
			renderButton()
		})
		button.buttonEl.addEventListener("keydown", (event: KeyboardEvent) => {
			if (!capturing) return
			event.preventDefault()
			event.stopPropagation()
			if (event.code === "Escape") {
				void this.plugin.updateConnectorCode("").then(() => cancelCapture())
				return
			}
			if (MODIFIER_CODES.has(event.code)) {
				void this.plugin.updateConnectorCode(event.code).then(() => cancelCapture())
				return
			}
			const conflicts = this.findShortcutConflicts(event.code)
			if (conflicts.length > 0) {
				new Notice(`${formatShortcutCode(event.code)} 与「${conflicts.join("、")}」重叠；连接键会与之并存，可到单键快捷键区改绑/清除。`)
			}
			void this.plugin.updateConnectorCode(event.code).then(() => cancelCapture())
		})
		// 初始渲染一次，否则按钮文字默认为空（设置页一打开就是空白）
		renderButton()
	}

	private connectorButtonLabel(): string {
		return formatConnectorCode(this.plugin.connectorKeyCode)
	}

	/** 连接键若与某个单键快捷键码重叠，返回其名称列表（仅提示，不阻止）。 */
	private findShortcutConflicts(code: string): string[] {
		const names: string[] = []
		const settings = this.plugin.getShortcutSettings()
		for (const definition of CONFIGURABLE_CANVAS_SHORTCUTS) {
			const bound = settings[definition.id]
			if (typeof bound === "string" && bound === code) names.push(definition.name)
		}
		return names
	}
}

/** 连接触发键的展示文本；修饰键码映射为简短名，空串 = 已禁用。 */
function formatConnectorCode(code: string): string {
	if (code === "") return "已禁用"
	switch (code) {
		case "ControlLeft":
		case "ControlRight":
			return "Ctrl"
		case "ShiftLeft":
		case "ShiftRight":
			return "Shift"
		case "AltLeft":
		case "AltRight":
			return "Alt"
		case "MetaLeft":
		case "MetaRight":
			return "Meta"
		default:
			return formatShortcutCode(code)
	}
}
