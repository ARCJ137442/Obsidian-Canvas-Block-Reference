# 测试、资源与 Obsidian CLI 实测

> 最后更新：2026-08-21

## 资源采样硬规则

所有测试、构建和运行时 CLI 探针都用：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/measure-command.ps1 -Label "meaningful-label" -Command "npm test"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/measure-command.ps1 -Label "meaningful-label" -Command "npm run build"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/measure-command.ps1 -Label "meaningful-label" -Command 'obsidian eval code="..."'
```

每次输出都要把墙钟、峰值工作集、进程树 CPU、采样数和结果写入 `tests/resource-usage.md`。短于采样周期的 CLI 进程常显示 0 B/0 s，必须明确标注“短 CLI 进程，可能漏采”，不能伪造精度。

## 本地验证顺序

1. 通过资源采样器运行 `npm test`：类型编译测试目标并运行 Node test；测试当前集中在 `tests/canvas-context.test.mjs`。
2. 通过资源采样器运行 `npm run build`：先 TypeScript 检查，再生成 `main.js`。
3. 复制构建产物到实际 Vault 插件目录后执行：

   ```text
   obsidian plugin:reload id=obsidian-whiteboard-deduction-arc
   obsidian dev:errors
   ```

4. 用 `obsidian eval` 查询插件版本、窗口注册/清理数量、Canvas leaves，并向主窗口和 popout 的实际 Canvas DOM dispatch KeyboardEvent。
5. 统计 `zoomBy`、`setColor` 或其他 mutation 方法调用次数，确认主副窗口等效且没有双倍调用。

## 正/负路径探针

至少包含以下结果字段：

- 正常 Z：按下到弹起期间应有多个连续 tick；
- Ctrl+S：缩放调用增量为 0；
- 输入框内 Z：增量为 0；
- Canvas 外 DOM 的 Z：增量为 0；
- 主窗口与副窗口：相同操作的调用次数相等；
- reload 多次：每个 Window 只有一套状态、清理器和 listener。

探针只能辅助定位运行时问题，不能替代纯函数回归测试。事件探针必须恢复对 Obsidian 对象的临时 monkey patch，并删除临时 DOM。

## 错误归因

`obsidian dev:errors` 输出必须按栈帧判断归属。若错误只来自 `plugin:advanced-canvas` 或其他插件，记录为外部环境错误；不能说“全局无错误”，也不能将其归咎于本插件。若出现本插件文件或类名栈帧，则必须修复或明确阻塞原因后才能交付。
