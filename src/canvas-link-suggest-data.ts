/** 解析 Canvas 文件节点；异常文件不应让编辑器建议链路崩溃。 */
export function parseCanvasNodes(content: string): unknown[] {
	try {
		const data = JSON.parse(content) as { nodes?: unknown }
		return Array.isArray(data.nodes) ? data.nodes : []
	} catch {
		return []
	}
}
