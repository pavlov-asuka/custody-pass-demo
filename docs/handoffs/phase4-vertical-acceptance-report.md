# 阶段 4｜纵向闭环验收报告

## 1. 起始与结束提交

| 项 | 值 |
|---|---|
| 仓库路径 | `D:\coding\Project\CCBAGENT-CODEX\Repository` |
| 分支 | `codex/learning-map-rebuild` |
| 起始 HEAD | `3a08efd6c061200872de56ea4543232ff4306a64` |
| 结束 HEAD | `fd3f60a1e87a51097a7468e22e254d4ac39941fe` |
| 跟踪远端 | `origin/learning-map-rebuild`（`https://github.com/pavlov-asuka/custody-pass-demo.git`） |

## 2. 实际阅读的事实源

按开工要求顺序阅读并以仓库实际文件为准：

1. `README.md`
2. `docs/handoffs/kimi-k3-backend-phase2.md`
3. `docs/handoffs/phase3-frontend-brief.md`
4. `docs/handoffs/phase3b-frontend-visual-brief.md`
5. `frontend/DESIGN.md`
6. `frontend/PHASE3B-REPORT.md`
7. `frontend/screenshots/phase3b-final/ACCEPTANCE.md`
8. `contracts/openapi.yaml`
9. `contracts/schemas/*`、`contracts/examples/*`
10. `content/releases/ACCOUNTING_2026.07.1.json`、`content/maps/custody-learning-map.json`、`content/routes/accounting/ACC-LIFE-ROLE-001.json`、`content/rubrics/accounting/ACC-LIFE-ROLE-001.json`（仅用于理解正式范围；未修改）
11. `tests/e2e/verify.mjs`（阶段 1 旧前端脚本，非阶段 4 验收主体）
12. `scripts/verify-all.ps1`、`scripts/run-api-smoke.ps1`、`scripts/run-mock.ps1`、`scripts/build-app.ps1`、`scripts/common.ps1`
13. `backend/` 登录、路线进度、正式作答、异步评分、补学、重试、记录与解锁相关实现与 `LearningFlowApplicationTests`

## 3. 完整纵向闭环步骤与逐步断言

### 3.1 HTTP 同源 JAR 纵向 smoke（`scripts/run-phase4-vertical-smoke.ps1`）

隔离端口 `18081`，独立 H2：`.local/data/phase4-vertical-*`。账号 `10000002`。

| 步骤 | 断言结果 |
|---|---|
| 未登录访问 `/api/worlds` | 401 |
| CSRF + 登录 + `/api/auth/me` | 会话恢复正常 |
| 三世界 | 3 个；ACCOUNTING=OPEN；CLEARING/SUPERVISION=BUILDING |
| 顺序门禁 | 未完成知识卡时访问示范 → `LEARNING_SEQUENCE_VIOLATION` |
| 知识卡/示范/基础练习 | 可完成；公开内容不泄露答案键 |
| 草稿 | revision 递增；旧 revision → `DRAFT_CONFLICT`；GET 可恢复 |
| 第一次正式提交弱作答 | 幂等；同键不同答案 → `IDEMPOTENCY_CONFLICT` |
| 第一次评分 | `COMPLETED` + `LEARNED_NOT_MASTERED`；总分 10 |
| 未掌握后下一节点 | `ACC-LIFE-ONBOARD-002` 仍 `locked=true` |
| 补学前挑战/重提 | `REMEDIATION_REQUIRED` |
| 定向补学 | 5 个目标全部正确完成；不直接把路线改成 PASSED |
| 第二次完整提交 | 新 `attemptId`；`PASSED`；门槛与硬性必达均满足；总分 95 |
| 解锁 | 首节点 PASSED；下一节点 `locked=false` 且 `enterable=false` |
| 技术评分失败重试 | 新作答含一次性失败标记 → FAILED；`retry-scoring` 后同 attempt COMPLETED |
| 已通过后低分复习 | 历史结论未掌握，`currentRouteState` 仍 PASSED |
| 训练记录 | 未掌握/通过筛选均有记录；首条快照答案未变；跨用户 404/空列表 |
| 退出 | logout 后 `/api/auth/me`=401 |

最近一次成功摘要：

