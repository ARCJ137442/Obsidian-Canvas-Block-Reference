import { Notice, Platform, Plugin, TFile, ViewState, WorkspaceLeaf, apiVersion } from 'obsidian';
import { around } from "monkey-around";
import { CMD_copyCanvasElementReference, EVENT_copyCanvasCardReferenceMenu } from './copy-canvas-element-reference';
import { openingFile } from './canvas-link-redirection';
import { BuiltInSuggest } from './typings/suggest';
import { suggestAround } from './canvas-link-suggest';
import { CMD_reverseSelectedCanvasEdges, EVENT_reverseEdges } from './reverse-edge';
import { CMD_changeElementID, EVENT_changeElementID } from './change-element-id';
import { CMD_selectDownstreamNodes, EVENT_selectDownstreamNodesMenu, CMD_selectUpstreamNodes, EVENT_selectUpstreamNodesMenu } from './select-nodes-via-edges';
import { CMD_adjustEdgeOnside, CMD_toggleNodeEdgeSelect, EVENT_adjustEdgeOnside, EVENT_toggleNodeEdgeSelect } from './adjust-edge-onside';
import { packRectangles } from './brickLayout';
import { CMD_flipCanvasElementsH, CMD_flipCanvasElementsV, EVENT_flipCanvasElementsH, EVENT_flipCanvasElementsV } from './flip-canvas-nodes';
import { onCanvasKeyDown } from './canvas-keydown-features';
import { canHandleCanvasKeyboardEvent, getCanvasFromEvent, isCanvasEditing, isEditableTarget, resolveCanvasFromEvent, updateCanvasPointerLeaseFromEvent } from './canvas-context';
import { CanvasPointerLeaseRegistry } from './canvas-pointer-lease';
import { findClickedNode, onCanvasPointerDown, onCanvasSelectionSwitch, onConnectorNodeClick, tryDeferredConnect } from './canvas-mouse-features';
import { isConnectorActive, SelectionSwitchTracker } from './canvas-mouse-util';
import { createContinuousZoomController } from './canvas-zoom';
import type { ContinuousZoomController } from './canvas-zoom';
import { KeyboardEventGuard } from './keyboard-event-guard';
import { WindowRegistrationRegistry } from './window-registration';
import type { Canvas } from 'obsidian/canvas';
import { canPropagateCanvasShortcut, DEFAULT_CANVAS_SHORTCUT_SETTINGS, getCanvasShortcutId, normalizeCanvasShortcutSettings, withCanvasShortcutCode } from './canvas-shortcuts';
import type { CanvasShortcutSettingKey, CanvasShortcutSettings } from './canvas-shortcuts';
import { CanvasShortcutSettingTab } from './settings';
import { NodeRotationService } from './node-rotation';
import { isRotationColorCondition } from './rotation-model';
import type { RotationColorCondition } from './rotation-model';
import { DEFAULT_COLOR_SEMANTICS, normalizeColorSemantics } from './color-semantics';
import type { ColorSemantics, TaskSemanticId } from './color-semantics';
import { openCanvasAndFocusNode } from './workspace-navigation';
import { CanvasDiagnostics, captureCanvasActionState, describeDiagnosticElement, getDiagnosticWindowIds } from './diagnostics';
import type { DiagnosticReport } from './diagnostics';
import { writeTextToClipboard } from './clipboard';
import { diagnosticsBridgeFinalPhase, resolveDiagnosticsBridge } from './plugin-bridge';
import type { DiagnosticsBridge, DiagnosticsBridgeRuntimeStatus } from './plugin-bridge';
// import { CMD_selectAllEdgesInCanvas } from './commands/select-all-edges';
// ! ✅「选择所有连边」的功能，在AdvancedCanvas中有了

export default class CanvasReferencePlugin extends Plugin {
	private settings: CanvasShortcutSettings = DEFAULT_CANVAS_SHORTCUT_SETTINGS
	private persistedData: Record<string, unknown> = {}
	/** 轮换聚焦条件，供设置页读取与外部插件联动；默认黄色。 */
	rotationColor: RotationColorCondition = "3"
	/** 颜色→任务语义，供设置页与 life-panel 等扩展读取；与轮换聚焦条件独立。 */
	colorSemantics: ColorSemantics = { ...DEFAULT_COLOR_SEMANTICS }
	/** 选择切换自动连边：连接触发键（KeyboardEvent.code，默认 ControlLeft；空串 = 禁用，可在设置按 Esc 设为禁用）。 */
	private connectorCode = "ControlLeft"

	private mouseEventWindows = new WindowRegistrationRegistry<Window>()
	private connectorHeldStates = new Map<Window, { held: boolean }>()
	private connectorTrackers = new Map<Window, SelectionSwitchTracker>()
	private mouseWindowCleanups = new Map<Window, () => void>()

	private _nodeRotation!: NodeRotationService

