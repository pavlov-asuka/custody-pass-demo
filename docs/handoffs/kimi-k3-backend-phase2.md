# Kimi K3 阶段2后端接入手册

## 可接入范围

后端已提供一条完整核算路线“站上核算岗”（`ACC-LIFE-ROLE-001`）。路线顺序固定为知识卡、正常示范、基础练习、异常案例。清算和监督世界只显示 `BUILDING`；不得为其制造路线、进度或可点击入口。

接口事实源是 `contracts/openapi.yaml`，可复制样例在 `contracts/examples/`。阶段1接口 `/api/cases`、`/api/knowledge/*` 已返回 404。

## 本地启动

```powershell
Set-Location <Repository目录>
.\scripts\test-backend.ps1
.\scripts\build-app.ps1
.\scripts\run-mock.ps1
```

应用默认在 `http://localhost:8080`。Mock 账号：

| 员工号 | 密码 |
| --- | --- |
| `10000001` | `Demo@1234` |
| `10000002` | `Demo@1234` |

Mock 数据写入 `.local/data/`。不要使用或迁移仓库外旧 `data/`。

## 认证与 CSRF

客户端必须保存 Cookie：

1. `GET /api/auth/csrf`，读取动态 `headerName` 和 `token`；
2. `POST /api/auth/login`，请求头使用上述动态名称和值；
3. 后续所有 `POST/PUT` 都带同一 CSRF Header；
4. `GET /api/auth/me` 恢复会话，`POST /api/auth/logout` 退出。

不要硬编码 CSRF Header 名称，不要发送前端自造的用户 ID。后端只使用当前登录会话进行用户隔离。

## 推荐接口顺序

1. `GET /api/worlds`
2. `GET /api/lines/ACCOUNTING/map`
3. `GET /api/routes/{routeId}`
4. 按 `nextStep` 调用 `GET /api/routes/{routeId}/steps/{stepType}`
5. 知识卡和正常示范分别调用 `POST .../complete`
6. 基础练习按题调用 `POST .../answers`
7. 异常案例用 `GET/PUT .../draft` 自动保存
8. `POST .../attempts` 正式提交，保存返回的 `attemptId`
9. `GET /api/attempts/{attemptId}` 轮询至 `COMPLETED` 或 `FAILED`
10. 未掌握时按 `allowedActions` 获取并完成 remediation，再调用 challenge
11. `GET /api/training-records` 和详情展示不可变历史

`eventId`、`requestId`、`clientRequestId` 使用 8—64 位 `[A-Za-z0-9_-]`。正式提交幂等键是当前用户范围；同键不同答案会返回冲突，不能静默换键造成重复 attempt。

路线概览返回 `contentVersion` 和 `rubricVersion`，提交时原样回传。它们只是版本标识；前端仍不会得到 Rubric 内容。

## 状态机

路线只认 `LOCKED / NOT_STARTED / IN_PROGRESS / LEARNED_NOT_MASTERED / PASSED`。评分处理只认 `SCORING / COMPLETED / FAILED`：

- `SCORING`：继续轮询，不改变路线为“评分中”状态；
- `FAILED`：技术失败，不等于未通过，只显示 `RETRY_SCORING`；
- `COMPLETED + PASSED`：历史通过，当前路线为 `PASSED`；
- `COMPLETED + LEARNED_NOT_MASTERED`：显示本 attempt 的补学计划。

补学全部完成只会解锁完整异常案例重试，绝不直接把路线改成通过。已通过后的低分复习保留路线 `PASSED`，同时在历史中显示本次 `LEARNED_NOT_MASTERED`。

## 草稿、提交与轮询

草稿 `revision` 从 0 开始。自动保存时传 `expectedRevision`；`DRAFT_CONFLICT` 后先 GET 最新草稿再让用户选择或重试，不能覆盖。

正式提交返回时可能仍是 `SCORING`，也可能在 Mock 中很快成为 `COMPLETED`。轮询建议 500—1000 ms，页面离开后停止；再次进入直接查询同一 `attemptId`，查询本身不会调用模型。

## 错误处理

统一错误体包含服务端 `code` 和安全消息。重点处理：

- `UNAUTHORIZED / FORBIDDEN`：恢复登录或刷新 CSRF；
- `CONTENT_BUILDING`：显示建设中；
- `LEARNING_SEQUENCE_VIOLATION`：刷新路线概览并跳到 `nextStep`；
- `CONTENT_VERSION_MISMATCH`：刷新路线和当前环节；
- `DRAFT_CONFLICT`：重新取草稿；
- `IDEMPOTENCY_CONFLICT`：保留原答案并提示，不自动生成新提交；
- `ATTEMPT_SCORING`：回到原 attempt 轮询；
- `SCORING_RETRY_REQUIRED`：只重试原 attempt 的评分；
- `REMEDIATION_REQUIRED`：进入与原 attempt 绑定的补学。

## 前端禁止自行计算

以下字段只展示后端值：世界/地图进度、节点 `state`、`locked`、`enterable`、`recommendedNodeId`、`nextStep`、环节完成、基础练习完成、总分、维度分、硬性必达结果、`historicalConclusion`、`currentRouteState`、补学完成和重试解锁。

不要从分数猜结论；75 分以上仍可能因硬性必达未命中而未掌握。不要在前端保存正确答案、参考答案、关键词、Rubric、内部 topic ID、模型名称或运行参数。

## 小托资产

身份基准与制作规范位于 `design-assets/xiaotuo/`。PNG 用于锁定形象和比例，生产切图必须重绘为透明背景、纯色、粗轮廓、无渐变。评分中动作保持中性，不能提前暗示通过。

## 联调验收

```powershell
$password = Read-Host Password -AsSecureString
.\scripts\run-api-smoke.ps1 `
  -BaseUrl http://localhost:8080 `
  -EmployeeNo 10000002 `
  -Password $password
```

此 smoke 真实走登录/CSRF、三世界、地图、四环节、草稿、幂等提交、异步轮询、通过解锁和训练历史。
