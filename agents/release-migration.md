# 版本、插件 ID 与发布迁移

> 最后更新：2026-08-21

## 当前身份

- 显示名：`Obsidian白板推演-ARC.ver`
- ID：`obsidian-whiteboard-deduction-arc`
- 当前 minor：`0.1.0`
- 旧 ID：`canvas-block-reference`

插件 ID 是 Obsidian 的身份，不是 Canvas 文件格式。改变 ID 时必须同时检查 manifest、发布压缩包目录、Vault 启用列表、命令热键和插件 data。

## ID 迁移原则

1. 先禁用旧 ID，避免旧目录与新目录同时注册键盘监听。
2. 新目录必须使用新 ID，复制 `main.js`、`manifest.json`、`styles.css` 和旧 `data.json`。
3. `data.json` 中已有的 Project Graph 等未知字段必须原样保留；快捷键配置追加在 `shortcuts` 字段。
4. `.obsidian/hotkeys.json` 只替换命令 ID 前缀，保留每个命令的 modifiers/key 数组。
5. 启用新插件并重启/重载后检查版本、设置、窗口注册数和 `dev:errors`。
6. 旧目录默认保留为回滚副本，不在未核实新版本前递归删除；旧嵌套缓存目录也不要顺手清理。

## 发布清单

- `manifest.json` 的 id、name、version、author、authorUrl 与 `versions.json` 一致。
- `package.json`/lockfile 的版本一致；构建成功。
- `.github/workflows/release.yml` 的 `PLUGIN_NAME` 与新 ID 一致。
- zip 内目录名为新 ID，且包含 `main.js`、`manifest.json`、`styles.css`。
- Release 同时提供 zip 和三个单文件资产；下载后可直接安装。
- README 的 BRAT、手动安装、迁移和快捷键说明与当前身份一致。
- 发布后再次检查安装产物哈希、Obsidian 运行态版本和主副窗口负路径。

## 回滚

回滚时先禁用新 ID，再恢复旧 ID 的启用状态和旧目录；不要让两个 ID 同时启用。用户已有 Canvas 数据不需要因插件 ID 回滚而改写。

## 版本边界

修复双监听、上下文、连续缩放和 mutation 事务属于 fix 版本；快捷键设置、文档体系、品牌和 ID 迁移属于 minor 版本。以后若再次改变 ID，必须先写迁移方案并明确旧 data、hotkeys、目录和回滚策略。
