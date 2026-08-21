import { Notice, PluginSettingTab, Setting } from "obsidian"
import type { App } from "obsidian"
import type CanvasReferencePlugin from "./main"
import {
	CONFIGURABLE_CANVAS_SHORTCUTS,
	formatShortcutCode,
	getCanvasShortcutConflicts,
} from "./canvas-shortcuts"
import type { CanvasShortcutFamilySettingKey, CanvasShortcutSettingKey } from "./canvas-shortcuts"

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
}
