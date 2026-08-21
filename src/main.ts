import { Plugin, TFile, ViewState, WorkspaceLeaf } from 'obsidian';
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
import { canHandleCanvasKeyboardEvent, getCanvasFromEvent } from './canvas-context';
import { createContinuousZoomController } from './canvas-zoom';
import type { ContinuousZoomController } from './canvas-zoom';
import { KeyboardEventGuard } from './keyboard-event-guard';
import { WindowRegistrationRegistry } from './window-registration';
import type { Canvas } from 'obsidian/canvas';
import { canPropagateCanvasShortcut, DEFAULT_CANVAS_SHORTCUT_SETTINGS, normalizeCanvasShortcutSettings, withCanvasShortcutCode } from './canvas-shortcuts';
import type { CanvasShortcutSettingKey, CanvasShortcutSettings } from './canvas-shortcuts';
import { CanvasShortcutSettingTab } from './settings';
// import { CMD_selectAllEdgesInCanvas } from './commands/select-all-edges';
// ! ✅「选择所有连边」的功能，在AdvancedCanvas中有了

export default class CanvasReferencePlugin extends Plugin {
	private settings: CanvasShortcutSettings = DEFAULT_CANVAS_SHORTCUT_SETTINGS
	private persistedData: Record<string, unknown> = {}

	async onload(): Promise<void> {
		const loadedData = await this.loadData() as unknown
		if (loadedData && typeof loadedData === "object" && !Array.isArray(loadedData)) {
			this.persistedData = { ...(loadedData as Record<string, unknown>) }
			this.settings = normalizeCanvasShortcutSettings(this.persistedData.shortcuts)
		}
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
	}

	private keyEventWindows = new WindowRegistrationRegistry<Window>()
	private keyDownStates = new Map<Window, { [code: string]: boolean }>()
	private zoomControllers = new Map<Window, ContinuousZoomController>()
	private windowCleanups = new Map<Window, () => void>()
	private handledKeyboardEvents = new KeyboardEventGuard()

	getShortcutSettings(): CanvasShortcutSettings {
		return this.settings
	}

	async updateShortcut(id: CanvasShortcutSettingKey, code: string, index = 0): Promise<void> {
		this.settings = withCanvasShortcutCode(this.settings, id, code, index)
		this.clearAllKeyboardStates()
		this.persistedData.shortcuts = this.settings
		await this.saveData(this.persistedData)
	}

	private clearAllKeyboardStates(): void {
		for (const state of this.keyDownStates.values()) {
			for (const code of Object.keys(state)) delete state[code]
		}
		for (const controller of this.zoomControllers.values()) controller.stop()
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
				if (event.repeat) return
				const canvas = getCanvasFromEvent(this.app, event, eventWindow)
				if (!canvas || !canHandleCanvasKeyboardEvent(event, canvas)) return
				if (!this.handledKeyboardEvents.consume(event)) return

				isKeyDown[event.code] = true
				if (event.ctrlKey || event.altKey || event.metaKey) {
					zoomController.stop()
					zoomCanvas = undefined
				}
				if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
					zoomShiftFallback = true
				}
				const handled = onCanvasKeyDown(event, isKeyDown, canvas, {
					startContinuousZoom: (zoomTarget, shiftKey) => {
						zoomCanvas = zoomTarget
						zoomShiftFallback = shiftKey
						zoomController.start()
					},
				}, this.settings)
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
				if (!this.handledKeyboardEvents.consume(event)) return
				isKeyDown[event.code] = false
				if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
					zoomShiftFallback = isKeyDown['ShiftLeft'] === true || isKeyDown['ShiftRight'] === true
				}
				if (event.code === this.settings.zoom) {
					zoomController.stop()
					zoomCanvas = undefined
				}
			}
			const onVisibilityChange = (): void => {
				if (eventWindow.document.visibilityState !== "visible") clearKeyState()
			}

			eventWindow.addEventListener("keydown", onKeyDown, true)
			eventWindow.addEventListener("keyup", onKeyUp, true)
			eventWindow.addEventListener("blur", clearKeyState)
			eventWindow.document.addEventListener("visibilitychange", onVisibilityChange)

			let cleaned = false
			const cleanup = (): void => {
				if (cleaned) return
				cleaned = true
				eventWindow.removeEventListener("keydown", onKeyDown, true)
				eventWindow.removeEventListener("keyup", onKeyUp, true)
				eventWindow.removeEventListener("blur", clearKeyState)
				eventWindow.document.removeEventListener("visibilitychange", onVisibilityChange)
				if (windowWithCleanup.__canvasBlockReferenceKeyboardCleanup === cleanup)
					delete windowWithCleanup.__canvasBlockReferenceKeyboardCleanup
				this.windowCleanups.delete(eventWindow)
				zoomController.stop()
				this.zoomControllers.delete(eventWindow)
				this.keyDownStates.delete(eventWindow)
				this.keyEventWindows.release(eventWindow)
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
	}

	onunload(): void {
		for (const cleanup of [...this.windowCleanups.values()]) cleanup()
		this.windowCleanups.clear()
		this.zoomControllers.clear()
		this.keyDownStates.clear()
		this.keyEventWindows.clear()
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
