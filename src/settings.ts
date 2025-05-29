import { App, PluginSettingTab, Setting } from "obsidian";
import { EN_US, ZH_CN, i18nText } from "./i18n";
import CanvasReferencePlugin from "./main";


/**
 * 插件配置项
 */
export interface PluginSettings {
	/** 决定什么样的文件能被视作ProjectGraph「计划-投射」文件（内部格式是JSON，采用跟Obsidian白板`.canvas`类似的方案） */
	projectGraphExtensions: string[]
	/** ProjectGraph软件本体的路径 */
	projectGraphExecutablePath: string
	/** 是否开启调试模式 */
	debugMode: boolean
}
/**
 * 默认配置项
 */
export const DEFAULT_SETTINGS: PluginSettings = {
	projectGraphExtensions: ['.pgraph'],
	projectGraphExecutablePath: '',
	debugMode: false,
}

export class CanvasBlockReferenceSettings extends PluginSettingTab {
	plugin: CanvasReferencePlugin;

	constructor(app: App, plugin: CanvasReferencePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', {
			text: i18nText({
				[EN_US]: 'Canvas Block Reference Settings',
				[ZH_CN]: '画布块引用设置'
			})
		});

		new Setting(containerEl)
			.setName(i18nText({
				[EN_US]: 'Project Graph Extensions',
				[ZH_CN]: '项目图扩展名'
			}))
			.setDesc(i18nText({
				[EN_US]: 'File extensions that will be treated as project graph files',
				[ZH_CN]: '将被视为项目图文件的扩展名'
			}))
			.addText(text => text
				.setValue(this.plugin.settings.projectGraphExtensions.join(','))
				.onChange(async (value) => {
					this.plugin.settings.projectGraphExtensions = value.split(',').map(s => s.trim());
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(i18nText({
				[EN_US]: 'Project Graph Executable Path',
				[ZH_CN]: '项目图可执行路径'
			}))
			.setDesc(i18nText({
				[EN_US]: 'Path to the executable that generates project graphs',
				[ZH_CN]: '生成项目图的可执行文件路径'
			}))
			.addText(text => text
				.setValue(this.plugin.settings.projectGraphExecutablePath)
				.onChange(async (value) => {
					this.plugin.settings.projectGraphExecutablePath = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h2', {
			text: i18nText({
				[EN_US]: 'Advanced Settings',
				[ZH_CN]: '高级设置'
			})
		});

		new Setting(containerEl)
			.setName(i18nText({
				[EN_US]: 'Debug Mode',
				[ZH_CN]: '调试模式'
			}))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.debugMode || false)
				.onChange(async (value) => {
					this.plugin.settings.debugMode = value;
					await this.plugin.saveSettings();
				}));
	}
}
