import { moment } from 'obsidian'

/**
 * 国际化调整
 * * 📌Obsidian使用Moment.js，可以用`moment.locale`获取语言
 */

export const EN_US = "en-us"
export const ZH_CN = "zh-cn"
export const ZH_TW = "zh-tw"

export const FALLBACK = "en-us"

/** 一个标准的国际化文本 */
export interface I18nText {
	/** 美式英语 */
	[EN_US]: string
	/** 简体中文 */
	[ZH_CN]?: string
	/** 繁体中文 */
	[ZH_TW]?: string

	// 未列出的其它语言
	[key: string]: string | undefined
}

/** 获取当前语言 */
export const getLang = () => moment.locale()

export const i18nText = (text: I18nText) => text?.[getLang()] ?? text[FALLBACK]

