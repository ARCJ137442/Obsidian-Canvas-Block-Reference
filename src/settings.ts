import { Notice, PluginSettingTab, Setting } from "obsidian"
import type { App } from "obsidian"
import type CanvasReferencePlugin from "./main"
import { CONFIGURABLE_CANVAS_SHORTCUTS, formatShortcutCode, getCanvasShortcutConflicts } from "./canvas-shortcuts"

/** Settings UI for the data-driven Canvas key bindings. */
export class CanvasShortcutSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: CanvasReferencePlugin) {
		super(app, plugin)
	}

	display(): void {
		const { containerEl } = this
		containerEl.empty()
		containerEl.createEl("h2", { text: "Obsidian白板推演-ARC.ver" })
		containerEl.createEl("p", {
			text: "按键只在当前事件所属的白板窗口生效；输入框、节点编辑、命令面板和带修饰键的无关操作不会触发白板快捷键。",
			cls: "setting-item-description",
		})

		for (const definition of CONFIGURABLE_CANVAS_SHORTCUTS) {
			const setting = new Setting(containerEl)
				.setName(definition.name)
				.setDesc(definition.description)
			const button = setting.controlEl.createEl("button", {
				text: formatShortcutCode(this.plugin.getShortcutSettings()[definition.id]),
				attr: { "aria-label": `${definition.name}快捷键` },
			})
			let capturing = false
			const renderButton = () => {
				button.setText(capturing ? "请按键…" : formatShortcutCode(this.plugin.getShortcutSettings()[definition.id]))
				button.toggleClass("mod-warning", capturing)
			}
			button.addEventListener("click", () => {
				capturing = true
				button.focus()
				renderButton()
			})
			button.addEventListener("keydown", event => {
				if (!capturing) return
				event.preventDefault()
				event.stopPropagation()
				if (event.code === "Escape") {
					capturing = false
					renderButton()
					return
				}
				if (["ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight"].includes(event.code)) return
				const conflicts = getCanvasShortcutConflicts(this.plugin.getShortcutSettings(), definition.id, event.code)
				if (conflicts.length > 0) {
					new Notice(`${formatShortcutCode(event.code)} 已与其他白板快捷键重叠，请选择另一按键。`)
					capturing = false
					renderButton()
					return
				}
				void this.plugin.updateShortcut(definition.id, event.code).then(() => {
					capturing = false
					renderButton()
				})
			})
		}

		new Setting(containerEl)
			.setName("固定组合")
			.setDesc("Space/Enter 编辑、Q/Esc 取消选中、数字键标题级别保留为固定按键族。")
	}
}
