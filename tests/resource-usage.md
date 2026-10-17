# 测试与运行资源记录

本文件记录插件开发、质量审核和发布验证期间的有效资源采样。采样器通过 Windows 进程树每 100 ms 汇总工作集与累计 CPU 时间；峰值工作集是进程树在采样期间的最大汇总值，CPU 是采样到的进程树累计 CPU 时间。此前未采样的测试不追补数据。新增测试必须使用 `scripts/measure-command.ps1`，不要补写估算值。

| 时间（UTC） | 命令 | 结果 | 墙钟 | 峰值工作集 | 进程树 CPU | 采样数 |
|---|---|---:|---:|---:|---:|---:|
| 2026-08-21 11:25:51.368Z | `npm test` | 13/13，退出码 0 | 2308.21 ms | 248,274,944 B（236.77 MiB） | 1.953 s | 3 |
| 2026-08-21 11:25:59.753Z | `npm run build` | 成功，退出码 0 | 1783.27 ms | 245,075,968 B（233.72 MiB） | 2.125 s | 3 |
| 2026-08-21 11:26:41.186Z | `npm test` | 13/13，退出码 0 | 2557.12 ms | 315,662,336 B（301.04 MiB） | 4.156 s | 3 |
| 2026-08-21 11:26:48.862Z | `npm run build` | 成功，退出码 0 | 1562.99 ms | 15,548,416 B（14.83 MiB） | 0.062 s | 2 |
| 2026-08-21 11:31:23.095Z | `npm test` | 13/13，退出码 0 | 2299.95 ms | 259,502,080 B（247.48 MiB） | 1.906 s | 2 |
| 2026-08-21 11:31:29.600Z | `npm run build` | 成功，退出码 0 | 1302.40 ms | 24,342,528 B（23.21 MiB） | 0.156 s | 2 |
| 2026-08-21 11:35:21.866Z | Obsidian 运行时主/独立窗口 `Z`→`Shift+Z` 探针 | 两个窗口均拦截成功，退出码 0 | 388.63 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 11:50:38.895Z | `canvas-block-reference-duplicate-guard-continuous-zoom-tests-v2` | 15/15，退出码 0 | 3204.15 ms | 333,000,704 B（317.57 MiB） | 4.781 s | 3 |
| 2026-08-21 11:51:57.458Z | `canvas-block-reference-0.0.9-final-tests` | 15/15，退出码 0 | 3578.40 ms | 332,992,512 B（317.57 MiB） | 5.047 s | 3 |
| 2026-08-21 11:51:57.459Z | `canvas-block-reference-0.0.9-final-build` | 成功，退出码 0 | 2285.92 ms | 6,135,808 B（5.85 MiB） | 0.031 s | 1 |
| 2026-08-21 11:57:23.382Z | `canvas-block-reference-shift-dynamic-zoom-tests-v1` | 16/16，退出码 0 | 2007.39 ms | 243,535,872 B（232.25 MiB） | 1.906 s | 2 |
| 2026-08-21 11:57:33.221Z | `canvas-block-reference-0.0.9-shift-dynamic-zoom-build-v2` | 成功，退出码 0 | 1643.14 ms | 253,509,632 B（241.77 MiB） | 2.250 s | 2 |
| 2026-08-21 11:52:45.542Z | `life-panel-reload-both-plugins-0.0.9-1.0.2` | 成功，两个插件均重载 | 679.60 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 11:52:59.625Z | `life-panel-runtime-canvas-inventory-v1` | 失败，eval 顶层 `return` 非法 | 632.83 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 11:53:06.356Z | `life-panel-runtime-canvas-inventory-v2` | 成功，发现主窗口与独立窗口 Canvas | 847.23 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 11:53:55.185Z | `life-panel-runtime-main-popout-zoom-pan-v1` | 失败，合成事件代码语法错误 | 764.19 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 11:54:37.353Z | `life-panel-runtime-main-popout-zoom-pan-v2` | 诊断成功；独立窗口 Z/D 有效，主窗口合成事件未产生变化 | 4114.11 ms | 22,949,888 B（21.89 MiB） | 0.031 s | 6 |
| 2026-08-21 11:55:00.741Z | `life-panel-runtime-canvas-dom-inspection-v1` | 成功，定位主/独立窗口 Canvas DOM | 655.83 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 11:55:10.362Z | `life-panel-runtime-canvas-dom-children-v1` | 成功，定位 `.canvas-wrapper` | 607.56 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 11:55:42.578Z | `life-panel-runtime-window-context-inspection-v1` | 成功，确认主/独立窗口 Document 不同 | 461.80 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 11:56:00.414Z | `life-panel-runtime-main-zoom-dispatch-diagnostics-v1` | 失败，诊断对象未找到 | 598.39 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 11:56:17.949Z | `life-panel-runtime-main-zoom-dispatch-diagnostics-v2` | 失败，诊断代码含非 ASCII 的 base64 编码问题 | 560.94 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 11:58:17.689Z | `life-panel-runtime-main-popout-shift-zoom-v1` | 诊断成功；独立窗口动态换向有效，主窗口合成事件未产生变化 | 4033.53 ms | 22,822,912 B（21.77 MiB） | 0.047 s | 6 |
| 2026-08-21 12:01:05.779Z | `life-panel-final-reload-and-error-check-v1` | 两个插件重载成功；仅有 ResizeObserver 通知 | 567.61 ms | 15,241,216 B（14.54 MiB） | 0.047 s | 1 |
| 2026-08-21 12:24:08.576Z | `life-panel-whiteboard-plugin-reload-0.0.9-diagnosis-v1` | CLI 重载 `canvas-block-reference` 成功 | 650.38 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `canvas-block-reference-duplicate-listener-fix-tests-v1` | 未进入 Node 测试：新增候选视图类型触发 TypeScript null 类型错误 | 2902.40 ms | 227,250,176 B（216.72 MiB） | 1.656 s | 2 |
| 2026-08-21 | `canvas-block-reference-duplicate-listener-fix-tests-v2` | 18/18，退出码 0 | 2727.65 ms | 220,880,896 B（210.65 MiB） | 4.359 s | 3 |
| 2026-08-21 | `canvas-block-reference-duplicate-listener-fix-build-v1` | 成功，退出码 0 | 1703.47 ms | 60,166,144 B（57.38 MiB） | 0.297 s | 2 |
| 2026-08-21 | `life-panel-deploy-whiteboard-duplicate-listener-fix-wrapper-v0` | 未执行：把安装目录名误写为 `canvas-block-reference`，目标目录不存在 | 427.78 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-deploy-whiteboard-duplicate-listener-fix-v2` | 复制构建产物并 CLI 重载成功 | 821.19 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-duplicate-listener-fix-runtime-call-count-v1` | 主/副窗口均 3 次 `zoomBy`；副窗口由修复前 6 次降为 3 次，连续缩放已等效 | 921.39 ms | 22,953,984 B（21.89 MiB） | 0.078 s | 1 |
| 2026-08-21 | `life-panel-whiteboard-duplicate-listener-fix-reload-cycle-v1` | 连续 3 次重载后仍为 2 个窗口/2 个清理器/2 个状态；主副窗口均 3 次 `zoomBy` | 1285.05 ms | 15,560,704 B（14.84 MiB） | 0.141 s | 2 |
| 2026-08-21 | `life-panel-whiteboard-duplicate-listener-fix-errors-v1` | 清空并重载后 `dev:errors` 无错误 | 650.40 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-duplicate-listener-fix-color-call-count-v1` | 初次 C 探针各报告 2 次，后续确认第 2 次为探针回滚调用，不作为产品失败证据 | 639.02 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-color-single-selection-diagnostics-v1` | 单节点 C 探针各报告 2 次；后续调用栈确认第 2 次为诊断回滚 | 860.05 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-selection-snapshot-tests-v1` | 18/18，退出码 0 | 3181.44 ms | 244,723,712 B（233.39 MiB） | 2.375 s | 2 |
| 2026-08-21 | `canvas-block-reference-selection-snapshot-build-v1` | 成功，退出码 0 | 2326.40 ms | 15,691,776 B（14.96 MiB） | 0.109 s | 2 |
| 2026-08-21 | `life-panel-deploy-whiteboard-selection-snapshot-v1` | 复制构建产物并 CLI 重载成功 | 804.65 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-selection-snapshot-color-call-count-v1` | 探针统计含回滚调用，不能作为最终计数 | 834.71 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-color-double-call-stack-diagnostics-v1` | 调用栈确认插件仅 1 次，另一笔来自探针回滚；捕获监听 stopImmediatePropagation 主窗口 1 次、副窗口 2 次 | 1023.27 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-color-single-call-corrected-v1` | 主/副窗口单节点 C 均仅 1 次插件调用，颜色各只前进一步 | 841.22 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `canvas-block-reference-multi-window-final-tests-v1` | 18/18，退出码 0 | 3174.48 ms | 304,726,016 B（290.61 MiB） | 4.016 s | 3 |
| 2026-08-21 | `canvas-block-reference-multi-window-final-build-v1` | 成功，退出码 0 | 2262.34 ms | 15,704,064 B（14.98 MiB） | 0.141 s | 2 |
| 2026-08-21 | `life-panel-deploy-whiteboard-multi-window-final-v1` | 复制最终构建产物并 CLI 重载成功 | 801.05 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-multi-window-final-positive-negative-probe-v1` | 两窗口均 3 次 Z 调用、1 次 C 调用；状态/注册/清理均为 2 | 846.98 ms | 15,126,528 B（14.43 MiB） | 0.062 s | 1 |
| 2026-08-21 | `life-panel-whiteboard-multi-window-final-errors-v1` | 清空并重载后 `dev:errors` 无错误 | 831.21 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-deploy-whiteboard-0.0.10-final-v1` | 部署 0.0.10 main.js/manifest 并 CLI 重载成功 | 781.25 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-0.0.10-final-state-errors-v1` | 运行态版本 0.0.10；注册/清理/状态均为 2；`dev:errors` 无错误 | 735.23 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `whiteboard-shortcut-settings-build-v1` | 成功，退出码 0 | 5251.51 ms | 257,925,120 B（245.98 MiB） | 5.250 s | 4 |
| 2026-08-21 | `whiteboard-shortcut-settings-tests-v1` | 20/20，退出码 0 | 2839.33 ms | 343,470,080 B（327.56 MiB） | 4.922 s | 3 |
| 2026-08-21 | `whiteboard-0.1.0-migration-build-v1` | 成功，退出码 0 | 2023.23 ms | 257,937,408 B（245.99 MiB） | 2.422 s | 2 |
| 2026-08-21 | `life-panel-disable-legacy-whiteboard-before-id-migration-v1` | CLI 禁用旧 ID 成功 | 807.45 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-enable-whiteboard-0.1.0-new-id-v1` | 失败：当前 Obsidian 进程尚未重新扫描新插件目录 | 355.11 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-list-plugins-after-whiteboard-id-migration-v1` | 新 ID 尚未被当前进程发现，按预期暴露重启前置条件 | 381.27 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-obsidian-cli-help-id-migration-v1` | 成功，确认 CLI 提供 `restart` 命令 | 413.05 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-restart-after-whiteboard-id-migration-v1` | Obsidian 重启命令成功发出 | 897.75 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-list-plugins-after-restart-whiteboard-id-migration-v2` | 新 ID `obsidian-whiteboard-deduction-arc@0.1.0` 被发现，旧 ID仍作为已安装但未启用副本 | 526.36 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-enabled-plugins-whiteboard-id-migration-v1` | 新 ID 已启用，旧 ID未启用 | 382.45 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-0.1.0-id-migration-errors-v1` | 发现 5 条既有 `advanced-canvas` 错误；无本插件栈帧，不能归因于本插件 | 326.20 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-0.1.0-id-migration-state-v1` | 新插件版本 0.1.0；注册/清理/状态均为 2 | 346.90 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-0.1.0-canvas-window-inventory-v1` | 发现主窗口和独立窗口各有 `home.canvas` | 431.99 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-0.1.0-multi-window-positive-negative-probe-v1` | 主/副窗口普通 Z 各 3 次；Ctrl+S 增量 0；输入框 Z 增量 0 | 1011.64 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `whiteboard-context-negative-path-tests-v1` | 失败：回归测试调用了未定义的 `windowB`，产品构建不受影响 | 3135.61 ms | 339,357,696 B（323.64 MiB） | 5.500 s | 3 |
| 2026-08-21 | `whiteboard-context-negative-path-build-v1` | 成功，退出码 0 | 2205.93 ms | 225,832,960 B（215.37 MiB） | 1.844 s | 2 |
| 2026-08-21 | `whiteboard-context-negative-path-tests-v2` | 20/20，退出码 0 | 2716.63 ms | 213,938,176 B（204.03 MiB） | 1.844 s | 3 |
| 2026-08-21 | `whiteboard-0.1.0-negative-context-final-build-v1` | 成功，退出码 0 | 1920.65 ms | 251,400,192 B（239.75 MiB） | 2.250 s | 2 |
| 2026-08-21 | `life-panel-whiteboard-0.1.0-negative-context-final-reload-v1` | 新 ID 插件重载成功 | 598.27 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-0.1.0-multi-window-positive-negative-final-v2` | 主/副窗口普通 Z 各 3 次；Ctrl+S、输入框 Z、白板外 Z 增量均为 0 | 725.17 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-0.1.0-shortcut-settings-write-v1` | 运行态将 Zoom 临时改为 KeyP，写入插件 data.json 成功 | 326.94 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-0.1.0-shortcut-settings-reload-v1` | 重载成功 | 653.65 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-0.1.0-shortcut-settings-persist-v1` | 重载后仍读取 KeyP，配置持久化有效 | 328.07 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-0.1.0-shortcut-settings-restore-default-v1` | 已恢复默认 Zoom=KeyZ | 319.75 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-0.1.0-settings-tab-registration-v1` | 设置页已注册，类名 `CanvasShortcutSettingTab` | 330.35 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `whiteboard-0.1.0-release-candidate-tests-v1` | 20/20，退出码 0 | 2817.23 ms | 330,153,984 B（314.86 MiB） | 5.344 s | 3 |
| 2026-08-21 | `whiteboard-0.1.0-release-candidate-build-v1` | 成功，退出码 0 | 1906.13 ms | 235,094,016 B（224.20 MiB） | 1.781 s | 2 |
| 2026-08-21 | `life-panel-whiteboard-0.1.0-final-plugin-reload-errors-v1` | 新插件重载成功；CLI 错误缓冲仍仅含既有 `advanced-canvas` 5 条栈帧 | 323.25 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-0.1.0-final-installed-runtime-probe-v1` | 安装产物主/副窗口普通 Z 各 3 次；Ctrl+S 与白板外 Z 增量均为 0 | 625.77 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `whiteboard-directional-propagation-build-v1` | 成功，退出码 0 | 2089.27 ms | 256,647,168 B（244.76 MiB） | 3.016 s | 2 |
| 2026-08-21 | `whiteboard-directional-propagation-tests-v1` | 20/20，退出码 0 | 3232.22 ms | 275,820,544 B（263.04 MiB） | 3.438 s | 2 |
| 2026-08-21 | `life-panel-deploy-reload-whiteboard-directional-propagation-v1` | 复制并重载成功 | 363.66 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `whiteboard-directional-propagation-build-v2` | 成功，退出码 0 | 2015.48 ms | 70,651,904 B（67.38 MiB） | 0.562 s | 1 |
| 2026-08-21 | `whiteboard-directional-propagation-tests-v2` | 20/20，退出码 0 | 3263.06 ms | 280,387,584 B（267.40 MiB） | 3.672 s | 2 |
| 2026-08-21 | `life-panel-deploy-reload-whiteboard-pan-directional-fix-v2` | 白板与 Pan 均重载成功 | 795.87 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-native-create-color-probe-v1` | 原生 `createTextNode` 运行态返回 `color:""`，临时节点已移除 | 332.23 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `whiteboard-native-default-color-build-v1` | 成功，退出码 0 | 1974.05 ms | 64,466,944 B（61.48 MiB） | 0.484 s | 1 |
| 2026-08-21 | `whiteboard-native-default-color-tests-v1` | 20/20，退出码 0 | 3083.26 ms | 295,120,896 B（281.45 MiB） | 3.812 s | 2 |
| 2026-08-21 | `life-panel-deploy-reload-whiteboard-native-default-color-v1` | 复制并重载成功 | 331.41 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-native-default-color-errors-v1` | `No errors captured` | 321.97 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `whiteboard-configurable-shortcut-families-build-v1` | 失败：设置页使用了不存在的 `Setting.name` 属性，随后已修复 | 1456.53 ms | 241,565,696 B（230.38 MiB） | 2.078 s | 2 |
| 2026-08-21 | `whiteboard-configurable-shortcut-families-tests-v1` | 22/22，退出码 0 | 2442.65 ms | 267,468,800 B（255.08 MiB） | 2.359 s | 3 |
| 2026-08-21 | `whiteboard-configurable-shortcut-families-build-v2` | 成功，退出码 0 | 1910.95 ms | 240,549,888 B（229.41 MiB） | 2.156 s | 2 |
| 2026-08-21 | `whiteboard-configurable-shortcut-families-tests-v2` | 22/22，退出码 0 | 2330.90 ms | 266,067,968 B（253.74 MiB） | 2.344 s | 2 |
| 2026-08-21 | `life-panel-deploy-reload-whiteboard-configurable-shortcut-families-v1` | 复制构建产物并重载成功 | 601.34 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-configurable-shortcut-families-runtime-settings-v1` | 运行态读取成功；标题级别按键族存在且长度为 10 | 496.27 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-configurable-shortcut-families-errors-v1` | 发现 `plugin:advanced-canvas` 的既有 `resolveLinks` 错误；无本插件栈帧 | 231.19 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-configurable-shortcut-families-settings-dom-v1` | 设置页运行态存在单键区、编辑/取消/标题级别按键族 | 273.73 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-configurable-shortcut-families-settings-dom-v2` | 设置页实际渲染编辑 2 行、取消 2 行、标题级别 10 行 | 226.22 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-configurable-shortcut-families-update-restore-v1` | 运行态临时改绑编辑槽位和标题槽位成功，随后恢复；`restored:true` | 382.98 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `whiteboard-configurable-shortcut-families-build-v3` | 成功，退出码 0 | 1563.22 ms | 48,418,816 B（46.18 MiB） | 0.328 s | 1 |
| 2026-08-21 | `whiteboard-configurable-shortcut-families-tests-v3` | 22/22，退出码 0 | 2478.39 ms | 297,144,320 B（283.38 MiB） | 3.172 s | 2 |
| 2026-08-21 | `life-panel-deploy-reload-whiteboard-configurable-shortcut-families-v2` | 最终构建产物复制并重载成功 | 619.46 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-configurable-shortcut-families-final-runtime-v1` | 最终运行态读取成功；编辑/取消族正常，标题族长度为 10 | 386.99 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-panel-whiteboard-configurable-shortcut-families-final-errors-v1` | 仍只有 `plugin:advanced-canvas` 的既有错误；无本插件栈帧 | 383.04 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `whiteboard-0.2.0-release-build-v1` | 成功，退出码 0 | 1723.00 ms | 70,553,600 B（67.29 MiB） | 0.453 s | 1 |
| 2026-08-21 | `whiteboard-0.2.0-release-tests-v1` | 22/22，退出码 0 | 2545.60 ms | 293,519,360 B（279.92 MiB） | 3.188 s | 2 |
| 2026-08-21 | `life-series-cli-vault-discovery-v1` | 发现目标 Vault `life-series` | 360.25 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-series-cli-help-v1` | 探针分隔符错误，未影响 Vault 或插件状态 | 229.47 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-series-cli-help-v2` | 确认 eval、vault、plugin:reload、dev:errors 参数格式 | 504.55 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-series-cli-eval-target-v1` | CLI eval 成功确认目标 Vault 为 `life-series` | 296.55 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-series-cli-plugin-help-v1` | 确认插件启用/禁用/重载和错误查询命令 | 400.18 ms | 0 B（短 CLI 进程，可能漏采） | 0.078 s | 1 |
| 2026-08-21 | `life-series-disable-old-whiteboard-pan-v1` | 旧白板和旧 Pan 均禁用成功 | 576.54 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-series-enable-reload-both-plugins-v1` | 部分失败：新白板目录尚未进入运行时索引；Pan 启用/重载成功 | 644.88 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-series-plugin-index-after-copy-v1` | CLI 插件索引已发现新白板 ID | 245.80 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-series-enable-reload-whiteboard-after-index-v1` | 新白板启用和重载成功 | 371.67 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-series-final-plugin-state-v1` | 白板 0.2.0、Pan 1.0.7 均启用；快捷键与 Pan 配置读取成功 | 357.47 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-series-clear-errors-before-final-v1` | 清空目标 Vault 既有 2 条错误 | 269.38 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-21 | `life-series-final-reload-errors-v1` | 两插件最终重载成功，`No errors captured` | 635.00 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |

