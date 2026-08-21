# Agent 文档索引

这些文档记录能被后续 Agent 复用的规则、架构和验证方法，不记录一次性聊天流水账。根目录 [`AGENTS.md`](../AGENTS.md) 是强制入口。

## 按任务阅读

| 任务 | 文档 | 重点 |
|---|---|---|
| 改白板按键或排查误触发 | [`keyboard-safety.md`](keyboard-safety.md) | 正常路径/负路径、窗口隔离、修饰键、编辑态和连续按键 |
| 改 Canvas 数据或链接能力 | [`architecture.md`](architecture.md) | 事件上下文、mutation transaction、跨平台读取和 monkey patch 边界 |
| 写测试或做 CLI 实测 | [`testing-and-runtime.md`](testing-and-runtime.md) | 资源采样、测试矩阵、探针、错误归因和验收证据 |
| 改版本、插件 ID 或发布包 | [`release-migration.md`](release-migration.md) | data.json、热键迁移、旧目录回滚和 Release 资产 |

## 代码入口速查

| 文件 | 职责 |
|---|---|
| `src/main.ts` | 插件生命周期、每窗口监听、清理和设置持久化 |
| `src/canvas-context.ts` | 从事件 DOM 解析 Canvas 与负上下文保护 |
| `src/canvas-shortcuts.ts` | 快捷键定义、按键族配置规范化、冲突检测和方向/标题级别解析 |
| `src/canvas-keydown-features.ts` | 白板按键行为；只消费已解析的 shortcut ID |
| `src/canvas-mutations.ts` | Canvas 修改后的统一刷新/保存边界 |
| `src/canvas-link-suggest.ts` | 打开 Canvas 的内存内容与 Vault API 读取 |
| `src/uuid.ts` | 跨平台 Canvas 元素 ID 生成 |
| `tests/canvas-context.test.mjs` | 编译后的纯函数回归测试入口 |
| `tests/resource-usage.md` | 测试与运行资源证据 |
