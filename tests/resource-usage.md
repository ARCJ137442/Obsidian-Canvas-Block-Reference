# 测试资源记录

本文件记录第二个 fix 版本开发期间的有效测试采样。采样器通过 Windows 进程树每 100 ms 汇总工作集与累计 CPU 时间；峰值工作集是进程树在采样期间的最大汇总值，CPU 是采样到的进程树累计 CPU 时间。此前未采样的测试不追补数据。

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

测量工具：[`scripts/measure-command.ps1`](../scripts/measure-command.ps1)。峰值工作集是 Windows 进程树内存峰值，不等同于整台机器的总内存占用；短于采样间隔的瞬时峰值可能被漏采。
