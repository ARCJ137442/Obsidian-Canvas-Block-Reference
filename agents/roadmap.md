# 开发路线图

> 最后更新：2026-08-26

## 已验证基线

- Desktop、Android 手机与 Android 平板的 Canvas 快捷键行为一致。
- 主窗口、分栏和 popout 按事件所属 Window 隔离。
- Android 输入法退出后，BODY/HTML 事件只通过真实 Canvas pointerdown 建立的有界租约恢复。
- 移动端诊断默认关闭，按需与 Canvas Keyboard Pan 合并报告；当前真机验收无插件异常。

## 下一步优先级

### P0：拆分“匹配、执行、消费”语义

`onCanvasKeyDown` 当前仍以 boolean 表达处理结果。下一轮应至少区分 `matched`、`performed` 与 `consume`：没有选区、没有目标或没有实际动作时，不得仅因按键匹配就执行 `preventDefault()`／`stopImmediatePropagation()`。异步编辑、连续缩放和轮换聚焦要显式标记“已调度”。

验收需要覆盖 C 无选区、方向上没有可导航节点、Space 无选区、Z 异步调度、标题级别无目标，以及 WASD 与 Pan 同时存在时的传播语义。

### P1：降低诊断噪声与编辑态开销

把明显的 editable/composition 负路径尽量前置到 Canvas 解析之前；诊断开启时聚合高频同类拒绝事件，保留首条、末条与计数，避免用户输入反馈时淹没核心复现阶段。不得以降噪为由遗漏异常和安全闸门。

### P2：补监听生命周期集成测试

在纯租约单测之外，建立 pointerdown → 编辑态 → BODY 键盘 → blur/隐藏/Modal/active-leaf-change 的监听级序列测试，验证每 Window 只激活一次、清理幂等且不会跨窗口复用租约。

### P3：Obsidian 升级兼容性复核

Canvas 视图属于内部 API。Obsidian 大版本升级后重新验证 `zoomBy`、编辑 iframe、pointer path、popout Window 和移动端输入法生命周期；只有真机出现新证据时才修改上下文或内部 API 适配。

## 明确不做

- 不恢复 `BODY/HTML → activeLeaf` 或“唯一 Canvas”猜测。
- 不让诊断常驻轮询、写入 Vault 或采集正文／真实输入。
- 不因当前问题已修复而删除输入框、编辑态、Modal、composition、repeat 和跨窗口安全闸门。