	async onload(): Promise<void> {
		const loadedData = await this.loadData() as unknown
		if (loadedData && typeof loadedData === "object" && !Array.isArray(loadedData)) {
			this.persistedData = { ...(loadedData as Record<string, unknown>) }
			this.settings = normalizeCanvasShortcutSettings(this.persistedData.shortcuts)
		}
		this.rotationColor = normalizeRotationColor(this.persistedData.rotationColor)
		this.colorSemantics = normalizeColorSemantics(this.persistedData.colorSemantics)
		this.connectorCode = normalizeString(this.persistedData.connectorCode, "ControlLeft")
		this._nodeRotation = new NodeRotationService(this.app, () => ({ rotationColor: this.rotationColor }))
		this.registerRotationCommands()
		this.addSettingTab(new CanvasShortcutSettingTab(this.app, this))

		// 功能：链接寻路
		this.patchWorkspaceLeaf();

		// 功能：
		this.patchEditorSuggest();

		// 功能：复制块链接 | 注册命令
		this.registerCommands();

		// 功能：注册事件
		this.registerEvents();

		this.registerCanvasKeyListeners()
		this.registerCanvasMouseListeners()
	}

	private keyEventWindows = new WindowRegistrationRegistry<Window>()
	private keyDownStates = new Map<Window, { [code: string]: boolean }>()
	private zoomControllers = new Map<Window, ContinuousZoomController>()
	private windowCleanups = new Map<Window, () => void>()
	private handledKeyboardEvents = new KeyboardEventGuard()
	private readonly canvasPointerLeases = new CanvasPointerLeaseRegistry<Canvas>()
	private readonly diagnostics = new CanvasDiagnostics("obsidian-whiteboard-deduction-arc")
	private pendingMobileDiagnosticReport: string | undefined
	private activePanDiagnosticsBridge: DiagnosticsBridge | undefined
	private panDiagnosticsStatus: DiagnosticsBridgeRuntimeStatus = "not-started"

	getShortcutSettings(): CanvasShortcutSettings {
		return this.settings
	}

	async updateShortcut(id: CanvasShortcutSettingKey, code: string, index = 0): Promise<void> {
		this.settings = withCanvasShortcutCode(this.settings, id, code, index)
		this.clearAllKeyboardStates()
		this.persistedData.shortcuts = this.settings
		await this.saveData(this.persistedData)
	}

	/** 对外公开的轮换服务：供 life-panel 等插件把自定义白板集合传入轮换。 */
	get nodeRotation(): NodeRotationService {
		return this._nodeRotation
	}

	/** 颜色→任务语义映射，供 life-panel 等扩展按语义反查颜色收集任务节点。 */
	getColorSemantics(): Readonly<ColorSemantics> {
		return this.colorSemantics
	}

	async updateColorSemantics(color: string, semantic: TaskSemanticId): Promise<void> {
		this.colorSemantics = { ...this.colorSemantics, [color]: semantic }
		this.persistedData.colorSemantics = this.colorSemantics
		await this.saveData(this.persistedData)
	}

	/** 连接触发键的 KeyboardEvent.code（供设置页读取；空串 = 已禁用）。 */
	get connectorKeyCode(): string {
		return this.connectorCode
	}

	async updateConnectorCode(code: string): Promise<void> {
		this.connectorCode = code
		this.persistedData.connectorCode = code
		// 连接键变更后清掉各窗口的按住状态，避免旧键状态污染新配置
		for (const state of this.connectorHeldStates.values()) state.held = false
		for (const tracker of this.connectorTrackers.values()) tracker.clearSession()
		await this.saveData(this.persistedData)
	}

	/**
	 * 聚焦白板中的指定节点（打开/切窗、等渲染、选中并缩放），供 life-panel 点击任务项调用。
	 * preferOtherWindow：从仪表盘等锚定窗口跳转时，优先用其他窗口打开/聚焦；
	 * sourceWindowArg 由调用方显式传入「源窗口」（仪表盘所在窗口）。
	 */
	focusNode(canvasPath: string, nodeId: string, preferOtherWindow = false, sourceWindowArg?: Window | null): Promise<boolean> {
		return openCanvasAndFocusNode(this.app, canvasPath, nodeId, preferOtherWindow, sourceWindowArg)
	}

	async updateRotationColor(color: RotationColorCondition): Promise<void> {
		this.rotationColor = color
		this.persistedData.rotationColor = color
		await this.saveData(this.persistedData)
	}

