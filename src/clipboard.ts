export interface TextClipboard {
	writeText(text: string): Promise<void> | void
}

/** 返回实际写入结果，不把权限/环境失败误报成“已复制”。 */
export async function writeTextToClipboard(
	text: string,
	clipboard?: TextClipboard,
): Promise<boolean> {
	if (!clipboard?.writeText) return false
	try {
		await clipboard.writeText(text)
		return true
	} catch {
		return false
	}
}
