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

测量工具：[`scripts/measure-command.ps1`](../scripts/measure-command.ps1)。峰值工作集是 Windows 进程树内存峰值，不等同于整台机器的总内存占用；短于采样间隔的瞬时峰值可能被漏采。
