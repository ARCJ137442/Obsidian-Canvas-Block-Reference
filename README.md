# Obsidian白板推演-ARC.ver

这是 ARCJ137442 自用的 Obsidian Canvas 白板推演工具集，已从旧的 `canvas-block-reference` 身份迁移。功能重点包括白板节点与连边操作、Canvas 链接建议、选区处理、布局、计数和多窗口快捷键。

## 主要特性

- 主窗口与独立白板窗口使用等效的快捷键行为，并严格隔离到事件所在的白板。
- 输入框、节点编辑态、命令面板、搜索框、重复按键和窗口失焦不会误触发白板操作。
- Z 支持按住连续缩放；按住或释放 Shift 时动态改变缩放方向。
- 节点创建、连边、ID 修改、翻转和紧凑布局具备保存、撤销边界与失败提示。
- 建议读取优先使用已打开 Canvas 的内存内容；未打开文件使用 Obsidian Vault API，不依赖 Node 运行时。
- 快捷键可在插件设置中通过按键选择器修改，冲突按键会被拦截。
- Android 外接键盘在节点编辑与输入法退出后继续保持白板操作；恢复依赖同窗口真实 Canvas 指针归属，不会把输入框或弹窗误认成白板。
- 提供默认关闭的移动端诊断命令，可将本插件与 Canvas Keyboard Pan 的有界内存日志合并复制，用于真机兼容性排查。
- 白板引用导航与元白板：从当前白板回溯具体入口，并以只读关系图浏览 Vault 中的白板结构。

## 白板引用导航与元白板

- `回溯引用当前白板的入口` 只在 Canvas 中可用；多来源白板与同板多个入口分步选择，最后在原白板中定位并聚焦具体节点。
- `前进到下游白板引用` 在当前标签页进入选中节点指向的白板；选中文本节点或嵌入笔记时读取其链接，多选时合并选中范围，无选中时浏览整张白板的下游候选。
- 多候选按最近成功跳转时间排序，白板与具体入口分别记忆；取消或失败不更新历史。记录保存在插件数据中，重载后保留，未访问候选保持原有顺序。
- `打开元白板` 打开独立关系图页面，展示白板缩略图、引用方向与入口数量；默认只纳入白板文件节点。
- 可在插件设置中启用文本节点里的 Wikilink、Markdown 链接与嵌入链接。
- 元白板默认按分层布局排列，也可切换力导向布局；拖动节点会固定位置。软重置保留固定位置，硬重置经确认后清除固定位置。
- 卡片默认为正方形，也可按白板内容宽高比调整。布局与形状可在设置页或元白板工具菜单中切换。
- 元白板只读原始 Canvas 文件；手动位置和显示选项保存在 ARC 插件设置中。
- 元白板支持滚轮平移、Shift + 滚轮横移、Ctrl / Meta + 滚轮按鼠标位置缩放，以及中 / 右键拖动。绘图区获得焦点后可用 Space + 主键临时平移。
- 触摸短拖平移，双指按中心缩放并平移；长按卡片约 600ms 后拖动才移动并固定节点。单击选择、双击打开，点击空白或 Escape 取消选择。
- 0.6.2 的键鼠与触摸交互修复已通过自动测试和桌面 CLI 验证，手机 / 平板真机仍待人类核验；详见[交互契约与验收](agents/meta-canvas-interactions.md)。

## 快捷键

默认按键如下；可在「设置 → Obsidian白板推演-ARC.ver」中修改单键绑定和按键族槽位。

| 功能 | 默认按键 |
| --- | --- |
| 编辑节点 | Space / Enter |
| 删除选区 | X |
| 取消选中 | Q / Esc |
| 轮换白板颜色 | C；Shift+C 反向 |
| 方向选中 | W / A / S / D；按住 Shift 扩展 |
| 延展或中央创建节点 | E |
| 聚焦选区 | F |
| 连续缩放 | Z；Shift+Z 拉远 |
| 创建连边 | Shift+R |
| 紧凑布局 | Ctrl+Shift+Alt+E |
| CTDP 计数 | Y；Shift+Y 清零 |
| 标题级别 | 数字键 |
| 拆分 Markdown 无序列表 | Shift+K |
| 回溯白板入口 | Alt+↑ |
| 前进到下游白板 | Alt+↓ |

数字键标题级别、编辑和取消选中在设置中分别作为独立按键族配置：编辑和取消选中可逐个修改两个槽位，标题级别可逐个修改 0~9 级别对应的按键。导航键可在设置中改绑；候选弹窗内再次按对应组合键会选择当前搜索结果的第一项。未配置的 Ctrl、Alt、Meta 组合键不会被本插件拦截。

## Usage

打开插件设置即可配置单键快捷键、编辑按键族、取消选中按键族和标题级别按键族。每个按键选择器保存 `KeyboardEvent.code`；冲突按键会被拦截，主窗口和独立白板窗口使用同一套配置。

## 安装

### BRAT

添加仓库：`ARCJ137442/obsidian-canvas-block-reference`。

### 手动安装

下载 Release 中版本化的 `obsidian-whiteboard-deduction-arc-<tag>.zip`，解压到：

`{{obsidian_vault}}/.obsidian/plugins/obsidian-whiteboard-deduction-arc`

确保目录中包含 `main.js`、`manifest.json` 和 `styles.css`，然后在 Obsidian 的第三方插件设置中启用「Obsidian白板推演-ARC.ver」。

## 0.1.0 身份迁移

本版本把插件 ID 从 `canvas-block-reference` 改为 `obsidian-whiteboard-deduction-arc`。这是 Obsidian 识别插件的身份变化，不是 Canvas 文件格式变化。

升级个人仓库时：

1. 先禁用旧插件，避免旧目录和新目录同时注册键盘监听。
2. 将旧目录中的 `data.json` 复制到新目录；其中已有的 Project Graph 配置会保留。
3. 如果需要保留旧命令快捷键，把 `.obsidian/hotkeys.json` 中 `canvas-block-reference:` 前缀替换为 `obsidian-whiteboard-deduction-arc:`，快捷键数组内容不要改动。
4. 启用新插件并打开设置页，确认按键配置后再移除旧目录；建议先保留旧目录作为回滚副本。

本仓库的测试 Vault 已完成上述迁移，旧 ID 不再列入启用插件列表。Canvas 文件、节点 ID、连边和插件数据字段不会因 ID 迁移而改变。

## License

本项目使用 [MIT License](LICENSE)。

## 开发与验证

```text
npm ci
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/measure-command.ps1 -Label "whiteboard-tests" -Command "npm test"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/measure-command.ps1 -Label "whiteboard-build" -Command "npm run build"
```

测试资源记录见 [`tests/resource-usage.md`](tests/resource-usage.md)。
开发规范与交接文档见 [`AGENTS.md`](AGENTS.md) 和 [`agents/`](agents/)。
下一步开发顺序见 [`agents/roadmap.md`](agents/roadmap.md)。
