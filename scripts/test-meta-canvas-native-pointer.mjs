import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'

// Run through measure-command.ps1. This test needs a running desktop Obsidian;
// dispatching a DOM dblclick directly cannot test browser pointer-capture retargeting.
const args = process.argv.slice(2)
const option = (name, fallback) => {
	const index = args.indexOf(name)
	return index < 0 ? fallback : args[index + 1]
}
const vault = option('--vault', 'life-panel')
const windowMode = option('--window', 'main')
assert.ok(['main', 'popout'].includes(windowMode), '--window must be main or popout')
const executable = process.env.OBSIDIAN_CLI || (process.platform === 'win32' ? 'obsidian.com' : 'obsidian')

function cli(...args) {
	const output = execFileSync(executable, [`vault=${vault}`, ...args], { encoding: 'utf8', timeout: 15000 })
	if (/^Error:/m.test(output)) throw new Error(output.trim())
	return output.trim()
}

function evaluate(source) {
	const encoded = Buffer.from(source).toString('base64')
	const output = cli('eval', `code=eval(new TextDecoder().decode(Uint8Array.from(atob('${encoded}'),c=>c.charCodeAt(0))))`)
	return JSON.parse(output.slice(output.indexOf('=> ') + 3))
}

function rawCdp(method, params = {}) {
	return JSON.parse(cli('dev:cdp', `method=${method}`, `params=${JSON.stringify(params)}`))
}

let sessionId
let messageId = 0
function input(method, params) {
	if (!sessionId) return rawCdp(method, params)
	return rawCdp('Target.sendMessageToTarget', {
		sessionId,
		message: JSON.stringify({ id: ++messageId, method, params }),
	})
}

let point
function mouse(type, clickCount = 1, button = 'left', extra = {}) {
	input('Input.dispatchMouseEvent', { type, ...point, button, clickCount, ...extra })
}
function click(count = 1) {
	mouse('mousePressed', count)
	mouse('mouseReleased', count)
}
function doubleClick() { click(1); click(2) }
function place() {
	point = evaluate(`(()=>{const s=app.__arcNativePointer,v=s.view;app.workspace.setActiveLeaf(s.leaf,{focus:false});v.cancelScheduledFit();v.interaction.cancel();v.compatibilityClicks.clearAll();v.lastTouchTap=undefined;const p=v.positions[s.path];v.motion.setImmediate({zoom:1,panX:300-p.x-118,panY:300-p.y-118});const r=v.boardElements.get(s.path).getBoundingClientRect();if(!r.width)throw Error('test tab is not visible');return JSON.stringify({x:r.x+r.width/2,y:r.y+r.height/2})})()`)
}

