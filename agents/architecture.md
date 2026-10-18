# 架构与数据完整性

> 最后更新：2026-10-18

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

- 共享 `focusNode` 先等目标 Canvas、节点和可测量视口，再通过 Canvas 自身 API 提交视口动画目标，核对中心与尺度；未确认聚焦返回 false。Life Series / Life Panel 只调用该能力，不把“已选中”推断为“已居中”。

- 已打开 Canvas：优先从当前 Canvas view 的内存节点读取，避免把未保存内容误判为不存在。
- 未打开 Canvas：通过 Obsidian Vault API 读取，并使用受控的 mtime 缓存；JSON 解析必须捕获异常并安全降级。
- 运行时不使用 Node `fs`、`crypto` 或路径库；UUID 使用 Web Crypto，必要时使用浏览器兼容 fallback。
- 构建脚本可以使用 Node，这是开发工具依赖，不等于插件运行时可以导入 Node。

## 性能与反馈

紧凑布局使用当前 shelf/brick 近似算法，目标复杂度为 `O(n log n)`，不得退回 `O(n²)` 的全节点两两比较；节点数量较大时显示持续 Notice 进度。剪贴板必须等待 Promise、捕获失败，并且只有成功后才显示“已复制”。

## 按需诊断

`src/diagnostics.ts` 使用有上限的内存环形缓冲，默认关闭；不得把正文、实际输入、`KeyboardEvent.key` 或剪贴板写入报告。`src/plugin-bridge.ts` 只在诊断会话中与 Canvas Keyboard Pan 共享 session ID，停止报告必须记录最终桥接状态。正常路径不运行后台轮询；Pan tick 只在诊断开启时按 100 ms 降采样。

移动端效果可能晚于下一动画帧：同步指纹、下一动画帧和 150 ms settled 阶段表达不同观察窗口，不能把“同步无变化”直接判定为动作失败。

## 白板引用导航与最近记录（0.6.1）

- `canvas-reference-service.ts` 通过 Obsidian 索引发现来源白板，再按需读取 Canvas JSON；不持久化派生关系索引。
- 无选中时前进候选服从 ARC 引用范围设置；明确选中时限定在选中节点，支持白板文件、嵌入 Markdown 笔记及文本内链，多选取并集。选择节点不会扩大为整张白板。
- `canvas-reference-model.ts` 定义排序与记录键。历史按导航方向、起点、目标白板及可选节点 ID 区分；白板时间与入口时间独立，未访问或同时间的候选保留原顺序。
- `referenceNavigationRecency` 只在打开目标或聚焦节点成功后更新，写入插件 `data.json`，最多保存 256 项。所有本实例的配置写入经 `main.ts` 的 `savePersistedData()` 排队；这不承诺跨设备并发写入的合并。
- 文字选择器、元白板的回溯入口及边详情共用同一导航入口，键盘提示与快捷选择从当前按键配置派生。查询完成时检查来源 leaf 是否仍在原白板，避免过期结果重新打开选择器。
- `workspace-navigation.ts` 等待目标 leaf 所属窗口的帧，并以 50ms 计时器处理隐藏窗口暂停帧的情况。隐藏窗口通过原生 `panTo` 立即提交节点中心，缩放在窗口可见后继续原生渲染。未能选中节点返回失败，不能据此记录成功跳转。
- Canvas 的 `requestFrame()` 仅请求渲染，不接受回调；等待渲染使用目标 Window 的 `requestAnimationFrame` 与计时器回退，不能把函数传入 Canvas 的时间戳参数。

## 元白板输入与视口（0.6.2）

- `meta-canvas-interaction.ts` 提供纯手势状态机、世界坐标缩放锚点、滚轮单位归一、目标累计动画和有界兼容点击抑制；`meta-canvas-view.ts` 负责真实 DOM、当前窗口计时器和节点位置持久化回调。
- 普通触摸拖动不移动节点；长按卡片后拖动才进入节点事务。第二指接管时撤回未提交节点移动，指针取消 / 失焦 / 关闭同样回滚。节点起点来自当前 `positions[path]`，不复用渲染时的旧闭包。
- pointer capture 失败时，所在 Window 只接续该视口已经拥有的 pointer ID；重绘和关闭移除这些监听。按键仍限制在视口焦点，不回退到全局 activeLeaf。
- 动画使用目标 Window 的 performance / rAF 时钟；连续滚轮累计目标，隐藏窗口直接提交，平移或新手势取消旧动画。后台关系更新保留用户视口；首次适配可被用户输入取消。
- `data-ignore-swipe` 兼容当前宿主的工作区手势边界；局部非 passive touch 处理与 `touch-action` / `overscroll-behavior` 共同约束绘图区，输入控件、详情和其它页面不接管。
- 触摸手动双 tap 与浏览器合成 click / dblclick 去重；新鼠标 pointerdown 清除对应抑制，辅助技术 `detail=0` 点击保留。详见 [`meta-canvas-interactions.md`](meta-canvas-interactions.md)。

## Monkey patch 边界

`WorkspaceLeaf.openFile` 与内置 Suggest 的 patch 属于 Obsidian 内部 API 适配层。当前版本验证有效时可以保留，但每次 Obsidian 升级或错误出现时应单独验证 patch 入口。不要为了“看起来更现代”在没有替代行为和回归证据时随意移除或重写。
