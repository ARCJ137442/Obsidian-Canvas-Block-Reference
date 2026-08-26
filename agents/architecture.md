# 架构与数据完整性

> 最后更新：2026-08-26

## 运行时数据流

```text
Window keydown/keyup
        ↓
resolveCanvasFromEvent
  ├─ getCanvasFromEvent：事件 DOM 直接归属
  └─ CanvasPointerLeaseRegistry：同窗口 BODY/HTML 指针租约
        ↓
canHandleCanvasKeyboardEvent
        ↓
getCanvasShortcutId(event, settings)
        ↓
canvas-keydown-features
        ↓
commitCanvasMutation → requestFrame + requestSave
```

事件所属的 Window、Document、Canvas 和 key state 是同一上下文。不要把 `app.workspace.getActiveViewOfType` 当作副窗口事件的 Canvas 来源。移动端首次编辑后若键盘 target 退化为 `BODY/HTML`，只能复用该 Window 最近一次由 Canvas DOM pointerdown 建立的正归属证据；租约不跨 Window/Document，也不能在输入控件、Modal、隐藏页或已关闭 Canvas 上生效。

## 每窗口生命周期

`src/main.ts` 为主窗口和每个 popout Window 各自维护：

- key state map；
- continuous zoom controller；
- cleanup callback；
- registration claim；
- Canvas pointer lease。

窗口关闭、插件 unload、blur、Document 隐藏或 active leaf 变化时必须停止 controller、删除 key state、清除 pointer lease，并释放 registration。任何新增 listener 都必须挂在这套生命周期中，不能直接散落到全局 `document`。

## Canvas mutation transaction

修改节点或边时使用 `commitCanvasMutation`，让一次逻辑操作只产生一次刷新和保存。连边操作必须把完整 Canvas data 写回后交由外层事务保存。`createCanvasTextNode` 已调用 Obsidian 的 `createTextNode` 并入图，调用方不得再次 `addNode`。

翻转功能采取保守边界：处理直接选中的边，或两端节点都在选区内的边；不能因为选中 A 就改动 A→未选中 B 的另一端。

ID 修改必须拦截空值与重复值，并在失败时给出 Notice；改 ID 时要检查已有链接更新语义，不要只改内存对象。

## 读取与跨平台

- 已打开 Canvas：优先从当前 Canvas view 的内存节点读取，避免把未保存内容误判为不存在。
- 未打开 Canvas：通过 Obsidian Vault API 读取，并使用受控的 mtime 缓存；JSON 解析必须捕获异常并安全降级。
- 运行时不使用 Node `fs`、`crypto` 或路径库；UUID 使用 Web Crypto，必要时使用浏览器兼容 fallback。
- 构建脚本可以使用 Node，这是开发工具依赖，不等于插件运行时可以导入 Node。

## 性能与反馈

紧凑布局使用当前 shelf/brick 近似算法，目标复杂度为 `O(n log n)`，不得退回 `O(n²)` 的全节点两两比较；节点数量较大时显示持续 Notice 进度。剪贴板必须等待 Promise、捕获失败，并且只有成功后才显示“已复制”。

## 按需诊断

`src/diagnostics.ts` 使用有上限的内存环形缓冲，默认关闭；不得把正文、实际输入、`KeyboardEvent.key` 或剪贴板写入报告。`src/plugin-bridge.ts` 只在诊断会话中与 Canvas Keyboard Pan 共享 session ID，停止报告必须记录最终桥接状态。正常路径不运行后台轮询；Pan tick 只在诊断开启时按 100 ms 降采样。

移动端效果可能晚于下一动画帧：同步指纹、下一动画帧和 150 ms settled 阶段表达不同观察窗口，不能把“同步无变化”直接判定为动作失败。

## Monkey patch 边界

`WorkspaceLeaf.openFile` 与内置 Suggest 的 patch 属于 Obsidian 内部 API 适配层。当前版本验证有效时可以保留，但每次 Obsidian 升级或错误出现时应单独验证 patch 入口。不要为了“看起来更现代”在没有替代行为和回归证据时随意移除或重写。
