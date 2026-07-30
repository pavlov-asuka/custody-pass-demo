# 阶段 4 施工报告（呈主控）

> 角色：独立联调验收工程师  
> 阶段：纵向闭环验收  
> 状态：**已完成并停止；未启动阶段 5；未修改 frontend**  
> 完整验收正文：`docs/handoffs/phase4-vertical-acceptance-report.md`

---

## 1. 结论（给主控的一句话）

阶段 4 出口条件已全部满足：真实同源 JAR + 隔离 H2 + 真实前端（1440×900）走通  
**未掌握 → 定向补学 → 完整重试通过 → 后端解锁 → 双历史快照保留**；  
已提交并推送到 `origin/learning-map-rebuild`；工作树干净。

---

## 2. 仓库与提交

| 项 | 值 |
|---|---|
| 路径 | `D:\coding\Project\CCBAGENT-CODEX\Repository` |
| 分支 | `codex/learning-map-rebuild` |
| 跟踪 | `origin/learning-map-rebuild` |
| origin | `https://github.com/pavlov-asuka/custody-pass-demo.git` |
| 起始 HEAD | `3a08efd6c061200872de56ea4543232ff4306a64` |
| 结束 HEAD | `77a4973232eddfc2778998d62fd8f5587e86040b` |
| PR | **未创建（按指令禁止） |

### 本阶段提交

| 哈希 | 说明 |
|---|---|
| `c44acd4` | `test: verify full remediation learning journey` |
| `d08c0de` | `docs: finalize phase four acceptance` |
| `c92a90a` | `docs: record phase four ending commit hash` |
| `64e82f9` | `docs: clarify phase four tip commit reference` |
| `77a4973` | `docs: list phase four commits in acceptance report` |

### 推送说明

- 已推送到跟踪分支 `origin/learning-map-rebuild`（`3a08efd..77a4973`）。
- 副作用：曾误执行 `git push origin HEAD`，远端多出 `origin/codex/learning-map-rebuild`；**正确跟踪分支已更新**。是否删除多余远端分支请主控决定（本阶段未 force、未删远端）。

---

## 3. 施工边界执行情况

| 允许 | 实际 |
|---|---|
| `tests/e2e/` | 新增 `phase4-vertical.mjs` |
| `scripts/` 验收/隔离相关 | 新增 `run-phase4-vertical-smoke.ps1`、`verify-phase4.ps1`；修正 `run-api-smoke.ps1` |
| 后端测试 | 新增纵向回归 `fullRemediationJourneyKeepsTwoHistorySnapshotsAndUnlocksNextRoute` |
| 最小后端缺陷修复 | **无生产代码修改** |
| 阶段 4 报告 | `docs/handoffs/phase4-vertical-acceptance-report.md` |

| 禁止 | 执行 |
|---|---|
| `frontend/` | **未改** |
| `contracts/` | **未改** |
| `content/` | **未改** |
| `design-assets/` / 3B 截图 | **未改**（`test:pages` 曾生成截图，已还原且未提交） |
| 阶段 5 / 建 PR / 强推 / 改远程 | **未做** |

---

## 4. 纵向闭环验收摘要

### 4.1 环境

- 隔离端口：`18081`（不碰 8080）
- 隔离库：`.local/data/phase4-vertical-*`（H2，Git 忽略）
- 同源 JAR：`backend/target/custody-training-*.jar` + `mock` profile
- 浏览器：Playwright，视口 `1440×900`
- HTTP 用户：`10000002`；浏览器用户：`10000001`（互不污染）

### 4.2 闭环结果