```text
phase4-http-vertical=ok; user=10000002; firstAttempt=1; remediationTargets=5;
secondAttempt=2; nextUnlocked=true; notMasteredRecords=2; passedRecords=2
```

### 3.2 浏览器真实前端闭环（`tests/e2e/phase4-vertical.mjs`）

视口 `1440×900`，同源 JAR `http://127.0.0.1:18081`，账号 `10000001`（与 HTTP smoke 用户隔离）。截图落在 `.local/test-results/phase4-e2e/`（Git 忽略）。

| 步骤 | 断言结果 |
|---|---|
| 登录前受保护资源 | `/api/worlds`=401 |
| 三世界入口 | 3 个；清算/监督建设中；进入核算地图 |
| 四环节 | 知识卡 → 示范 → 基础练习 → 异常案例 |
| 第一次提交 | attempt=5；结果“已学习，还需要补强”；提供“开始定向补学” |
| 锁定 | API 下一节点 `locked=true`；地图截图保留 |
| 定向补学 | 5 个目标；完成后“重新挑战完整异常案例” |
| 补学后状态 | 路线仍 `LEARNED_NOT_MASTERED` |
| 第二次提交 | attempt=6（新记录）；“路线已通过” |
| 解锁 | 地图“已通过 · 4/4”；下一节点解锁展示且不可进入 |
| 历史 | 两条记录；未掌握详情同时显示历史未掌握与路线当前已通过；通过详情保留已通过 |

## 4. 第一次未掌握证据

- HTTP：`firstAttemptId=1`，`historicalConclusion=LEARNED_NOT_MASTERED`，`firstTotalScore=10`，下一节点仍锁定。
- 浏览器：`firstAttemptId=5`，结果标题含“还需要补强”，截图 `08-result-not-mastered.png`、`09-map-after-fail.png`。
- 公开响应未出现私有评分资产字段（keywords / referenceAnswer / itemId / 硬性项内部 ID）。

## 5. 定向补学证据

- HTTP：补学目标数 5，完成后 `challengeUnlocked=true`；地图首节点仍为 `LEARNED_NOT_MASTERED`。
- 浏览器：`remediationTotalTargets=5`；出现“重新挑战完整异常案例”；截图 `10-remediation-start.png`、`11-exception-after-remediation.png`。
- 补学完成不直接判定路线通过。

## 6. 第二次通过与解锁证据

- HTTP：`secondAttemptId=2`，结论 PASSED，总分 95，门槛与硬性必达满足；下一节点解锁且不可进入。
- 浏览器：`secondAttemptId=6`，标题“路线已通过”；API `nodes[0].state=PASSED`，`nodes[1].locked=false && enterable=false`；截图 `12-result-passed.png`、`13-map-after-pass.png`。

## 7. 两条历史记录与快照不变证据

- 浏览器 API：第一条 `LEARNED_NOT_MASTERED` + `currentRouteState=PASSED`，答案快照仍为弱作答；第二条 `PASSED`。
- 页面：未掌握详情同时显示“历史结论：本次未掌握”与“路线当前：已通过”；通过详情保留“本次已通过”。
- 截图：`15-record-detail-not-mastered.png`、`16-record-detail-passed.png`。

## 8. 用户隔离、顺序、草稿、幂等与技术重试

| 能力 | 证据来源 | 结果 |
|---|---|---|
| 用户隔离 | HTTP smoke：他户读记录 404 + 列表 0 | 通过 |
| 学习顺序 | HTTP：示范前置冲突；浏览器逐步完成四环节 | 通过 |
| 草稿 revision | HTTP：冲突码 `DRAFT_CONFLICT`，revision=1 | 通过 |
| 幂等提交 | HTTP：同键同答返回同一 attempt；同键异答冲突 | 通过 |
| 技术重试 | HTTP：FAILED → retry-scoring → 同 attempt COMPLETED | 通过 |
| 后端回归 | `fullRemediationJourneyKeepsTwoHistorySnapshotsAndUnlocksNextRoute` 等 | 通过 |

## 9. 关键标识

| 层 | 标识 |
|---|---|
| 浏览器 | Playwright Chromium/Chrome，`1440×900`，用户 `10000001`，attempt 5/6 |
| HTTP | 端口 `18081`，用户 `10000002`，attempt 1/2（技术 3，低分复习 4） |
| 数据库 | `.local/data/phase4-vertical-<uuid>` 独立 H2；不触碰 8080 与旧 `data/` |
| 证据文件 | `.local/test-results/phase4-e2e-evidence.json`、`.local/test-results/phase4-e2e/*.png`、`.local/logs/phase4-vertical-app*.log` |

