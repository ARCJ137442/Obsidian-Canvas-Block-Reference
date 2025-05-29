/**
 * ProjectGraph文件重定位
*/

import { PluginSettings } from './settings';
import { TFile, ViewState, WorkspaceLeaf } from "obsidian";

/** Custom logic when go to file */
export function openingFile(settings: PluginSettings, leaf: WorkspaceLeaf, file: TFile, state?: ViewState) {
	// @ts-ignore
	if (file.extension in settings.projectGraphExtensions); else return;

	const filePath = file.path;
	console.log("ProjectGraph file detected, redirecting to " + filePath);
}