| 2026-08-23 13:32:09.410Z | `npm test` | 46/46，退出码 0 | 2608.93 ms | 346,857,472 B（330.79 MiB） | 3.906 s | 2 |
| 2026-08-23 13:32:16.443Z | `npm run build` | 成功，退出码 0 | 1819.96 ms | 6,148,096 B（5.86 MiB） | 0.047 s | 1 |
| 2026-08-24 03:14:41.096Z | `planning-final-tests` / `npm test` | 51/51，退出码 0 | 2361.72 ms | 291,393,536 B（277.89 MiB） | 2.203 s | 2 |
| 2026-08-24 03:14:43.955Z | `planning-final-build` / `npm run build` | 成功，退出码 0 | 1553.76 ms | 281,944,064 B（268.88 MiB） | 1.938 s | 2 |
| 2026-08-24 03:14:45.978Z | `life-panel-final-cli-errors` / `obsidian vault=life-panel dev:errors` | `No errors captured`，退出码 0；短 CLI 进程，可能漏采 | 235.83 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-24 03:14:46.688Z | `life-series-final-cli-errors` / `obsidian vault=life-series dev:errors` | `No errors captured`，退出码 0；短 CLI 进程，可能漏采 | 228.92 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-24 03:51:16.433Z | `runtime-state-life-panel` / `obsidian vault=life-panel eval` | 运行态窗口/清理器/注册数均为 2，退出码 0；短 CLI 进程，可能漏采 | 392.81 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-24 03:51:17.370Z | `runtime-state-life-series` / `obsidian vault=life-series eval` | 运行态窗口/清理器/注册数均为 2，退出码 0；短 CLI 进程，可能漏采 | 296.29 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-24 04:15:01.007Z | `status-20260824-life-panel-runtime-v1` / `obsidian eval vault=life-panel` | 两插件均 enabled；白板 0.5.1、Pan 1.0.8；退出码 0；短 CLI 进程，可能漏采 | 287.86 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-24 04:15:00.975Z | `status-20260824-life-series-runtime-v1` / `obsidian eval vault=life-series` | CLI 返回的 `app.vault.getName()` 仍为 `life-panel`，不能作为 life-series 运行态证据；退出码 0；短 CLI 进程，可能漏采 | 296.51 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-24 04:15:01.041Z | `status-20260824-life-panel-errors-v1` / `obsidian dev:errors vault=life-panel` | `No errors captured`；退出码 0；短 CLI 进程，可能漏采 | 288.26 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-24 04:15:01.063Z | `status-20260824-life-series-errors-v1` / `obsidian dev:errors vault=life-series` | `No errors captured`；退出码 0；短 CLI 进程，可能漏采 | 323.16 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-24 04:15:37.319Z | `status-20260824-cli-vault-routing-help-v1` / `obsidian help` | 确认 CLI 支持 `vault=<name>`、`eval`、`plugin`、`plugins:enabled`；退出码 0；短 CLI 进程，可能漏采 | 248.51 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-24 04:15:37.357Z | `status-20260824-life-series-plugins-v1` / `obsidian plugins vault=life-series` | 返回已安装插件列表；退出码 0；列表中含白板新 ID 与 Pan；短 CLI 进程，可能漏采 | 243.58 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-24 04:15:37.391Z | `status-20260824-life-panel-plugins-v1` / `obsidian plugins vault=life-panel` | 返回已安装插件列表；退出码 0；列表中含白板新 ID 与 Pan；短 CLI 进程，可能漏采 | 273.44 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-24 04:17:21.054Z | `status-20260824-planning-arc-0.5.1-build-v1` / `npm run build` | 成功，退出码 0 | 1644.31 ms | 277,499,904 B（264.64 MiB） | 2.047 s | 2 |
| 2026-08-24 04:17:23.108Z | `status-20260824-planning-arc-0.5.1-tests-v1` / `npm test` | 51/51，退出码 0 | 2187.10 ms | 270,225,408 B（257.71 MiB） | 2.109 s | 2 |
| 2026-08-24 04:17:25.684Z | `status-20260824-pan-1.0.8-build-v1` / `npm run build` | 成功，退出码 0；短进程采样数 1，峰值可能漏采 | 1075.20 ms | 83,144,704 B（79.29 MiB） | 0.234 s | 1 |
| 2026-08-24 04:17:27.141Z | `status-20260824-pan-1.0.8-tests-v1` / `npm test` | 11/11，退出码 0 | 1876.34 ms | 272,310,272 B（259.70 MiB） | 1.844 s | 2 |
| 2026-08-24 04:19:43.815Z | `status-20260824-cli-vaults-verbose-v1` / `obsidian vaults verbose` | 确认 `life-panel` 与 `life-series` 均被 Obsidian 注册；退出码 0；短 CLI 进程，可能漏采 | 455.77 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-24 04:19:44.690Z | `status-20260824-cli-vault-routing-v2` / `obsidian vault info/eval vault=life-series` | CLI 实际返回 `H:\A137442\Document\Notes\life-panel`；退出码 0；短 CLI 进程，可能漏采 | 192.92 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-24 04:19:45.260Z | `status-20260824-obsidian-version-v1` / `obsidian version` | Obsidian 1.13.7（installer 1.13.7）；退出码 0；短 CLI 进程，可能漏采 | 202.77 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `arc-mobile-ime-body-context-tests-v1` | 56/58；旧极简 Window 测试桩缺少 document，暴露 shell 检测需安全降级，退出码 1 | 2420.51 ms | 286,937,088 B（273.64 MiB） | 2.844 s | 2 |
| 2026-08-26 | `arc-mobile-ime-body-context-tests-v2` | 58/58，退出码 0；覆盖 BODY/HTML 焦点、同窗活动 Canvas、笔记与跨窗负路径、诊断桥三类注册表 | 2791.57 ms | 300,732,416 B（286.80 MiB） | 3.219 s | 2 |
| 2026-08-26 | `arc-mobile-ime-body-context-build-v1` | 成功，退出码 0 | 1563.31 ms | 268,926,976 B（256.47 MiB） | 2.625 s | 2 |
| 2026-08-26 | `arc-mobile-ime-body-reload-v1` | ARC 重载成功；短 CLI 进程，可能漏采 | 440.98 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `pan-mobile-ime-body-reload-v1` | 与 ARC 并发重载时瞬时返回“插件不存在”，后续运行时注册表证实插件已加载；短 CLI 进程，可能漏采 | 495.99 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-plugins-list-v1` | 已安装插件列表包含 Pan 与 ARC；短 CLI 进程，可能漏采 | 361.05 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-vault-info-v1` | CLI 路由确认 life-panel 路径；短 CLI 进程，可能漏采 | 361.05 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `obsidian-cli-plugin-help-v1` | 核对插件 CLI 子命令；短 CLI 进程，可能漏采 | 256.80 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-dev-errors-after-pan-deploy-v1` | 未见 ARC/Pan 错误；仅有既存 Iconic 错误；短 CLI 进程，可能漏采 | 256.59 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-pan-runtime-registry-v1` | 首次 eval 引号错误，未执行运行时表达式；短 CLI 进程，可能漏采 | 503.80 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-plugin-runtime-keys-v2` | 运行时注册表包含 Pan 与 ARC；短 CLI 进程，可能漏采 | 288.58 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `pan-mobile-ime-body-reload-v2` | Pan 顺序重载成功；短 CLI 进程，可能漏采 | 420.73 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-pan-bridge-runtime-smoke-v1` | ARC 报告 `pan-bridge-ready`，Pan 同会话启动并记录 26 条；短 CLI 进程，可能漏采 | 332.40 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-dev-errors-after-mobile-ime-fix-v2` | 未见 ARC/Pan 错误；仅有既存 Iconic 错误；短 CLI 进程，可能漏采 | 318.28 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-active-view-before-body-probe-v1` | 活动标签为 Markdown；为避免打断用户现场，未强制切换 Canvas 做合成事件探针；短 CLI 进程，可能漏采 | 381.13 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `mobile-regression-rollback-arc-tests-v1` | 61/61，退出码 0；覆盖 BODY/HTML 负路径、1024 条诊断容量、动作指纹脱敏和桥接终态 | 2608.55 ms | 292,831,232 B（279.27 MiB） | 2.844 s | 2 |
| 2026-08-26 | `mobile-regression-rollback-arc-build-v1` | 成功，退出码 0 | 1693.11 ms | 258,670,592 B（246.69 MiB） | 2.375 s | 2 |
| 2026-08-26 | `mobile-regression-rollback-pan-tests-v1` | 16/16，退出码 0；覆盖 BODY/HTML 负路径和 1024 条诊断容量 | 2416.83 ms | 322,629,632 B（307.68 MiB） | 3.750 s | 2 |
| 2026-08-26 | `mobile-regression-rollback-pan-build-v1` | 成功，退出码 0；短进程采样数 1，峰值可能漏采 | 1460.07 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-deploy-arc-mobile-regression-rollback-v1` | 构建产物复制成功，退出码 0 | 550.17 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-deploy-pan-mobile-regression-rollback-v1` | 构建产物复制成功，退出码 0 | 550.17 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-reload-arc-mobile-regression-rollback-v1` | ARC 顺序重载成功，退出码 0 | 549.03 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-reload-pan-mobile-regression-rollback-v1` | Pan 顺序重载成功，退出码 0 | 357.71 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-errors-after-mobile-regression-rollback-v1` | `No errors captured`，退出码 0 | 238.58 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-desktop-canvas-api-shape-probe-v1` | 只读确认 Canvas 原型含 `zoomBy/panBy/panTo/setViewport/markViewportChanged/requestFrame`，退出码 0 | 319.73 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-desktop-canvas-viewport-method-probe-v1` | 只读确认 `zoomBy` 与 `panBy` 的真实桌面调用语义，退出码 0 | 293.04 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `pan-mobile-api-telemetry-tests-v1` | 23/23，退出码 0；覆盖有界 API 枚举、32 KiB 硬上限、异常脱敏、全局异常监听清理、100 ms tick 采样与 interval 隔离 | 2273.16 ms | 341,319,680 B（325.51 MiB） | 4.172 s | 2 |
| 2026-08-26 | `pan-mobile-api-telemetry-build-v1` | 成功，退出码 0；短进程采样数 1，峰值可能漏采 | 1868.78 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `arc-mobile-pointer-lease-tests-v1` | 失败，退出码 1；TypeScript 未收窄 `EventTarget \| null`，未进入测试运行 | 2523.84 ms | 318,603,264 B（303.84 MiB） | 3.781 s | 2 |
| 2026-08-26 | `pan-mobile-pointer-lease-tests-v1` | 失败，退出码 1；与 ARC 相同的类型收窄问题，未进入测试运行 | 2161.12 ms | 324,419,584 B（309.39 MiB） | 3.922 s | 2 |
| 2026-08-26 | `arc-mobile-pointer-lease-tests-v2` | 63/63，退出码 0；覆盖同窗 BODY/HTML 租约命中与输入框、Modal、跨窗、Canvas 关闭负路径 | 2928.94 ms | 319,447,040 B（304.65 MiB） | 3.906 s | 2 |
| 2026-08-26 | `pan-mobile-pointer-lease-tests-v2` | 25/25，退出码 0；覆盖 Pan 同窗租约恢复与各失效边界 | 2937.46 ms | 318,169,088 B（303.43 MiB） | 4.031 s | 2 |
| 2026-08-26 | `arc-mobile-pointer-lease-build-v1` | 成功，退出码 0 | 1726.88 ms | 76,722,176 B（73.17 MiB） | 0.359 s | 1 |
| 2026-08-26 | `pan-mobile-pointer-lease-build-v1` | 成功，退出码 0；短进程采样数 1，峰值可能漏采 | 1509.54 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-deploy-arc-pointer-lease-v1` | ARC 构建产物复制成功，退出码 0 | 325.87 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-deploy-pan-pointer-lease-v1` | Pan 构建产物复制成功，退出码 0 | 267.84 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-clear-errors-pointer-lease-v1` | 清空 8 条既有错误，退出码 0 | 261.28 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-reload-pan-pointer-lease-v1` | Pan 顺序重载成功，退出码 0 | 609.42 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-reload-arc-pointer-lease-v1` | ARC 顺序重载成功，退出码 0 | 294.41 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-errors-pointer-lease-v1` | `No errors captured`，退出码 0 | 269.66 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-pointer-lease-runtime-revision-v2` | CLI eval 引号嵌套错误，返回 `canvas is not defined`；未修改插件状态 | 216.44 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-pointer-lease-runtime-revision-v4` | Pan 运行态为 1.0.9，诊断修订号 `mobile-canvas-pointer-lease-v1`，报告 26 条，退出码 0 | 238.01 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 | `life-panel-errors-after-runtime-revision-v1` | `No errors captured`，退出码 0 | 368.50 ms | 0 B（短 CLI 进程，可能漏采） | 0 s（短 CLI 进程，可能漏采） | 1 |
| 2026-08-26 11:06:30.144Z | `npm test` | 63/63，退出码 0；0.5.2 发布验证 | 2974.51 ms | 343,756,800 B（327.83 MiB） | 4.719 s | 2 |
| 2026-08-26 11:06:40.905Z | `npm run build` | 成功，退出码 0；0.5.2 发布验证，短进程采样数 1 | 1780.03 ms | 0 B（短进程可能漏采） | 0 s（短进程可能漏采） | 1 |

测量工具：[`scripts/measure-command.ps1`](../scripts/measure-command.ps1)。峰值工作集是 Windows 进程树内存峰值，不等同于整台机器的总内存占用；短于采样间隔的瞬时峰值可能被漏采。

## 2026-10-16 元白板可读入口与当前标签跳转验证

以下项目均通过 `scripts/measure-command.ps1` 采样。各次均只采到 1 个样本，峰值工作集与 CPU 读数为 0；这些短进程的瞬时资源峰值可能漏采，不能据此视为实际资源消耗为零。

| Label | 结果 | 墙钟 ms |
|---|---|---:|
| `meta-human-context-tests` | 失败：入口标签挑选到了较远任务；调整语义评分 | 1975.87 |
| `meta-human-context-tests-v2` | 失败：地点提示把远处场景合并进标签；收紧邻近范围 | 1654.90 |
| `meta-human-context-tests-v3` | 72/72 通过 | 1677.35 |
| `meta-human-context-build` | 失败：新增预览键盘路径漏传 source leaf | 1633.00 |
| `meta-human-context-build-v2` | 构建成功 | 2056.47 |
| `meta-human-context-tests-final` | 72/72 通过 | 1727.85 |
| `meta-human-context-build-final` | 构建成功，main.js 287.2 kb | 1781.48 |
| `meta-human-context-life-panel-reload` | ARC 重载成功 | 1024.30 |
| `meta-human-context-life-panel-commands` | 确认回溯与元白板命令已注册 | 1103.54 |
| `meta-human-context-life-panel-plugin-status` | ARC 0.5.2 已启用 | 1103.87 |
| `meta-human-context-life-panel-errors` | 观察到既有 Advanced Canvas、Quiet Outline 与 Obsidian host 错误 | 1029.34 |
| `meta-human-context-open-view` | 元白板命令已执行 | 443.73 |
| `meta-human-context-title-dom` | 标题及 27 张白板、30 组关系 | 965.62 |
| `meta-human-context-cards-dom` | 27 张白板卡片 | 954.62 |
| `meta-human-context-edges-dom` | 30 条关系边 | 938.62 |
| `meta-human-context-weight-labels-dom` | 只显示两个重复关系的权重 `2` | 866.46 |
| `meta-human-context-fresh-screenshot` | 截图时原 MetaCanvas 标签未激活；据此补上复用标签时的显式激活 | 446.96 |
| `meta-human-context-life-panel-reload-final` | 最新构建重载成功 | 1056.49 |
| `meta-eval-smoke` | CLI eval 返回 `2` | 416.99 |
| `meta-open-activate-final` | 打开已存在元白板后激活其主工作区标签 | 491.24 |
| `meta-active-view-probe` | 活动视图为 `arc-meta-canvas` | 485.06 |
| `meta-final-active-screenshot` | 最新 UI 截图已检查 | 630.58 |
| `meta-backtrack-open-target` | 打开目标白板 `202608 生活物资整理.canvas` | 604.17 |
| `meta-backtrack-capture-source-leaf` | 源 leaf 为目标 Canvas 标签 | 496.73 |
| `meta-backtrack-source-picker` | 回溯来源选择器打开 | 468.61 |
| `meta-backtrack-source-picker-dom` | 显示三个来源白板名称 | 422.48 |
| `meta-backtrack-select-source-home` | 选择 `home.canvas` | 514.89 |
| `meta-backtrack-entry-picker-dom` | 显示“惠州 集体任务”“家里 · 走前最后一天”，无坐标 | 416.27 |
| `meta-backtrack-select-entry` | 选择人类可读入口 | 607.06 |
| `meta-backtrack-tab-replacement-probe` | 同一 leaf 已切换至 `home.canvas`，选中目标节点 | 474.90 |
| `meta-backtrack-focus-center-probe` | 目标节点中心与 Canvas 视口中心均为 `(7700, -4280)` | 439.85 |
| `meta-open-before-edge-test` | 再次打开并激活元白板 | 466.68 |
| `meta-edge-labels-dom` | 关系边名称可读，默认权重 1 不显示 | 434.00 |
| `meta-edge-open-entry-picker` | 失败：SVGPathElement 无 `.click()`；改用事件分发 | 453.66 |
| `meta-edge-open-entry-picker-v2` | 关系边打开入口选择器成功 | 418.84 |
| `meta-edge-entry-picker-dom` | 显示入口名称与类型，不含坐标 | 422.87 |
| `meta-edge-select-entry` | 选择入口成功 | 643.14 |
| `meta-edge-tab-replacement-probe` | 元白板所在 leaf 被替换为 `home.canvas`，目标节点已选中 | 430.72 |
| `meta-open-board-action-test` | 打开元白板以验证详情中的“打开白板”动作 | 466.68 |
| `meta-open-board-replace-current-leaf` | 详情动作已执行 | 585.75 |
| `meta-open-board-replacement-probe` | 同一 leaf 已切换至 `home.canvas` | 390.73 |
| `meta-final-clear-old-errors` | 清除先前记录的 3 条宿主/第三方错误 | 439.40 |
| `meta-final-open-canvas-view` | 最终回到元白板主工作区标签 | 430.11 |
| `meta-final-errors-after-clean` | `No errors captured` | 382.26 |
| `meta-final-dom-summary` | eval 表达式转义失败，未影响 Obsidian 状态 | 392.07 |
| `meta-final-dom-summary-v2` | 活动视图正确；27 卡片、30 关系、仅两条权重 2、无坐标回退文本 | 441.64 |

运行态安装文件 `main.js`、`manifest.json`、`styles.css` 与 ARC 源码构建文件 SHA-256 一致。未发版、未提交、未推送。

## 2026-10-16 元白板节点样式对齐与空白取消选择

本轮共用 `scripts/measure-command.ps1` 运行以下测试、构建与 Obsidian CLI 探针。各行 `sampleCount=1`，峰值工作集 `0 B`、进程树 CPU `0 s`；这些短进程读数可能漏采，不能解释为零资源消耗。

| Label | 结果 | ms |
|---|---|---:|
| `native-canvas-dom-scan` | 只读枚举 Life Panel 中各 Canvas leaf、节点数与可见节点几何 | 460.88 |
| `native-canvas-node-structure` | 文件节点底层对象的 nodeEl 是未挂载占位；转查实际视图 DOM | 1130.17 |
| `native-canvas-file-node-dom` | 失败：CLI eval 表达式括号错误；未改状态 | 413.55 |
| `native-canvas-node-classes-dom` | 取得 Canvas node class 列表，输出截断 | 396.81 |
| `native-canvas-active-node-types` | 确认 Canvas 数据对象的 file 类型；nodeEl 未挂载 | 452.52 |
| `native-canvas-visible-dom-tree` | 只读 DOM 显示节点容器与内容层级，及独立 label 子节点 | 550.10 |
| `native-canvas-node-dom-attributes` | 只读样式属性与节点类 | 526.16 |
| `native-file-node-label-positions` | 被检查的文件节点不在视口、未虚拟渲染；没有推断其几何 | 453.30 |
| `native-canvas-command-list` | Canvas 命令列表，无单独 fit 命令 | 424.19 |
| `native-canvas-open-reference-new-tab` | 临时打开 `home.canvas` 新标签供 DOM 检查 | 491.68 |
| `native-canvas-fit-reference` | 调用当前 CLI 上下文 Canvas 的 `zoomToFit`；主窗口截图仍在元白板 | 405.15 |
| `native-canvas-file-node-screenshot` | 截图显示元白板主窗口，未将其误报为原生 Canvas | 586.14 |
| `native-canvas-activate-reference-tab` | CLI 上下文切到 `home.canvas`；发现窗口上下文与截图窗口不同 | 413.06 |
| `native-canvas-visible-reference-screenshot` | 主窗口仍显示元白板 | 471.11 |
| `native-canvas-workspace-tabs` | 只读工作区树，发现主窗口与 floating window 均有 Canvas | 429.09 |
| `native-canvas-window-map` | 区分主窗口与浮动窗口的 Canvas leaf | 560.85 |
| `native-canvas-focus-main-window-tab` | 主窗口 leaf 状态切换成功，截图仍由另一窗口上下文提供 | 465.45 |
| `native-canvas-main-file-node-screenshot` | 截图仍为元白板；未用于原生样式判断 | 601.43 |
| `native-canvas-reveal-main-tab` | reveal/setActiveLeaf 调用成功 | 514.52 |
| `native-canvas-after-reveal-screenshot` | 截图仍为元白板；继续以实际 DOM/CSS 规则为依据 | 534.25 |
| `native-canvas-label-position` | 原生 `.canvas-node-label` 为 absolute | 1610.07 |
| `native-canvas-label-transform` | 失败：该 CLI DevTools target 没有对应节点 | 1593.81 |
| `native-canvas-node-container-radius` | 失败：该 CLI DevTools target 没有对应节点 | 1609.07 |
| `native-canvas-node-container-border` | 失败：该 CLI DevTools target 没有对应节点 | 1594.81 |
| `native-canvas-node-label-font` | 未命中独立字号规则，后续 computed style 得到 15px | 1593.81 |
| `native-canvas-label-css` | 原生标签规则：上置 4px、向上平移、缩放跟随 Canvas zoom、单行省略 | 790.58 |
| `native-canvas-label-dom` | 标签 DOM 为独立 `.canvas-node-label` | 882.47 |
| `native-canvas-label-count` | 当前 DOM 有 28 个原生标签 | 880.46 |
| `native-canvas-label-computed-geometry` | 样式：15px、muted 灰、absolute、top -4px；隐藏 leaf 无可用矩形 | 483.06 |
| `native-canvas-container-selector-count` | `.canvas-node-container` 命中 226 个 | 469.31 |
| `native-canvas-container-style` | 原生圆角变量为 `--radius-m` | 573.69 |
| `native-canvas-container-css` | 原生容器：背景、单像素边框、圆角、轻阴影；主题边色弱化 | 1012.38 |
| `meta-native-node-style-build` | 构建成功，main.js 287.2 kb | 2188.25 |
| `meta-native-node-style-reload` | ARC 重载成功 | 437.27 |
| `meta-native-node-style-open-view` | 元白板命令执行成功 | 438.50 |
| `meta-native-node-style-screenshot` | 已检查元白板截图 | 455.65 |
| `meta-native-card-body-border` | CLI 样式探针未找到当前元素 | 866.89 |
| `meta-native-card-label-position` | 元白板标题规则为 absolute | 784.32 |
| `meta-native-card-label-top` | CLI 样式探针未找到当前元素 | 865.89 |
| `meta-native-card-outer-border` | DevTools 当前上下文无外框 border 规则命中 | 863.89 |
| `meta-native-title-dom` | 标题作为独立 DOM 子节点，预览作为内容框 | 677.74 |
| `meta-native-preview-dom` | 预览节点仍保留实际白板结构缩略图；输出截断 | 740.31 |
| `meta-native-card-dom-count` | 27 张元白板卡片 | 562.54 |
| `meta-native-node-style-tests` | 72/72 通过 | 1998.35 |
| `meta-native-node-style-errors` | `No errors captured` | 861.50 |
| `meta-native-node-style-dom-check` | 活动 view 为 `arc-meta-canvas`；标题、卡片、预览各 27 个 | 862.01 |
| `native-canvas-close-inspection-tab` | 关闭本轮临时打开的 Canvas 检查标签 | 487.46 |
| `meta-blank-deselect-tests` | 72/72 通过 | 2227.63 |
| `meta-blank-deselect-build` | 构建成功，main.js 287.5 kb | 2575.52 |
| `meta-blank-deselect-reload` | ARC 重载成功 | 1144.90 |
| `meta-blank-deselect-runtime-probe` | 选择卡片后，空白 pointerdown 立即清选择并隐藏详情；后续 click 幂等 | 393.82 |
| `meta-blank-deselect-errors` | `No errors captured` | 398.33 |

ARC 构建产物已部署到 `life-panel` 插件目录，`main.js`、`manifest.json`、`styles.css` 的源文件与部署文件 SHA-256 一致。未修改原生 Canvas 文件，也未提交或发版。

## 2026-10-16 元白板布局、节点形状与选择高亮

本轮继续通过同一采样器运行测试、构建与 Obsidian CLI 探针。短 CLI 进程的 `0 B / 0 s` 读数可能漏采；探针只改动 ARC 插件配置与视图状态，测试后恢复分层布局、正方形卡片，并保留原有 1 个固定节点。未确认硬重置。

| Label | 结果 | ms | 峰值工作集 | CPU | Samples |
|---|---|---:|---:|---:|---:|
| `meta-layout-force-tests-v3` | 74/74 通过 | 2104.48 | 0 B | 0 s | 1 |
| `meta-layout-force-build-v2` | 构建通过，main.js 309.3 KB | 2132.17 | 0 B | 0 s | 1 |
| `meta-layout-force-predeploy-state` | 失败：CLI eval 字符串转义错误；无状态改动 | 435.04 | 0 B | 0 s | 1 |
| `meta-layout-force-predeploy-state-v2` | 读取成功：版本 0.5.2，元白板视图，1 个固定位置 | 442.01 | 0 B | 0 s | 1 |
| `meta-layout-force-deploy-reload` | ARC 重载成功 | 2552.50 | 23.41 MiB | 0.047 s | 2 |
| `meta-layout-force-runtime-initial` | 27 卡片、30 连边、默认分层/正方形、1 固定位置 | 1313.94 | 0 B | 0 s | 1 |
| `meta-layout-force-runtime-modes` | 力导向无卡片重叠；固定位置与软重置保持；形状设置后恢复默认 | 1286.43 | 0 B | 0 s | 1 |
| `meta-hover-click-highlight-probe` | 初探读到先前选中状态；后续独立清状态复测 | 542.94 | 0 B | 0 s | 1 |
| `meta-hover-click-highlight-probe-v2` | hover/click 类与未选对象透明度探针通过 | 642.63 | 0 B | 0 s | 1 |
| `meta-hover-click-css-cascade` | 检查插件样式规则与卡片状态级联 | 450.99 | 0 B | 0 s | 1 |
| `meta-accent-token-check` | 检查当前主题强调色变量解析 | 537.21 | 0 B | 0 s | 1 |
| `meta-layout-force-tests-v4` | 74/74 通过 | 2535.83 | 0 B | 0 s | 1 |
| `meta-layout-force-build-v3` | 构建通过，main.js 309.3 KB | 2534.83 | 0 B | 0 s | 1 |
| `meta-hover-click-highlight-reload` | ARC 重载成功 | 1112.05 | 0 B | 0 s | 1 |
| `meta-settings-tab-inspection` | 确认设置对象与设置页容器可访问 | 429.48 | 0 B | 0 s | 1 |
| `meta-settings-tab-registration` | ARC 设置页已注册 | 569.37 | 0 B | 0 s | 1 |
| `meta-hover-click-and-settings-dom` | 设置项与下拉选项存在；局部高亮无全图变暗类 | 423.88 | 0 B | 0 s | 1 |
| `meta-glow-token-support` | 检查强调色、阴影与 filter 的计算样式 | 679.01 | 0 B | 0 s | 1 |
| `meta-hover-click-highlight-settled` | 悬浮/点击轮廓、连边宽度/不透明度及无暗化状态可区分 | 4244.77 | 23.46 MiB | 0.047 s | 4 |
| `meta-layout-force-final-build` | 构建通过，main.js 309.3 KB | 1974.49 | 0 B | 0 s | 1 |
| `meta-layout-force-final-reload` | ARC 重载成功 | 1055.69 | 0 B | 0 s | 1 |
| `meta-layout-force-final-errors` | `No errors captured` | 625.22 | 0 B | 0 s | 1 |
| `meta-layout-force-final-state` | 默认分层/正方形、1 固定位置、27 卡片与 30 连边 | 672.71 | 0 B | 0 s | 1 |
| `meta-layout-force-final-highlight` | hover 1px、点击 3px；边 hover 2.4px、点击 3.1px；未选对象 opacity 1 | 4174.77 | 23.45 MiB | 0.047 s | 4 |
| `meta-layout-force-final-glow-build` | 构建通过，main.js 309.3 KB | 1910.60 | 0 B | 0 s | 1 |
| `meta-layout-force-final-glow-reload` | ARC 重载成功 | 2089.86 | 889.58 MiB | 10.797 s | 1 |
| `meta-layout-force-final-glow-probe` | 动画进行中的计算样式采样；点击卡片轮廓已到 3px，未选对象不变暗 | 4126.87 | 23.46 MiB | 0.047 s | 4 |
| `meta-layout-force-final-glow-errors` | `No errors captured` | 532.47 | 0 B | 0 s | 1 |
| `meta-hover-click-static-targets` | 关闭过渡后核对目标值：卡片 hover 8px glow / click 16px；连边 hover 2.4px / click 3.1px | 1029.15 | 0 B | 0 s | 1 |

最终源码 `main.js`、`manifest.json`、`styles.css` 已部署至 `life-panel`，三者 SHA-256 与构建源文件一致。未改动用户白板文件，未提交、推送或发版。状态探针在布局切换测试后确认已回到分层布局、正方形，并保留 1 个原固定节点。

## 2026-10-16 `0.6.0-beta.0` 预发布门禁

| Label | 结果 | ms | 峰值工作集 | CPU | Samples |
|---|---|---:|---:|---:|---:|
| `prerelease-0.6.0-beta.0-npm-ci` | 锁定依赖安装成功；npm 提示旧版依赖弃用及 esbuild install script allowlist 警告，后续构建仍通过 | 4431.06 | 150.34 MiB | 5.828 s | 3 |
| `prerelease-0.6.0-beta.0-tests` | 74/74 通过 | 2218.12 | 0 B | 0 s | 1 |
| `prerelease-0.6.0-beta.0-build` | 构建通过，main.js 309.3 KB | 2571.30 | 0 B | 0 s | 1 |
| `prerelease-0.6.0-beta.0-obsidian-reload` | Life Panel 中 ARC 重载成功 | 1151.59 | 0 B | 0 s | 1 |
| `prerelease-0.6.0-beta.0-runtime-version` | 运行版本 0.6.0-beta.0；元白板 27 卡片、默认分层/正方形、1 固定位置 | 603.15 | 0 B | 0 s | 1 |
| `prerelease-0.6.0-beta.0-runtime-errors` | `No errors captured` | 683.23 | 0 B | 0 s | 1 |

短测试与构建读数可能漏采；上述 CLI 进程也可能漏采资源。

- `main` 提交 `80ba1fcaac607f275ee1d00711aed66403754a7a` 的 CI run `38899741543`：测试与构建通过。
- `v0.6.0-beta.0` Release run `38899965300`：标签检出、`npm ci`、测试、构建、zip 打包和上传均通过。
- GitHub Release 已标记为 prerelease，包含版本 zip、`main.js`、`manifest.json` 与 `styles.css`。

## 2026-10-17 前进/回溯导航与元白板收尾验证

以下命令均通过 `scripts/measure-command.ps1` 采样；短 CLI 进程的资源峰值可能漏采。`life-panel` 运行态中已有的第三方错误按栈帧归因，不计入 ARC 插件错误。

| Label | 结果 | 墙钟 ms | 峰值工作集 | CPU | Samples |
|---|---|---:|---:|---:|---:|
| `reference-navigation-final-tests` | 75/75 通过 | 1653.08 | 225.02 MiB | 1.547 s | 2 |
| `reference-navigation-final-build` | 构建通过，`main.js` 319.8 KB | 2098.97 | 235.64 MiB | 1.797 s | 2 |
| `life-panel-reference-navigation-reload` | 插件重载成功 | 507.90 | 4.77 MiB | 0 s | 1 |
| `life-panel-reference-navigation-runtime-state` | 运行版本 `0.6.0-beta.0`；快捷键含 `backtrackReference`/`forwardReference` | 339.62 | 0 B（短 CLI，可能漏采） | 0 s | 1 |
| `life-panel-reference-navigation-plugin-dom` | 元白板运行态 27 卡片、30 连边 | 595.10 | 0 B（短 CLI，可能漏采） | 0 s | 1 |
| `reference-navigation-postfix-tests` | 75/75 通过 | 1991.70 | 244.25 MiB | 2.203 s | 2 |
| `reference-navigation-postfix-build` | 构建通过，`main.js` 319.8 KB | 1960.73 | 244.21 MiB | 2.109 s | 2 |
| `life-panel-reference-navigation-aria-final-dom` | 重建元白板后标题“全局引用”、ARIA“全局引用”；27 卡片、30 连边 | 367.97 | 0 B（短 CLI，可能漏采） | 0 s | 1 |
| `reference-navigation-picker-action-tests` | 75/75 通过 | 1735.86 | 225.48 MiB | 1.562 s | 2 |
| `reference-navigation-picker-action-build` | 构建通过，`main.js` 320.1 KB | 1704.31 | 214.28 MiB | 1.500 s | 2 |
| `life-panel-reference-navigation-alt-down-e2e-final` | 真实前进选择器显示 `Alt+↓`；目标选择后活动白板切换为“项目：灵眸” | 2924.38 | 23.59 MiB | 0.047 s | 6 |
| `life-panel-picker-lifecycle-build` | 构建通过，`main.js` 320.2 KB | 2120.82 | 5.39 MiB | 0.078 s | 1 |
| `life-panel-clean-runtime-errors` | 重启后 `No errors captured` | 575.03 | 0 B（短 CLI，可能漏采） | 0 s | 1 |
| `life-panel-clean-meta-canvas-e2e` | 干净运行态标题“全局引用”、27 卡片、30 连边、ARIA 正确 | 2295.02 | 23.57 MiB | 0.047 s | 2 |
| `life-panel-clean-forward-command-picker-dom` | `home.canvas` 活动；前进选择器 14 项，提示“Alt+↓直接选第一项” | 468.46 | 0 B（短 CLI，可能漏采） | 0 s | 1 |
| `life-panel-clean-forward-picker-click` | 点击第一项后切换至“项目：灵眸”，源/独立窗口 Modal 均为 0 | 4200.57 | 23.63 MiB | 0.062 s | 2 |
| `life-panel-forward-reciprocal-e2e` | 软件迭代白板 → 阿里云白板；目标自动选中回指源白板节点 `d279001afd491094` | 3096.26 | 23.58 MiB | 0.047 s | 2 |
| `life-panel-reciprocal-forward-errors` | `No errors captured` | 667.45 | 0 B（短 CLI，可能漏采） | 0 s | 1 |
| `reference-navigation-final-build-after-resource-log` | 最终构建通过，`main.js` 320.2 KB | 2555.96 | 0 B（短进程，可能漏采） | 0.078 s | 1 |
| `life-panel-final-deploy-reload` | 最终构建产物复制并重载成功 | 2281.85 | 0 B（短 CLI，可能漏采） | 0 s | 1 |
| `life-panel-final-deploy-errors` | 重载后 `No errors captured` | 1208.58 | 0 B（短 CLI，可能漏采） | 0 s | 1 |
| `life-panel-alt-down-cdp-dispatch` | Obsidian CDP 真实 `Input.dispatchKeyEvent` Alt+↓ 返回成功 | 1897.10 | 0 B（短 CLI，可能漏采） | 0 s | 1 |
| `life-panel-alt-down-cdp-result` | 真实 Alt+↓ 后活动白板切换到“项目：灵眸”，两窗口 Modal 均为 0 | 1864.16 | 0 B（短 CLI，可能漏采） | 0 s | 1 |
| `life-panel-alt-down-cdp-final-errors` | 真实 Alt+↓ 后 `No errors captured` | 1720.39 | 0 B（短 CLI，可能漏采） | 0 s | 1 |
| `life-panel-alt-up-cdp-dispatch` | Obsidian CDP `Input.dispatchKeyEvent` Alt+↑ 返回成功；该次 CDP 事件未直接完成 Modal 选择 | 1514.73 | 0 B（短 CLI，可能漏采） | 0 s | 1 |
| `life-panel-alt-up-keymap-direct-route` | 通过 Obsidian `app.keymap.onKeyEvent` 实际路由 Alt+↑，事件被消费 | 1786.33 | 0 B（短 CLI，可能漏采） | 0 s | 1 |
| `life-panel-alt-up-selection-result` | keymap 实际路由后回到 `home.canvas`，选中回指“项目：灵眸”的节点 `7e9e30ca443be634` | 2959.59 | 0 B（短 CLI，可能漏采） | 0 s | 1 |
| `life-panel-alt-up-final-errors` | Alt+↑ keymap 路由后 `No errors captured` | 1937.47 | 0 B（短 CLI，可能漏采） | 0 s | 1 |
| `life-panel-final-plugin-status` | ARC `0.6.0-beta.0`，enabled=true | 1596.43 | 0 B（短 CLI，可能漏采） | 0 s | 1 |
| `life-panel-final-factual-cli-status` | ARC `0.6.0-beta.0`，enabled=true | 3626.50 | 0 B（短 CLI，可能漏采） | 0 s | 1 |
| `life-panel-final-factual-cli-commands` | 前进、回溯、元白板命令均注册 | 1522.19 | 0 B（短 CLI，可能漏采） | 0 s | 1 |
| `life-panel-final-factual-cli-errors` | `No errors captured` | 1238.84 | 0 B（短 CLI，可能漏采） | 0 s | 1 |
| `life-panel-evidence-alt-down-keymap-route` | 前进选择器真实存在（14 项、首项“项目：灵眸”）；Obsidian keymap 路由 Alt+↓，`keyEventConsumed=true` | 1749.32 | 0 B（短 CLI，可能漏采） | 0 s | 1 |
| `life-panel-evidence-alt-down-final-state` | 活动白板切换至“项目：灵眸”，两个窗口 Modal 均为 0 | 3177.94 | 17.20 MiB | 0.047 s | 1 |
| `life-panel-evidence-alt-up-keymap-route` | 回溯选择器真实存在（2 个来源）；Obsidian keymap 路由 Alt+↑，`keyEventConsumed=true` | 2147.45 | 0 B（短 CLI，可能漏采） | 0 s | 1 |
| `life-panel-evidence-alt-up-final-state` | 活动白板回到 `home.canvas`，选中回指节点 `7e9e30ca443be634`，两个窗口 Modal 均为 0 | 4139.00 | 4.80 MiB | 0.016 s | 1 |
| `life-panel-evidence-final-errors` | 仅有既有 Obsidian host `ResizeObserver` warning，无 ARC 栈帧 | 1897.92 | 0 B（短 CLI，可能漏采） | 0 s | 1 |

最终 `main.js` 已复制到 `life-panel`，与源码构建产物 SHA-256 一致；未修改用户白板内容，未提交、推送或发版。


## 2026-10-18 Claude Code 接管复核、0.6.1 前进与最近跳转

从 Claude Code 会话 `a72f4075-0e32-42c1-ac75-4b55caf3c72c` 逆推交接；源码仍以 `3ee2c24` 为提交基线，继承原有未提交工作。独立验证后补齐文本/多选前进范围、来源与入口独立的最近记录、可配置选择器按键，以及隐藏窗口的有界聚焦。版本文件与 Life Panel 安装版本为 `0.6.1`，本轮未提交、推送或发版。

所有下表命令均使用 `scripts/measure-command.ps1`。`0 MiB / 0 s` 与单次短采样可能漏采，不能解释为零资源。失败探针、错误预期与后续有效证据一并保留。

| Label | 结果 | ms | 峰值工作集 | CPU | Samples |
|---|---|---:|---:|---:|---:|
| `handoff-0.6.1-independent-tests` | 接管基线 75/75 通过 | 3692.75 | 0 MiB | 0 s | 1 |
| `handoff-0.6.1-independent-build` | TypeScript/生产构建通过 | 3559.09 | 0 MiB | 0 s | 1 |
| `reference-recency-build-check` | TypeScript 检查失败，已修正后重跑 | 1407.66 | 75.32 MiB | 0.25 s | 1 |
| `reference-recency-tests-v1` | 第一轮排序 77/77 通过 | 2081.08 | 0 MiB | 0 s | 1 |
| `reference-recency-build-v1` | TypeScript/生产构建通过 | 2056.15 | 5.36 MiB | 0.047 s | 1 |
| `navigation-recency-final-tests` | 排序与选择范围 79/79 通过 | 2412.65 | 0 MiB | 0 s | 1 |
| `navigation-recency-final-build` | TypeScript 检查失败，已修正后重跑 | 2412.65 | 0 MiB | 0 s | 1 |
| `navigation-recency-build-v2` | TypeScript/生产构建通过 | 1941.65 | 17.82 MiB | 0.078 s | 1 |
| `navigation-recency-cli-reload` | Life Panel 中 ARC 重载成功 | 1166.83 | 0 MiB | 0 s | 1 |
| `navigation-recency-bounded-focus-tests` | TypeScript 检查失败，已修正后重跑 | 2364.22 | 0 MiB | 0 s | 1 |
| `navigation-recency-bounded-focus-build` | TypeScript 检查失败，已修正后重跑 | 2281.97 | 0 MiB | 0 s | 1 |
| `navigation-recency-bounded-focus-tests-v2` | 有界聚焦修复后 81/81 通过 | 2686.25 | 0 MiB | 0 s | 1 |
| `navigation-recency-bounded-focus-build-v2` | TypeScript/生产构建通过 | 2611.25 | 0 MiB | 0 s | 1 |
| `navigation-recency-bounded-focus-reload` | Life Panel 中 ARC 重载成功 | 522.26 | 0 MiB | 0 s | 1 |
| `navigation-recency-persistence-reload` | Life Panel 中 ARC 重载成功 | 399.55 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-tests` | 82/82 通过 | 2341.93 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-build` | TypeScript/生产构建通过 | 2266.91 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-reload` | Life Panel 中 ARC 重载成功 | 371.36 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-final-tests` | 82/82 通过 | 2247.07 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-final-build` | TypeScript/生产构建通过 | 2247.07 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-final-reload` | Life Panel 中 ARC 重载成功 | 911.97 | 4.77 MiB | 0 s | 1 |
| `navigation-0.6.1-frame-contract-tests` | 82/82 通过 | 2128.13 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-frame-contract-build` | TypeScript/生产构建通过 | 2054.52 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-frame-contract-reload` | Life Panel 中 ARC 重载成功 | 498.89 | 0 MiB | 0 s | 1 |
| `navigation-recency-runtime-snapshot` | 版本 0.6.1；主/副窗口无初始 Modal；历史为空 | 379.73 | 0 MiB | 0 s | 1 |
| `navigation-recency-main-setup` | 建立主窗口临时标签；home 225 节点、14 个文件节点目标 | 1294.92 | 0 MiB | 0 s | 1 |
| `navigation-recency-forward-open` | 前进选择器 14 候选，保持无历史时原有顺序 | 398.20 | 0 MiB | 0 s | 1 |
| `navigation-recency-choose-nonfirst-target` | 实际选择原第 3 项；同一 leaf 打开目标并记录时间 | 1057.22 | 4.8 MiB | 0 s | 1 |
| `navigation-recency-forward-order-after-visit` | 探针错误：原生选择器没有 close 按钮；后改用 Esc | 451.63 | 0 MiB | 0 s | 1 |
| `navigation-recency-forward-order-and-cancel` | 刚访问目标置顶；Esc 取消不改变历史 | 366.78 | 0 MiB | 0 s | 1 |
| `navigation-recency-coverage-scan` | 发现多来源/重复入口、真实文本内链和嵌入笔记样本 | 436.15 | 0 MiB | 0 s | 1 |
| `navigation-recency-second-visit` | 第二次真实访问记录更新，Modal 清零 | 1131.58 | 0 MiB | 0 s | 1 |
| `navigation-recency-descending-order` | 最近目标第一、较早目标第二，其余保持原序 | 499.87 | 0 MiB | 0 s | 1 |
| `navigation-recency-source-selection` | 发现问题：选中节点但旧聚焦等待未结束，未写历史 | 1811.40 | 23.46 MiB | 0.047 s | 2 |
| `navigation-recency-entry-selection` | 复现同一聚焦等待问题，不能视为排序通过 | 1914.88 | 23.48 MiB | 0.047 s | 2 |
| `navigation-recency-source-entry-reordered` | 失败：旧聚焦未完成导致来源/入口未置顶，后已修复 | 3454.18 | 23.45 MiB | 0.062 s | 4 |
| `navigation-recency-history-diagnosis` | 确认只存在前进记录；定位成功回调未完成 | 373.30 | 0 MiB | 0 s | 1 |
| `navigation-recency-discard-stalled-probe` | 关闭旧测试标签，隔离已卸载测试实例的延迟记录 | 571.74 | 0 MiB | 0 s | 1 |
| `navigation-recency-new-main-test-tab` | 修复构建加载成功，建立新临时主窗口标签 | 1254.30 | 0 MiB | 0 s | 1 |
| `navigation-recency-source-success-v2` | 来源跳转成功后写入具体节点时间，Modal 清零 | 3525.21 | 23.4 MiB | 0.047 s | 4 |
| `navigation-recency-entry-success-and-order-v2` | 最近来源与同板入口均置顶；取消不写历史 | 5209.81 | 23.48 MiB | 0.047 s | 6 |
| `navigation-recency-selected-text-and-note` | 真实文本节点、嵌入 Markdown 笔记均前进到正确目标 | 530.04 | 0 MiB | 0 s | 1 |
| `navigation-recency-multiselection-scope` | 两选中节点只给出两个相关目标 | 836.98 | 0 MiB | 0 s | 1 |
| `navigation-recency-persisted-evidence` | 8 条内存记录与插件 data.json 读取结果一致 | 499.18 | 0 MiB | 0 s | 1 |
| `navigation-recency-reload-and-alt-down` | 历史重载一致；探针预期沿用旧目标，实际最新目标已变，后修正断言 | 6163.98 | 23.41 MiB | 0.047 s | 6 |
| `navigation-recency-post-probe-state` | 确认前一探针进程已退出，读取实际导航及历史状态 | 428.59 | 0 MiB | 0 s | 1 |
| `navigation-recency-keyboard-forward-confirmed` | Alt+↓ 选择最新目标，同一 leaf 导航，Modal 清零 | 966.95 | 0 MiB | 0 s | 1 |
| `navigation-recency-keyboard-back-confirmed` | 键盘两阶段返回正确节点；发现隐藏窗口视口仍未提交 | 5609.08 | 23.48 MiB | 0.062 s | 6 |
| `navigation-focus-runtime-contract` | 核实原生 panTo/setViewport/requestFrame；主窗口 document.hidden=true | 459.61 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-main-keyboard-loop` | 主窗口实际往返、最近项与入口正确；节点/视口中心误差 0 | 939.59 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-popout-setup` | 在已有独立窗口创建临时标签 | 915.44 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-popout-keyboard-loop` | 独立窗口往返；导航调用恰好 2 次；主窗口不变；中心误差 0 | 896.07 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-negative-contexts` | 插件动作调用为 0；宿主也可能消费事件，defaultPrevented 不作为动作判据 | 320.73 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-custom-shortcut-and-failure` | Alt+J 提示/选择有效、旧键不跳；失败不记历史；配置已恢复 | 895.95 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-meta-ui-and-lifecycle` | 全局引用 27 卡/30 边、横移/动画取消通过；候选即时读取过早，后补等待重测 | 822.30 | 0 MiB | 0 s | 1 |
| `navigation-meta-modal-window-diagnosis` | 主副窗口均无残留 Modal；候选读取需等待原生异步绘制 | 324.56 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-meta-picker-confirmed` | 元白板来源/入口最近项正确，Modal 属于本窗口并关闭 | 393.87 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-stale-query-guards` | 前进/回溯查询过期不弹窗、不改历史 | 895.03 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-guard-actions-confirmed` | 输入/外部 DOM/修饰键/重复/组合输入无导航，无状态变化 | 294.07 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-final-runtime-and-cleanup` | 版本/命令有效；历史、快捷键恢复；测试标签关闭；每窗口一组键监听 | 587.73 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-final-focus-persistence-smoke` | 最终构建：正确节点、中心误差 0、历史成功落盘，测试状态已恢复 | 743.79 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-final-errors` | 无 ARC 栈帧；宿主 ResizeObserver 与 Quiet Outline 两条异常 | 334.94 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-owner-tests` | 83/83 通过，包含 leaf 关闭时取消聚焦的回归 | 2241.65 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-owner-build` | TypeScript/生产构建通过 | 2201.65 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-owner-reload` | Life Panel 重载成功 | 702.30 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-owner-final-smoke` | 最终版本正确聚焦、居中、落盘；关闭 leaf 的过期查询被忽略，测试状态恢复 | 711.70 | 0 MiB | 0 s | 1 |
| `navigation-0.6.1-owner-final-errors` | 无 ARC 错误；仍为宿主与 Quiet Outline 的既有错误 | 298.41 | 0 MiB | 0 s | 1 |

`navigation-recency-alt-up-two-stage-loop` 的首次观察超过工具返回窗口，探针包装器当时未保留统一 exec handle，未取得该次 sampler 的最终数值。之后通过进程清单确认它已退出，并使用 `navigation-recency-keyboard-back-confirmed`、`navigation-0.6.1-main-keyboard-loop`、`navigation-0.6.1-popout-keyboard-loop` 重测；缺失数值不补造。包装器已改为继续等待同一 session handle。

验收结论：

- 前进目标、回溯来源、同板入口按最近成功时间置顶；取消与失败不写入，插件重载后读取与已保存记录一致。
- 主窗口和独立窗口均完成 Alt+↓ / Alt+↑ 往返，替换原标签，正确节点与视口中心误差为 0；各窗口没有重复调用或残留 Modal。
- 文本节点、嵌入笔记、多选限定范围、Alt+J 改绑、输入上下文和过期查询均有实际动作/状态证据。
- 元白板保持“全局引用”、27 卡片、30 关系；单击边只选中，双击进入入口选择，最近记录可复用，横向滚动与缩放动画清理有效。
- 原生 Canvas 的 `requestFrame` 参数是时间戳而非回调；适配已改为无参请求渲染，用目标 Window 帧与 50ms 计时器竞速，避免旧 API 假设破坏视口动画。
- 最终 83/83 测试与构建通过；`main.js`、`manifest.json`、`styles.css` 源/部署哈希一致。CLI 试验前后 27 张用户 Canvas 文件 SHA-256 全部相同。
- 已恢复测试前导航历史、快捷键与活动页面，移除测试标签/DOM/运行态补丁；未启用移动仿真或 Android 模拟器。
- 最终 `dev:errors` 存在宿主 `ResizeObserver` 警告，以及 `plugin:obsidian-quiet-outline` 的 `getHeaders` 两条异常；没有 ARC 栈帧，不将其报告为全局无错误。