## 10. 新增或修改的测试/脚本文件

- 新增 `tests/e2e/phase4-vertical.mjs`
- 新增 `scripts/run-phase4-vertical-smoke.ps1`
- 新增 `scripts/verify-phase4.ps1`
- 修改 `scripts/run-api-smoke.ps1`（下一节点 routeId 对齐正式地图 `ACC-LIFE-ONBOARD-002`；修复单元素 answer 数组 JSON 序列化）
- 修改 `backend/src/test/java/com/ccb/custodytraining/LearningFlowApplicationTests.java`（新增完整纵向回归用例）
- 新增本报告 `docs/handoffs/phase4-vertical-acceptance-report.md`

未修改：`frontend/`、`contracts/`、`content/`、`design-assets/`。

## 11. 后端修复和根因

无生产代码修复。

验收期仅修正验收脚本中的下一节点 ID 漂移，以及 PowerShell `ConvertTo-Json` 将单元素 `answer` 数组压成字符串导致的 `BAD_REQUEST`（测试脚本问题，非后端缺陷）。

## 12. 前端问题清单

无阻断纵向闭环的前端功能缺陷。

已知工程限制（未改 frontend，登记供主控决策）：

- 同源 JAR 对非根路径（如直接整页打开 `/map/accounting`、`/attempts/{id}`）缺少 SPA fallback 时可能 404。阶段 4 E2E 改为客户端路由导航完成闭环，功能路径本身可用。

## 13. 契约变更请求

无。

## 14. 全部验证命令及结果

| 命令 | 结果 |
|---|---|
| `.\scripts\validate-content.ps1` | 通过 |
| `.\scripts\test-backend.ps1` | 通过（42 tests） |
| `.\scripts\build-frontend.ps1` | 通过（由 build-app 调用） |
| `.\scripts\build-app.ps1` | 通过 |
| `.\scripts\verify-all.ps1` | 通过（基线；不等于阶段 4 纵向闭环） |
| `frontend: npm run typecheck` | 通过 |
| `frontend: npm run test:styles` | 通过 |
| `frontend: npm run test:pages` | 通过（截图产物已还原，未提交） |
| `frontend: npm run build` | 通过 |
| `git diff --check` | 通过 |
| `.\scripts\run-phase4-vertical-smoke.ps1`（隔离 18081） | 通过 |
| `node tests/e2e/phase4-vertical.mjs`（隔离 18081） | 通过 |
| `.\scripts\verify-phase4.ps1` | 编排脚本已提供；最终以隔离 smoke+E2E 实测通过为准 |

## 15. 临时服务和数据清理结果

- 阶段 4 启动的 `18081` 进程在脚本 `finally` 中停止。
- 临时 H2、日志、截图均位于 `.local/`，已由 `.gitignore` 忽略，未纳入提交。
- 未触碰本机既有 `8080` 服务与旧数据目录。

## 16. 已知限制

1. 现有 `tests/e2e/verify.mjs` 仍是阶段 1 旧前端流程，不作为阶段 4 出口依据；阶段 4 主体是 `phase4-vertical.mjs`。
2. `verify-all.ps1` 仍是“一次直接通过”基线 smoke；完整未掌握→补学→通过由 `verify-phase4.ps1` / phase4 smoke+E2E 覆盖。
3. 同源 JAR 深链 SPA fallback 缺失（见第 12 节），不影响客户端路由下的完整学习闭环。
4. 确定性评分依赖 mock profile 关键词匹配；未改生产门槛、正式 Rubric 或正式内容。

## 17. 是否满足阶段 4 出口

是。同时满足：

- 第一次未掌握真实完成
- 定向补学真实完成
- 第二次完整案例重试真实完成且通过
- 下一路线由后端正确解锁
- 两次历史记录与快照正确保留
- 前端流程与 API 状态一致
- 用户隔离、顺序、草稿、幂等和技术重试通过
- 既有验证通过
- 未修改 frontend、contracts、content、设计资产
- 本报告完整
- 提交与推送在本报告对应提交完成后执行
