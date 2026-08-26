export type DiagnosticsBridge = {
	startDiagnostics(sessionId?: string): unknown
	stopDiagnostics(): unknown
}

export type DiagnosticsBridgeResolution =
	| { status: "plugin-missing" }
	| { status: "api-missing" }
	| { status: "ready"; bridge: DiagnosticsBridge }

export type DiagnosticsBridgeRuntimeStatus =
	| DiagnosticsBridgeResolution["status"]
	| "not-started"
	| "start-failed"
	| "stop-failed"

type PluginManagerLike = {
	getPlugin?: (id: string) => unknown
	plugins?: Record<string, unknown> | Map<string, unknown>
}

/** Resolve an optional companion plugin across desktop and mobile registries. */
export function resolveDiagnosticsBridge(host: unknown, pluginId: string): DiagnosticsBridgeResolution {
	const manager = (host as { plugins?: PluginManagerLike } | null | undefined)?.plugins
	if (!manager) return { status: "plugin-missing" }

	let plugin: unknown
	try {
		plugin = manager.getPlugin?.(pluginId)
	} catch {
		// Some host versions expose getPlugin but reject access during startup.
	}
	if (!plugin && manager.plugins instanceof Map) plugin = manager.plugins.get(pluginId)
	if (!plugin && manager.plugins && !(manager.plugins instanceof Map)) plugin = manager.plugins[pluginId]
	if (!plugin || typeof plugin !== "object") return { status: "plugin-missing" }

	const candidate = plugin as Partial<DiagnosticsBridge>
	if (typeof candidate.startDiagnostics !== "function" || typeof candidate.stopDiagnostics !== "function")
		return { status: "api-missing" }
	return { status: "ready", bridge: candidate as DiagnosticsBridge }
}

/** Keep the terminal bridge state in the ARC report even if earlier records rotate out. */
export function diagnosticsBridgeFinalPhase(status: DiagnosticsBridgeRuntimeStatus): string {
	return `pan-bridge-final-${status}`
}
