# 白板快捷键安全规范

> 最后更新：2026-08-21

## 总原则

白板快捷键必须同时满足两条：

- 正常路径：在当前聚焦 Canvas 中，按键只操作当前 Canvas。
- 负路径：在无关路径中不产生任何白板副作用，也不吞掉 Obsidian 或编辑器本身的快捷键。

任何只证明“按键能用”而没有证明“无关路径不响应”的实现，都不算完成。

## 事件上下文

`src/canvas-context.ts` 的解析顺序是：

1. 从事件 target/composed path 找到所属 Canvas DOM。
2. 如果事件没有元素 target，只能在同一窗口内做安全回退；不能跨窗口使用 active view。
3. 如果 target 是 Canvas 外的真实元素，直接返回 `undefined`。这覆盖 Modal、设置页、命令面板、搜索区域和其他插件 UI。

不要把“当前窗口只有一个 Canvas”当成“窗口里的所有键盘事件都属于 Canvas”。这是最容易制造无关路径误操作的错误。

## 必须拒绝的负路径

| 路径 | 保护方式 |
|---|---|
| `input`、`textarea`、`select`、textbox、contenteditable | `isEditableTarget` 沿祖先链检查 |
| Canvas 节点正在编辑 | `isCanvasEditing` 交还编辑器 |
| Modal、命令面板、搜索框、设置页 | target 不属于 Canvas，context resolver 返回空 |
| 输入法组合态 | `event.isComposing` 直接拒绝 |
| 浏览器/Obsidian 重复 keydown | `event.repeat` 直接拒绝 |
| Ctrl、Alt、Meta 组合 | shortcut matcher 要求这些修饰键为 false |
| 窗口失焦、Document 隐藏、窗口关闭 | 清空该窗口 key state 并停止 controller |
| 其他 Canvas 窗口 | 通过 ownerDocument/defaultView 和 DOM 归属隔离 |

## 修饰键与按键状态

- `KeyboardEvent.code` 是配置和匹配的唯一按键身份，不使用本地化 `key` 保存配置。
- Shift 不是一律禁止：颜色、计数、连边、列表拆分和缩放等明确功能可以使用 Shift 语义。
- Ctrl/Alt/Meta 默认表示无关组合；不应因为 Canvas 处于 active 就拦截 `Ctrl+S`、`Alt+...` 或 Meta 快捷键。
- 连续缩放必须在 `keydown` 启动、`keyup` 停止；计时器只能有一个。按住 Z 时按下/释放 Shift，下一次 tick 应立即改变方向。
- 修改快捷键配置时清空所有窗口的 key state 和连续 controller，避免旧按键状态污染新配置。

## 多窗口与重复监听

每个 `Window` 只允许一套 keydown/keyup/blur/visibilitychange listener。注册表必须支持 claim、release、clear；插件 reload 和 window-close 都必须走同一个幂等 cleanup。处理事件后才可以 `preventDefault` 和 `stopImmediatePropagation`，未命中快捷键的事件必须保持原样。

## 配置规则

按键定义集中在 `src/canvas-shortcuts.ts`，功能文件只使用 `shortcutId`、`getCanvasDirection` 和配置值。设置页使用单键选择器保存 `KeyboardEvent.code`，选择器必须拒绝：

- 修饰键本身；
- 与其他功能在同一修饰键域重叠的按键；
- 会让数字标题键族或固定编辑键产生不可区分行为的按键。

编辑、取消选中和标题级别是“按键族”，但不是固定按键：设置页必须分别暴露每个槽位，匹配器从配置读取按键。标题族的数组槽位表达标题级别 0~9，不能因为换绑按键而丢失级别语义；保存前必须拦截族内重复和跨功能冲突。默认值仅是迁移与首次安装时的起点。

## 最低回归矩阵

每次修改白板按键至少验证：

1. 主窗口普通按键。
2. 独立窗口同一按键。
3. 两窗口同时存在时只影响事件所在 Canvas。
4. 主窗口与副窗口同一操作的调用次数相等。
5. Ctrl/Alt/Meta 组合不触发。
6. 输入框、编辑态、Modal/设置外部 DOM 不触发。
7. 长按/keyup/Shift 动态方向正确。
8. blur、visibilitychange、reload 后没有卡死状态或双倍操作。

## 鼠标路径（选择切换自动连边）

> 最后更新：2026-08-23

按住「连接触发键」（默认 Ctrl，可配置）时，点击/双击白板自动为 源→目标 创建最近锚点单向连边。实现见 `src/canvas-mouse-features.ts` + `src/canvas-mouse-util.ts`；最近锚点复用 `calculateNearestLinkSides`（`src/canvas-edge-operations.ts`）。

**源（source）** = pointerdown 捕获的当前选中（快照）；若选区不可靠（链式双击时前一个节点常被原生清出选区），退化为**最近锚点** `tracker.lastAnchor`（上一次连边/创建的目标节点）。**目标** = 被点击节点（路径 A 自切换选中）或双击空白创建的新节点（路径 B / 延时 `tryDeferredConnect`）。

### 性能边界（领域展开）

事件处理**平时零开销**：pointerdown/click/dblclick 的第一行就检查 `isConnectorHeld`（修饰键读 `event.ctrlKey`，普通键读 keydown/keyup 追踪），**未按下连接键直接 return**，不做 `getCanvasFromEvent`/快照/查找。只有按下连接键才跑完整逻辑。

### 会话生命周期

- 按下连接键：只置 held 标记，**不动节点/边/选区**（纯后台标记）。
- 松开连接键（keyup）或 blur/visibilitychange：清空 held + 快照 + `lastAnchor`，结束本次连边会话，避免遗留状态与后续意外连边。

### 与键盘路径的有意差异

| 项 | 键盘路径 | 鼠标路径 |
|---|---|---|
| 编辑态闸门 | `isCanvasEditing` 拒绝 | **不用**——链式连按恰好在编辑态发生 |
| Ctrl/Alt/Meta | shortcut matcher 要求 false | 连接触发键（默认 Ctrl）正是触发条件 |
| 事件处理 | 命中后 preventDefault/stopImmediatePropagation | **绝不 preventDefault**，纯叠加副作用 |

### 鼠标路径必须拒绝的负路径

| 路径 | 保护方式 |
|---|---|
| 未按连接键 | 处理器入口直接短路（零开销） |
| Modal、命令面板、搜索框、设置页 | `getCanvasFromEvent` 返回空 |
| 其他 Canvas 窗口 | ownerDocument/defaultView 隔离 |
| 窗口失焦、Document 隐藏、窗口关闭 | 清空 held + 快照 + 锚点 |

### 鼠标路径最低回归矩阵

每次修改白板鼠标路径至少验证：

1. 主窗口 Ctrl+点击已存在节点 → 源选中连到该节点。
2. 主窗口 Ctrl+双击空白 → 原生建节点 + 源连到新节点，新节点编辑态不被打断。
3. 独立窗口同一操作等效。
4. 按住连接键连续双击 → 链式 A→B→C（源退化为锚点）。
5. 无连接键 / Alt / Meta + 点击 → 原生行为、零连边、零解析开销。
6. 松开连接键后再操作 → 无遗留连边。
7. 连接键设为「已禁用」→ 鼠标解析完全短路。
8. blur、visibilitychange、reload 后无残留状态或双倍连边。
