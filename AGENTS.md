# AGENTS.md — Obsidian白板推演-ARC.ver

> 最后更新：2026-08-26

这是本插件给 Agent 的规则入口。它只保存必须在每次开发前看到的边界、命令和文档路由；详细机制放在 `agents/`，不要把这里写成变更日志。

## 项目定位

本项目是 ARCJ137442 自用的 Obsidian Canvas 白板推演工具集。当前插件身份为：

- 显示名：`Obsidian白板推演-ARC.ver`
- ID：`obsidian-whiteboard-deduction-arc`
- 运行平台：Obsidian Desktop 与 Mobile 兼容目标；插件运行时不得依赖 Node 专属 API
- 构建入口：`src/main.ts`

## 不可违反的开发边界

1. **正常路径和负路径同等重要**：每个白板按键功能都要同时验证“当前 Canvas 应该响应”和“输入框、弹窗、命令、编辑器、其他窗口不应响应”。
2. **Canvas 上下文来自可验证归属**：优先使用 `getCanvasFromEvent` 解析事件所在的 `Document`、窗口和 Canvas；Android 编辑退出后的 `BODY/HTML` 只能复用同 Window 真实 Canvas pointerdown 建立的有界租约。不得用 `activeLeaf` 或“唯一 Canvas”猜测目标。
3. **窗口必须隔离且行为等效**：主窗口、分栏和独立窗口各自注册一次监听；只操作当前事件所属 Canvas；重载、关闭、失焦和隐藏时必须清理状态。
4. **快捷键集中数据驱动**：按键和修饰键定义集中在 `src/canvas-shortcuts.ts`；功能代码不得重新散落硬编码旧按键。配置保存 `KeyboardEvent.code`，设置页负责冲突拦截。
5. **无关组合键不得被拦截**：Ctrl、Alt、Meta 组合默认不进入白板快捷键；Shift 只有在功能明确把它当方向/反向状态时才参与处理。重复事件、输入法组合态、编辑控件和 Canvas 节点编辑态必须退出。
6. **连续行为必须按下/弹起建模**：连续缩放不能退化为一次离散操作；按键状态、Shift 动态方向、`keyup`、`blur` 和 `visibilitychange` 都要覆盖。
7. **Canvas 数据修改走事务**：节点、连边、颜色、ID、翻转和布局等修改要通过统一 mutation 边界保存并请求刷新；`createTextNode` 已经入 Canvas 时不得再次 `addNode`。
8. **跨平台优先**：运行时代码不导入 Node `crypto`、`fs` 等模块；文件读取使用 Obsidian Vault API；兼容性 monkey patch 只有在当前 Obsidian 仍验证有效时才保留。
9. **测试必须记录资源**：所有测试、构建和 Obsidian CLI 探针使用 `scripts/measure-command.ps1`，记录墙钟、峰值工作集、进程树 CPU 和采样数到 `tests/resource-usage.md`。
10. **保护已有用户改动**：修改前检查 `git status`；不重置、不覆盖、不删除用户未提交文件，也不把无关改动顺手纳入提交。

## 开发流程

1. 先读本文件，再按任务读取 `agents/` 中的对应文档。
2. 先建立正/负路径测试，再做小范围实现；不要把运行时探针当成单元测试的替代品。
3. 使用资源采样器运行单测和构建；使用 Obsidian CLI reload、`dev:errors`、`eval` 和 DOM 事件做真实运行时验证。
4. 对主窗口与副窗口分别验证目标 Canvas、调用次数、状态清理和异常路径。
5. 完成后运行 `git diff --check`，核对文档、版本、安装产物和 Git 状态，再提交。
6. `main` 是长期自用与发布主线；推送后必须等待 GitHub Actions 的 CI 成功，再打标签和创建 Release。

## 常用命令

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/measure-command.ps1 -Label "whiteboard-tests" -Command "npm test"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/measure-command.ps1 -Label "whiteboard-build" -Command "npm run build"
obsidian plugin:reload id=obsidian-whiteboard-deduction-arc
obsidian dev:errors
obsidian eval code="..."
```

裸跑 `npm test`、`npm run build` 或未采样的 Obsidian CLI 探针，不算完成验证。短 CLI 进程的内存/CPU 可能显示为 0，必须在资源日志中明确标注“可能漏采”。

## 文档路由

| 任务 | 必读文档 |
|---|---|
| 快捷键、多窗口、输入框、弹窗、误触发 | `agents/keyboard-safety.md` |
| Canvas 上下文、事务、链接建议、兼容性 | `agents/architecture.md` |
| 单测、CLI 探针、资源记录、错误归因 | `agents/testing-and-runtime.md` |
| 版本、插件 ID、data.json、热键和发布 | `agents/release-migration.md` |
| 安排下一轮迭代 | `agents/roadmap.md` |
| 文档目录与交接入口 | `agents/README.md` |

## 长期维护要点

- 旧 ID `canvas-block-reference` 仅作为回滚和迁移参考；新开发、CLI 和发布均使用 `obsidian-whiteboard-deduction-arc`。
- 修改快捷键时优先改 `src/canvas-shortcuts.ts` 与设置页，不在 `main.ts` 或功能文件中复制一套按键判断。
- 任何“修复副窗口”的改动都必须重新验证主窗口，因为两者的操作方式必须等效。
- 发现 CLI 错误时按栈帧归因；其他插件的错误不能被描述成白板插件通过，也不能被隐瞒。
- 移动端诊断默认关闭；只有用户主动开始时才保留有界内存记录，停止、重载或卸载必须释放。