	private registerRotationCommands(): void {
		this.addCommand({
			id: "node-rotation-current-next",
			name: "轮换聚焦·下一个匹配节点（当前白板）",
			callback: () => void this.nodeRotation.advance(1, "current"),
		})
		this.addCommand({
			id: "node-rotation-current-previous",
			name: "轮换聚焦·上一个匹配节点（当前白板）",
			callback: () => void this.nodeRotation.advance(-1, "current"),
		})
		this.addCommand({
			id: "node-rotation-open-next",
			name: "轮换聚焦·下一个匹配节点（已打开白板）",
			callback: () => void this.nodeRotation.advance(1, "open"),
		})
		this.addCommand({
			id: "node-rotation-open-previous",
			name: "轮换聚焦·上一个匹配节点（已打开白板）",
			callback: () => void this.nodeRotation.advance(-1, "open"),
		})
	}

	private clearAllKeyboardStates(): void {
		for (const state of this.keyDownStates.values()) {
			for (const code of Object.keys(state)) delete state[code]
		}
		for (const controller of this.zoomControllers.values()) controller.stop()
	}

	private startMobileDiagnostics(): void {
		this.pendingMobileDiagnosticReport = undefined
		const sessionId = this.diagnostics.start()
		this.diagnostics.record({ event: "session", phase: "start" })
		this.diagnostics.record({
			event: "runtime",
			phase: "build",
			pluginVersion: this.manifest.version,
			diagnosticRevision: "mobile-canvas-pointer-lease-v1",
			reason: `${apiVersion}:${Platform.isAndroidApp ? "android" : Platform.isIosApp ? "ios" : Platform.isMobile ? "mobile" : "desktop"}`,
		})
		const panBridge = resolveDiagnosticsBridge(this.app, "canvas-keyboard-pan")
		this.diagnostics.record({ event: "integration", phase: `pan-bridge-${panBridge.status}` })
		this.panDiagnosticsStatus = panBridge.status
		this.activePanDiagnosticsBridge = panBridge.status === "ready" ? panBridge.bridge : undefined
		try {
			this.activePanDiagnosticsBridge?.startDiagnostics(sessionId)
			const workspaceWindow = this.app.workspace.containerEl.ownerDocument.defaultView
			this.diagnostics.record({ event: "listener", phase: "active", ...getDiagnosticWindowIds(workspaceWindow) })
			this.app.workspace.iterateAllLeaves(leaf => {
				const eventWindow = leaf.view?.containerEl?.ownerDocument.defaultView
				this.diagnostics.record({ event: "listener", phase: "active", ...getDiagnosticWindowIds(eventWindow) })
			})
			new Notice("移动端 Canvas 诊断已开始（仅内存记录）")
		} catch (error) {
			this.activePanDiagnosticsBridge = undefined
			this.panDiagnosticsStatus = "start-failed"
			this.diagnostics.record({ event: "integration", phase: "pan-bridge-start-failed", exception: error instanceof Error ? error.name : "unknown" })
			new Notice("移动端 Canvas 诊断：Pan 联动不可用")
		}
	}

	private async stopAndCopyMobileDiagnostics(): Promise<void> {
		if (!this.diagnostics.enabled) {
			if (this.pendingMobileDiagnosticReport) {
				const copied = await writeTextToClipboard(this.pendingMobileDiagnosticReport, globalThis.navigator?.clipboard)
				if (copied) {
					this.pendingMobileDiagnosticReport = undefined
					new Notice("移动端 Canvas 诊断报告已重新复制")
				} else {
					new Notice("移动端 Canvas 诊断报告仍未能复制，可再次执行本命令重试")
				}
				return
			}
			new Notice("移动端 Canvas 诊断尚未开始")
			return
		}
		let panReport: DiagnosticReport | undefined
		try {
			panReport = this.activePanDiagnosticsBridge?.stopDiagnostics() as DiagnosticReport | undefined
			if (this.activePanDiagnosticsBridge) this.diagnostics.record({ event: "integration", phase: "pan-bridge-stopped" })
		} catch (error) {
			this.panDiagnosticsStatus = "stop-failed"
			this.diagnostics.record({ event: "integration", phase: "pan-bridge-stop-failed", exception: error instanceof Error ? error.name : "unknown" })
		}
		this.diagnostics.record({ event: "integration", phase: diagnosticsBridgeFinalPhase(this.panDiagnosticsStatus) })
		this.activePanDiagnosticsBridge = undefined
		const arcReport = this.diagnostics.stop()
		this.panDiagnosticsStatus = "not-started"
		const records = [...arcReport.records, ...(panReport?.records ?? [])].sort((a, b) => a.timestampMs - b.timestampMs || a.seq - b.seq)
		const report = JSON.stringify({
			schemaVersion: arcReport.schemaVersion,
			sessionId: arcReport.sessionId,
			records,
		}, null, 2)
		this.pendingMobileDiagnosticReport = report
		try {
			const copied = await writeTextToClipboard(report, globalThis.navigator?.clipboard)
			if (!copied) throw new Error("clipboard-unavailable")
			this.pendingMobileDiagnosticReport = undefined
			new Notice(`移动端 Canvas 诊断报告已复制（${records.length} 条）`)
		} catch {
			new Notice("移动端 Canvas 诊断已停止；复制失败，可再次执行本命令重试")
		}
	}