| 环节 | 结果 | 关键标识 |
|---|---|---|
| 登录 / CSRF / 未授权拦截 | 通过 | `/api/worlds` 未登录 401 |
| 三世界 + 核算地图 | 通过 | 清算/监督 BUILDING |
| 四环节顺序推进 | 通过 | 知识卡→示范→练习→异常 |
| 第一次完整异常案例 | **未掌握** | HTTP attempt `1`；浏览器 attempt `5`；总分 10 |
| 下一路线锁定 | 通过 | `ACC-LIFE-ONBOARD-002` 仍 locked |
| 定向补学 | 通过 | 5 个目标全部完成；路线仍未掌握 |
| 第二次完整重试 | **已通过** | HTTP attempt `2`；浏览器 attempt `6`；总分 95 |
| 后端解锁 | 通过 | 下一节点 `locked=false` 且 `enterable=false` |
| 双历史快照 | 通过 | 首条历史未掌握 + 当前已通过；答案快照不变 |
| 草稿 revision / 幂等 / 技术重试 / 用户隔离 | 通过 | 见验收报告第 8 节 |

**不能**用“第一次直接通过”的旧 smoke 代替；阶段 4 新增 fail→remediate→pass 路径已实测。

---

## 5. 缺陷与决策事项

### 5.1 后端生产缺陷

**无。**

### 5.2 验收脚本修正（非产品缺陷）

1. `run-api-smoke.ps1` 下一节点 ID：`ACC-LIFE-TAKEOVER-001` → 正式地图 `ACC-LIFE-ONBOARD-002`
2. PowerShell `ConvertTo-Json` 单元素 `answer` 数组被压成字符串 → 补学接口 `BAD_REQUEST`（脚本层修复）

### 5.3 前端问题

**无功能阻断项。**

已知工程限制（未改 frontend，供主控排期）：

- 同源 JAR 对非根路径整页深链（如直接打开 `/map/accounting`）可能缺 SPA fallback 而 404。  
- 客户端路由下完整学习闭环可用；阶段 4 E2E 已用客户端导航完成验收。  
- **建议阶段 5 或专项**：后端增加 SPA forward，或前端/部署侧统一处理。

### 5.4 契约 / 正式内容

**无变更请求。**

---

## 6. 验证矩阵（主控可复核）

| 命令 | 结果 |
|---|---|
| `scripts/validate-content.ps1` | 通过 |
| `scripts/test-backend.ps1` | 通过（42） |
| `scripts/build-frontend.ps1` / `build-app.ps1` | 通过 |
| `scripts/verify-all.ps1` | 通过（基线一次通过；≠ 阶段 4 纵向） |
| `frontend` typecheck / test:styles / test:pages / build | 通过 |
| `git diff --check` | 通过 |
| `scripts/run-phase4-vertical-smoke.ps1` | 通过 |
| `node tests/e2e/phase4-vertical.mjs` | 通过 |
| `scripts/verify-phase4.ps1` | 已提供编排入口 |

复跑阶段 4 纵向：

```powershell
.\scripts\verify-phase4.ps1
```

---

## 7. 交付物清单

1. 浏览器纵向 E2E：`tests/e2e/phase4-vertical.mjs`
2. HTTP 纵向 smoke：`scripts/run-phase4-vertical-smoke.ps1`
3. 编排脚本：`scripts/verify-phase4.ps1`
4. 后端回归用例：`LearningFlowApplicationTests#fullRemediationJourneyKeepsTwoHistorySnapshotsAndUnlocksNextRoute`
5. 正式验收报告：`docs/handoffs/phase4-vertical-acceptance-report.md`
6. 临时证据（不入库）：`.local/test-results/phase4-e2e*`、`.local/logs/phase4-vertical-app*`

---

## 8. 对主控的交接建议

1. **可宣布阶段 4 通过**；下一动作为阶段 5 时请另发开工指令。
2. 阶段 5 前可先决策：是否清理误推的 `origin/codex/learning-map-rebuild`。
3. 可选排期：同源 JAR 的 SPA deep-link fallback（非阶段 4 阻断）。
4. 基线 `verify-all.ps1` 仍只覆盖“一次通过”；完整补学闭环以 `verify-phase4.ps1` 为准。

---

## 9. 出口声明

阶段 4已完成并停止；未修改 frontend；未启动阶段 5。