let failure
try {
	if (windowMode === 'popout') {
		const main = rawCdp('Target.getTargetInfo').targetInfo
		const targets = rawCdp('Target.getTargets').targetInfos.filter(t => t.type === 'page' && t.openerId === main.targetId)
		assert.equal(targets.length, 1, 'test requires exactly one existing popout')
		sessionId = rawCdp('Target.attachToTarget', { targetId: targets[0].targetId, flatten: false }).sessionId
	}
	evaluate(`(async()=>{if(app.__arcNativePointer)throw Error('another pointer test is active');const all=app.workspace.getLeavesOfType('canvas').concat(app.workspace.getLeavesOfType('arc-meta-canvas'));const docs=[...new Set(all.map(l=>l.view.containerEl.ownerDocument))].filter(d=>${windowMode === 'main' ? 'd===document' : 'd!==document'});if(docs.length!==1)throw Error('ambiguous test window');const ref=all.find(l=>l.view.containerEl.ownerDocument===docs[0]);const s=app.__arcNativePointer={active:app.workspace.activeLeaf,originals:all.filter(l=>l.tabHeaderEl?.classList.contains('is-active')),events:[],opens:[],writes:0};s.leaf=app.workspace.createLeafInParent(ref.parent,ref.parent.children.length);await s.leaf.setViewState({type:'arc-meta-canvas',active:true});await app.workspace.revealLeaf(s.leaf);const v=s.view=s.leaf.view;s.path=v.graph.boards[0].path;s.originalOpen=v.openBoard;v.openBoard=async path=>s.opens.push(path);v.actions.setPositions=async()=>{s.writes++};s.listener=e=>s.events.push({type:e.type,trusted:e.isTrusted,card:!!e.target?.closest?.('.arc-meta-canvas-board-card'),detail:e.detail});for(const t of ['pointerdown','pointerup','gotpointercapture','lostpointercapture','click','dblclick'])v.viewport.addEventListener(t,s.listener,true);return JSON.stringify({ready:true})})()`)
	place()
	click()
	const single = evaluate(`JSON.stringify({selected:app.__arcNativePointer.view.selectedPath===app.__arcNativePointer.path,opens:app.__arcNativePointer.opens.length})`)
	assert.equal(single.selected, true, 'real single click must select the card')
	assert.equal(single.opens, 0, 'single click must not navigate')
	doubleClick()
	const result = evaluate(`JSON.stringify({opens:app.__arcNativePointer.opens.length,events:app.__arcNativePointer.events})`)
	assert.equal(result.opens, 1, 'real mouse double-click must open exactly once')
	assert.ok(result.events.some(e => e.type === 'dblclick' && e.trusted && e.card), 'browser dblclick must reach the card')

	place()
	mouse('mousePressed')
	mouse('mouseMoved', 0, 'left', { x: point.x + 30, y: point.y + 20, buttons: 1 })
	mouse('mouseReleased', 1, 'left', { x: point.x + 30, y: point.y + 20 })
	const drag = evaluate(`JSON.stringify({opens:app.__arcNativePointer.opens.length,writes:app.__arcNativePointer.writes,owned:app.__arcNativePointer.view.interaction.activePointerIds.length})`)
	assert.equal(drag.opens, 1, 'drag must not open the card')
	assert.equal(drag.writes, 1, 'drag must commit once')
	assert.equal(drag.owned, 0, 'pointer must be released')
	place()
	doubleClick()
	assert.equal(evaluate(`JSON.stringify(app.__arcNativePointer.opens.length)`), 2, 'double-click after dragging must still work')

	place()
	// Desktop CDP mouse input is trusted. Touch here is an explicit event-order
	// regression only; it does not claim to validate a real mobile WebView.
	evaluate(`(()=>{const s=app.__arcNativePointer,v=s.view,card=v.boardElements.get(s.path),w=card.ownerDocument.defaultView,r=card.getBoundingClientRect();for(let i=0;i<2;i++){const init={bubbles:true,pointerId:123,pointerType:'touch',clientX:r.x+100,clientY:r.y+100,button:0};card.dispatchEvent(new w.PointerEvent('pointerdown',init));card.dispatchEvent(new w.PointerEvent('pointerup',init));card.dispatchEvent(new w.PointerEvent('lostpointercapture',init))}return JSON.stringify(true)})()`)
	const touch = evaluate(`JSON.stringify({opens:app.__arcNativePointer.opens.length,pointers:app.__arcNativePointer.view.interaction.activePointerIds.length})`)
	assert.equal(touch.opens, 3, 'touch capture release must preserve a double-tap')
	assert.equal(touch.pointers, 0)
	place()
	assert.ok(evaluate(`(()=>{const v=app.__arcNativePointer.view,w=v.viewport.ownerDocument.defaultView,r=v.viewport.getBoundingClientRect();v.viewport.dispatchEvent(new w.WheelEvent('wheel',{bubbles:true,cancelable:true,ctrlKey:true,deltaY:-70,clientX:r.x+300,clientY:r.y+300}));return JSON.stringify(v.motion.targetTransform.zoom>1)})()`), 'Ctrl+wheel must still zoom')

	// Exercise the real navigation callback after the observer/counting checks.
	place()
	evaluate(`(()=>{const s=app.__arcNativePointer;s.view.openBoard=async path=>{s.navigation=s.originalOpen.call(s.view,path);await s.navigation};return JSON.stringify(true)})()`)
	doubleClick()
	const opened = evaluate(`(async()=>{const s=app.__arcNativePointer;if(!s.navigation)throw Error('navigation was not dispatched');await s.navigation;return JSON.stringify({sameLeaf:s.leaf.view.getViewType()==='canvas',correctPath:s.leaf.view.file?.path===s.path})})()`)
	assert.deepEqual(opened, { sameLeaf: true, correctPath: true })
	console.log(JSON.stringify({ window: windowMode, trustedMouse: true, singleClick: true, doubleClick: true, dragThenDoubleClick: true, syntheticCtrlWheel: true, syntheticTouchCaptureRelease: true, nativeCanvasInSameLeaf: true }))
} catch (error) {
	failure = error
} finally {
	const errors = failure ? [failure] : []
	try { if (point) mouse('mouseReleased') } catch (error) { errors.push(error) }
	try {
		evaluate(`(()=>{const s=app.__arcNativePointer;if(s){s.leaf?.detach();for(const l of s.originals)if(l.parent)app.workspace.setActiveLeaf(l,{focus:false});if(s.active?.parent)app.workspace.setActiveLeaf(s.active,{focus:false});delete app.__arcNativePointer}return JSON.stringify(true)})()`)
	} catch (error) { errors.push(error) }
	try { if (sessionId) rawCdp('Target.detachFromTarget', { sessionId }) } catch (error) { errors.push(error) }
	if (errors.length) failure = errors.length === 1 ? errors[0] : new AggregateError(errors, 'Native pointer test or cleanup failed')
}
if (failure) throw failure