	private diagnosticContext(eventWindow: Window, event?: Event, canvas?: Canvas): {
		vaultName?: string
		canvasPath?: string
		nodeId?: string
		selectionCount?: number
		isEditing?: boolean
		windowId?: string
		documentId?: string
		target?: ReturnType<typeof describeDiagnosticElement>
		activeElement?: ReturnType<typeof describeDiagnosticElement>
	} {
		const selected = canvas ? [...(canvas.selection ?? [])] : []
		const first = selected.find(element => typeof (element as { id?: unknown }).id === "string") as { id?: string } | undefined
		const view = canvas as (Canvas & { view?: { file?: { path?: string } } }) | undefined
		let vaultName: string | undefined
		try { vaultName = this.app.vault.getName() } catch { /* host may not expose a vault in tests */ }
		return {
			...(vaultName ? { vaultName } : {}),
			...(view?.view?.file?.path ? { canvasPath: view.view.file.path } : {}),
			...(first?.id && vaultName && view?.view?.file?.path ? { nodeId: first.id } : {}),
			...(canvas ? { selectionCount: selected.length, isEditing: isCanvasEditing(canvas) } : {}),
			...getDiagnosticWindowIds(eventWindow),
			...(event ? {
				target: describeDiagnosticElement(event.target),
				activeElement: describeDiagnosticElement(eventWindow.document.activeElement),
			} : {}),
		}
	}

	private recordKeyboard(
		eventWindow: Window,
		event: KeyboardEvent,
		canvas: Canvas | undefined,
		accepted: boolean,
		reason: string,
		details: { shortcutId?: string; effectObserved?: boolean; contextSource?: string; leaseReason?: string; phase?: string } = {},
	): void {
		if (!this.diagnostics.enabled) return
		this.diagnostics.record({ event: "guard", code: event.code, accepted, reason, ...details, ...this.diagnosticContext(eventWindow, event, canvas) })
	}

	private registerCanvasKeyListeners(): void {
		const registerForWindow = (eventWindow: Window | null): void => {
			if (!eventWindow || !this.keyEventWindows.claim(eventWindow)) return

			const windowWithCleanup = eventWindow as Window & {
				__canvasBlockReferenceKeyboardCleanup?: () => void
			}
			windowWithCleanup.__canvasBlockReferenceKeyboardCleanup?.()

			const isKeyDown: { [code: string]: boolean } = {}
			this.keyDownStates.set(eventWindow, isKeyDown)
			this.diagnostics.record({ event: "listener", phase: "registered", ...getDiagnosticWindowIds(eventWindow) })
			let zoomCanvas: Canvas | undefined
			let zoomShiftFallback = false
			const zoomController = createContinuousZoomController(
				{
					setInterval: (callback, delay) => this.registerInterval(eventWindow.setInterval(callback, delay)),
					clearInterval: (interval) => eventWindow.clearInterval(interval),
				},
				() => isKeyDown[this.settings.zoom] === true,
				() => (
					isKeyDown['ShiftLeft'] === true
					|| isKeyDown['ShiftRight'] === true
					|| zoomShiftFallback
				) ? -0.1 : 0.1,
				(step) => zoomCanvas?.zoomBy(step),
			)
			this.zoomControllers.set(eventWindow, zoomController)

			const clearKeyState = () => {
				for (const code of Object.keys(isKeyDown)) delete isKeyDown[code]
				zoomController.stop()
				zoomCanvas = undefined
				zoomShiftFallback = false
			}

			const onKeyDown = (event: KeyboardEvent): void => {
				if (event.repeat) {
					this.recordKeyboard(eventWindow, event, undefined, false, "repeat", { phase: "keydown" })
					return
				}
				const context = resolveCanvasFromEvent(this.app, event, eventWindow, this.canvasPointerLeases)
				const canvas = context.canvas
				if (!canvas) {
					this.recordKeyboard(eventWindow, event, undefined, false, "canvas-context-unresolved", {
						phase: "keydown",
						contextSource: context.source,
						leaseReason: context.leaseReason,
					})
					return
				}
				if (!canHandleCanvasKeyboardEvent(event, canvas)) {
					this.recordKeyboard(eventWindow, event, canvas, false,
						event.isComposing ? "composing" : isEditableTarget(event.target) ? "editable-target" : "canvas-editing",
						{ phase: "keydown", contextSource: context.source, leaseReason: context.leaseReason })
					return
				}
				if (!this.handledKeyboardEvents.consume(event)) {
					this.recordKeyboard(eventWindow, event, canvas, false, "event-already-consumed", { phase: "keydown", contextSource: context.source, leaseReason: context.leaseReason })
					return
				}

				isKeyDown[event.code] = true
				if (event.ctrlKey || event.altKey || event.metaKey) {
					zoomController.stop()
					zoomCanvas = undefined
				}
				if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
					zoomShiftFallback = true
				}
				const shortcutId = this.diagnostics.enabled ? getCanvasShortcutId(event, this.settings) : undefined
				const beforeAction = this.diagnostics.enabled ? captureCanvasActionState(canvas) : undefined
				const diagnosticSessionId = this.diagnostics.sessionId
				const handled = onCanvasKeyDown(event, isKeyDown, canvas, {
					startContinuousZoom: (zoomTarget, shiftKey) => {
						zoomCanvas = zoomTarget
						zoomShiftFallback = shiftKey
						zoomController.start()
					},
					rotate: (rotateCanvas, direction) => {
						void this.nodeRotation.advanceFromCanvas(rotateCanvas, direction)
					},
				}, this.settings)
				const effectObserved = beforeAction === undefined ? undefined : beforeAction !== captureCanvasActionState(canvas)
				this.recordKeyboard(eventWindow, event, canvas, handled,
					handled ? effectObserved ? "shortcut-matched-sync-effect" : "shortcut-matched-no-sync-effect" : "unbound-key",
					{ shortcutId, effectObserved, contextSource: context.source, leaseReason: context.leaseReason, phase: "keydown" })
				if (handled && shortcutId && beforeAction !== undefined) {
					const code = event.code
					eventWindow.requestAnimationFrame(() => {
						if (!this.diagnostics.enabled || this.diagnostics.sessionId !== diagnosticSessionId) return
						this.diagnostics.record({
							event: "effect",
							code,
							shortcutId,
							effectObserved: beforeAction !== captureCanvasActionState(canvas),
							phase: "next-animation-frame",
							...this.diagnosticContext(eventWindow, undefined, canvas),
						})
					})
					if (!effectObserved) eventWindow.setTimeout(() => {
						if (!this.diagnostics.enabled || this.diagnostics.sessionId !== diagnosticSessionId) return
						this.diagnostics.record({
							event: "effect",
							code,
							shortcutId,
							effectObserved: beforeAction !== captureCanvasActionState(canvas),
							phase: "settled-150ms",
							contextSource: context.source,
							leaseReason: context.leaseReason,
							...this.diagnosticContext(eventWindow, undefined, canvas),
						})
					}, 150)
				}
				if (handled) {
					event.preventDefault()
					// Directional WASD is intentionally allowed to continue to the
					// Canvas document so companion plugins such as canvas-keyboard-pan
					// can consume the same physical key without losing the node-jump
					// behavior implemented here. Other whiteboard shortcuts remain
					// exclusive to avoid accidental cross-plugin actions.
					if (!canPropagateCanvasShortcut(event, this.settings))
						event.stopImmediatePropagation()
				}
			}
			const onKeyUp = (event: KeyboardEvent): void => {
				if (!this.handledKeyboardEvents.consume(event)) {
					this.recordKeyboard(eventWindow, event, undefined, false, "event-already-consumed")
					return
				}
				isKeyDown[event.code] = false
				if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
					zoomShiftFallback = isKeyDown['ShiftLeft'] === true || isKeyDown['ShiftRight'] === true
				}
				if (event.code === this.settings.zoom) {
					zoomController.stop()
					zoomCanvas = undefined
				}
			}
			const onCompositionStart = (event: CompositionEvent): void => this.diagnostics.record({ event: "composition", phase: "start", ...this.diagnosticContext(eventWindow, event) })
			const onCompositionEnd = (event: CompositionEvent): void => this.diagnostics.record({ event: "composition", phase: "end", ...this.diagnosticContext(eventWindow, event) })
			const onFocusIn = (event: FocusEvent): void => this.diagnostics.record({ event: "focus", phase: "in", ...this.diagnosticContext(eventWindow, event) })
			const onFocusOut = (event: FocusEvent): void => this.diagnostics.record({ event: "focus", phase: "out", ...this.diagnosticContext(eventWindow, event) })
			const clearWindowContext = (): void => {
				clearKeyState()
				this.canvasPointerLeases.clear(eventWindow)
			}
			const onVisibilityChange = (): void => {
				this.diagnostics.record({ event: "visibility", phase: eventWindow.document.visibilityState, ...getDiagnosticWindowIds(eventWindow) })
				if (eventWindow.document.visibilityState !== "visible") clearWindowContext()
			}

			eventWindow.addEventListener("keydown", onKeyDown, true)
			eventWindow.addEventListener("keyup", onKeyUp, true)
			eventWindow.addEventListener("blur", clearWindowContext)
			eventWindow.document.addEventListener("visibilitychange", onVisibilityChange)
			eventWindow.document.addEventListener("compositionstart", onCompositionStart)
			eventWindow.document.addEventListener("compositionend", onCompositionEnd)
			eventWindow.document.addEventListener("focusin", onFocusIn)
			eventWindow.document.addEventListener("focusout", onFocusOut)

			let cleaned = false
			const cleanup = (): void => {
				if (cleaned) return
				cleaned = true
				eventWindow.removeEventListener("keydown", onKeyDown, true)
				eventWindow.removeEventListener("keyup", onKeyUp, true)
				eventWindow.removeEventListener("blur", clearWindowContext)
				eventWindow.document.removeEventListener("visibilitychange", onVisibilityChange)
				eventWindow.document.removeEventListener("compositionstart", onCompositionStart)
				eventWindow.document.removeEventListener("compositionend", onCompositionEnd)
				eventWindow.document.removeEventListener("focusin", onFocusIn)
				eventWindow.document.removeEventListener("focusout", onFocusOut)
				this.diagnostics.record({ event: "listener", phase: "cleanup", ...getDiagnosticWindowIds(eventWindow) })
				if (windowWithCleanup.__canvasBlockReferenceKeyboardCleanup === cleanup)
					delete windowWithCleanup.__canvasBlockReferenceKeyboardCleanup
				this.windowCleanups.delete(eventWindow)
				zoomController.stop()
				this.zoomControllers.delete(eventWindow)
				this.keyDownStates.delete(eventWindow)
				this.keyEventWindows.release(eventWindow)
				this.canvasPointerLeases.clear(eventWindow)
			}
			windowWithCleanup.__canvasBlockReferenceKeyboardCleanup = cleanup
			this.windowCleanups.set(eventWindow, cleanup)
			this.register(cleanup)
		}

		const workspaceDocument = this.app.workspace.containerEl.ownerDocument
		registerForWindow(workspaceDocument.defaultView ?? window)
		this.app.workspace.iterateAllLeaves(leaf => {
			registerForWindow(leaf.view?.containerEl?.ownerDocument?.defaultView ?? null)
		})

		this.registerEvent(this.app.workspace.on("window-open", (_workspaceWindow, eventWindow) => {
			registerForWindow(eventWindow)
		}))
		this.registerEvent(this.app.workspace.on("window-close", (_workspaceWindow, eventWindow) => {
			this.windowCleanups.get(eventWindow)?.()
		}))
		this.registerEvent(this.app.workspace.on("active-leaf-change" as never, ((leaf: unknown) => {
			const view = (leaf as { view?: { containerEl?: HTMLElement; file?: { path?: string }; getViewType?: () => string } } | null | undefined)?.view
			const eventWindow = view?.containerEl?.ownerDocument.defaultView
			this.canvasPointerLeases.clear(eventWindow)
			this.diagnostics.record({
				event: "tab",
				phase: "active-leaf-change",
				viewType: view?.getViewType?.(),
				canvasPath: view?.file?.path,
				activeElement: describeDiagnosticElement(eventWindow?.document.activeElement),
				...getDiagnosticWindowIds(eventWindow),
			})
		}) as never))
	}

	/**
	 * 选择切换自动连边：鼠标路径监听（每窗口）。
	 *
	 * pointerdown（capture）在原生清空/替换选区之前快照旧选区；
	 * click / dblclick（capture）在选区发生无交集切换时自动连边。
	 * 绝不 preventDefault / stopImmediatePropagation，原生白板行为保持原样。
	 * 连接触发键为空串（设置中按 Esc 禁用）时直接短路，不做任何解析（省性能）。
	 */
	private registerCanvasMouseListeners(): void {
		const registerForMouseWindow = (eventWindow: Window | null): void => {
			if (!eventWindow || !this.mouseEventWindows.claim(eventWindow)) return

			const marked = eventWindow as Window & {
				__canvasWhiteboardMouseCleanup?: () => void
			}
			marked.__canvasWhiteboardMouseCleanup?.()

			const tracker = new SelectionSwitchTracker({
				setTimeout: (callback, ms) => eventWindow.setTimeout(callback, ms),
				clearTimeout: (handle) => eventWindow.clearTimeout(handle as number),
			})
			const connectorHeld = { held: false }
			this.connectorHeldStates.set(eventWindow, connectorHeld)
			this.connectorTrackers.set(eventWindow, tracker)

			const isConnectorHeld = (event: MouseEvent): boolean =>
				isConnectorActive(event, this.connectorCode, connectorHeld.held)

			const onPointerDown = (event: PointerEvent): void => {
				const context = updateCanvasPointerLeaseFromEvent(this.app, event, eventWindow, this.canvasPointerLeases)
				if (this.diagnostics.enabled) {
					this.diagnostics.record({
						event: "pointer",
						phase: "down",
						pointerType: event.pointerType,
						contextSource: context.source,
						leaseReason: context.leaseReason,
						...this.diagnosticContext(eventWindow, event, context.canvas),
					})
				}
				if (this.connectorCode === "") return
				if (!isConnectorHeld(event)) return // 平时点击零开销，直接短路（只有按下连接键才「领域展开」）
				const canvas = context.canvas
				if (!canvas) return
				onCanvasPointerDown(canvas, tracker, true)
			}
			const onClick = (event: MouseEvent): void => {
				if (this.connectorCode === "") return
				if (!isConnectorHeld(event)) return // 平时点击零开销
				const canvas = getCanvasFromEvent(this.app, event, eventWindow)
				if (!canvas) return
				// 路径 A：连接键 + 点击（含新创建节点）→ 自切换选中并连边（先跑，快照未被消费）
				let connected = false
				const clicked = findClickedNode(canvas, event.target)
				if (clicked) connected = onConnectorNodeClick(canvas, tracker, clicked.id, true)
				// 路径 B：原生已切换选区（如双击空白创建的新节点已入选中）→ 兜底
				if (!connected) connected = onCanvasSelectionSwitch(canvas, tracker, true)
				if (connected) {
					new Notice("✅ 选择切换连边：已创建")
				} else {
					// 双击空白：节点由原生在事件后创建，延时到事件循环后连边
					eventWindow.setTimeout(() => {
						if (tryDeferredConnect(canvas, tracker)) new Notice("✅ 选择切换连边：已创建")
					}, 0)
				}
			}
			const onDoubleClick = (event: MouseEvent): void => {
				if (this.connectorCode === "") return
				if (!isConnectorHeld(event)) return // 平时双击零开销（原生建节点照常）
				const canvas = getCanvasFromEvent(this.app, event, eventWindow)
				if (!canvas) return
				let connected = false
				const clicked = findClickedNode(canvas, event.target)
				if (clicked) connected = onConnectorNodeClick(canvas, tracker, clicked.id, true)
				if (!connected) connected = onCanvasSelectionSwitch(canvas, tracker, true)
				if (connected) {
					new Notice("✅ 选择切换连边：已创建")
				} else {
					// 双击空白：延时到原生创建节点后再连边
					eventWindow.setTimeout(() => {
						if (tryDeferredConnect(canvas, tracker)) new Notice("✅ 选择切换连边：已创建")
					}, 0)
				}
			}

			// 连接触发键的按住状态：独立于现有 isKeyDown（现有在节点编辑态会被拒绝，
			// 而链式场景恰好在编辑态连按）。
			const onKeyDown = (event: KeyboardEvent): void => {
				if (event.repeat) return // 过滤 OS 按键重复事件
				if (event.code === this.connectorCode) connectorHeld.held = true
			}
			const onKeyUp = (event: KeyboardEvent): void => {
				if (event.code === this.connectorCode) {
					connectorHeld.held = false
					// 松开连接键 = 结束本次连边会话：清空遗留快照与链式锚点，避免后续意外连边
					tracker.clearSession()
				}
			}
			const clearConnectorState = (): void => {
				connectorHeld.held = false
				tracker.clearSession()
			}
			const onVisibilityChange = (): void => {
				if (eventWindow.document.visibilityState !== "visible") clearConnectorState()
			}

			eventWindow.addEventListener("pointerdown", onPointerDown, true)
			eventWindow.addEventListener("click", onClick, true)
			eventWindow.addEventListener("dblclick", onDoubleClick, true)
			eventWindow.addEventListener("keydown", onKeyDown, true)
			eventWindow.addEventListener("keyup", onKeyUp, true)
			eventWindow.addEventListener("blur", clearConnectorState)
			eventWindow.document.addEventListener("visibilitychange", onVisibilityChange)

			let cleaned = false
			const cleanup = (): void => {
				if (cleaned) return
				cleaned = true
				eventWindow.removeEventListener("pointerdown", onPointerDown, true)
				eventWindow.removeEventListener("click", onClick, true)
				eventWindow.removeEventListener("dblclick", onDoubleClick, true)
				eventWindow.removeEventListener("keydown", onKeyDown, true)
				eventWindow.removeEventListener("keyup", onKeyUp, true)
				eventWindow.removeEventListener("blur", clearConnectorState)
				eventWindow.document.removeEventListener("visibilitychange", onVisibilityChange)
				if (marked.__canvasWhiteboardMouseCleanup === cleanup)
					delete marked.__canvasWhiteboardMouseCleanup
				this.mouseWindowCleanups.delete(eventWindow)
				this.connectorHeldStates.delete(eventWindow)
				this.connectorTrackers.delete(eventWindow)
				this.mouseEventWindows.release(eventWindow)
			}
			marked.__canvasWhiteboardMouseCleanup = cleanup
			this.mouseWindowCleanups.set(eventWindow, cleanup)
			this.register(cleanup)
		}

		const workspaceDocument = this.app.workspace.containerEl.ownerDocument
		registerForMouseWindow(workspaceDocument.defaultView ?? window)
		this.app.workspace.iterateAllLeaves(leaf => {
			registerForMouseWindow(leaf.view?.containerEl?.ownerDocument?.defaultView ?? null)
		})

		this.registerEvent(this.app.workspace.on("window-open", (_workspaceWindow, eventWindow) => {
			registerForMouseWindow(eventWindow)
		}))
		this.registerEvent(this.app.workspace.on("window-close", (_workspaceWindow, eventWindow) => {
			this.mouseWindowCleanups.get(eventWindow)?.()
		}))
	}

	onunload(): void {
		for (const cleanup of [...this.windowCleanups.values()]) cleanup()
		this.windowCleanups.clear()
		this.zoomControllers.clear()
		this.keyDownStates.clear()
		this.keyEventWindows.clear()
		for (const cleanup of [...this.mouseWindowCleanups.values()]) cleanup()
		this.mouseWindowCleanups.clear()
		this.connectorHeldStates.clear()
		this.connectorTrackers.clear()
		this.mouseEventWindows.clear()
		this.pendingMobileDiagnosticReport = undefined
		if (this.diagnostics.enabled) {
			try { this.activePanDiagnosticsBridge?.stopDiagnostics() } catch { /* optional bridge may unload independently */ }
			this.activePanDiagnosticsBridge = undefined
			this.panDiagnosticsStatus = "not-started"
			this.diagnostics.stop()
		}
	}

	registerEvents(): void {
		// 所有事件
		const EVENTS = [
			EVENT_copyCanvasCardReferenceMenu,
			EVENT_reverseEdges,
			EVENT_changeElementID,
			EVENT_selectDownstreamNodesMenu,
			EVENT_selectUpstreamNodesMenu,
			EVENT_adjustEdgeOnside,
			EVENT_toggleNodeEdgeSelect,
			EVENT_flipCanvasElementsH, EVENT_flipCanvasElementsV
		]
		// 注册事件
		for (const { on, callback } of EVENTS)
			if (typeof on === 'string')
				// @ts-ignore
				this.registerEvent(this.app.workspace.on(on, callback));
			else
				for (const eventType of on)
					// @ts-ignore
					this.registerEvent(this.app.workspace.on(eventType, callback));
	}

	registerCommands(): void {
		// 所有命令（根据APP注册（拿到引用））
		const COMMANDS = [
			CMD_copyCanvasElementReference,
			CMD_reverseSelectedCanvasEdges,
			CMD_changeElementID,
			CMD_selectDownstreamNodes,
			CMD_adjustEdgeOnside,
			CMD_selectUpstreamNodes,
			CMD_toggleNodeEdgeSelect,
			CMD_flipCanvasElementsH, CMD_flipCanvasElementsV
		]
		// 添加命令
		for (const cmdF of COMMANDS)
			this.addCommand(cmdF(this.app));
		this.addCommand({
			id: "start-mobile-canvas-diagnostics",
			name: "移动端 Canvas 诊断：开始（内存）",
			callback: () => this.startMobileDiagnostics(),
		})
		this.addCommand({
			id: "stop-copy-mobile-canvas-diagnostics",
			name: "移动端 Canvas 诊断：停止并复制报告",
			callback: () => { void this.stopAndCopyMobileDiagnostics() },
		})
	}

	patchWorkspaceLeaf(): void {
		// ! ❌↓失败：「注册」不是这么用的，应该是注册一个回调函数
		// this.register(() => new PatchWorkSpaceLeaf());
		// return
		this.register(around(WorkspaceLeaf.prototype, {
			// 钩子：打开文件
			openFile: (old) => async function (file: TFile, state?: ViewState) {
				// 原先的函数
				await old.call(this, file, state);
				// 调用自定义钩子
				openingFile(this, file, state);
			}
		}));
	}

	getBuiltInSuggest(): BuiltInSuggest {
		// @ts-ignore
		return this.app.workspace.editorSuggest.suggests[0];
	}

	patchEditorSuggest(): void {
		// console.log('patchEditorSuggest')
		// this.registerEditorSuggest(new PatchEditorSuggest(this.app));
		// console.log('patchEditorSuggest done');
		// return

		// * 📌以下代码借鉴自 <https://github.com/RyotaUshio/obsidian-rendered-block-link-suggestions>
		// * ❗这个是「替换」而非「新增」，不一定用得上
		// * 💭【2025-04-20 18:16:39】这儿能跑通，那就不用单独的class

		// builtin suggest
		const suggest = this.getBuiltInSuggest();
		const app = this.app;

		this.register(around(suggest.constructor.prototype, suggestAround(suggest, app)));
	}
}

function normalizeRotationColor(value: unknown): RotationColorCondition {
	return isRotationColorCondition(value) ? value : "3";
}

function normalizeString(value: unknown, fallback: string): string {
	return typeof value === "string" && value.trim() ? value.trim() : fallback
}
