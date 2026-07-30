# 托管智训营

面向托管业务新人的桌面端学习产品。用户登录后从清算、核算、监督三个学习世界中进入所属条线；当前正式开放核算世界的一条完整路线“站上核算岗”。

产品已经走通以下纵向闭环：

`三世界入口 → 核算连续地图 → 知识卡 → 正常示范 → 基础练习 → 异常案例 → 异步四维评分 → 定向补学 → 完整案例重试 → 通过并解锁`

当前状态和已知限制见 [docs/current-state.md](docs/current-state.md)，技术结构见 [docs/architecture.md](docs/architecture.md)，前端视觉以 [frontend/DESIGN.md](frontend/DESIGN.md) 为唯一事实源。

## 当前正式范围

- `ACCOUNTING`：开放；正式路线 `ACC-LIFE-ROLE-001`“站上核算岗”。
- `CLEARING`、`SUPERVISION`：内容建设中，不提供虚假路线或进度。
- 下一核算节点“接管一只新产品”：仅展示通过后的解锁状态，内容仍在建设。
- 路线固定包含知识卡、正常示范、基础练习、异常案例四个环节。
- 评分维度为概念 25、处理步骤 30、风险意识 25、表达规范 20；总分达到 75 且两项硬性必达均满足才通过。

不采用 XP、等级、连续学习、红心、排行榜、商城、独立知识问答或三条线快速切换。首版只设计和验收桌面端。

## 目录

```text
backend/       Spring Boot、Flyway、学习与评分后端
frontend/      React + Vite 桌面前端
contracts/     OpenAPI、JSON Schema 和公开联调样例
content/       地图、路线、Rubric、发布清单和来源
design-assets/ 角色身份基准、生产规范和可复现源资产
docs/          当前状态、架构与部署资料
scripts/       构建、校验、启动和纵向验收入口
tests/e2e/     真实浏览器系统级闭环
.local/        本地数据库、日志和测试结果；不进入 Git
```

## 本地验证

在仓库根目录使用 PowerShell：

```powershell
.\scripts\validate-content.ps1
.\scripts\test-backend.ps1
.\scripts\build-frontend.ps1
.\scripts\build-app.ps1
.\scripts\verify-all.ps1
.\scripts\verify-phase4.ps1
```

- `verify-all.ps1` 验证一次通过的基础闭环。
- `verify-phase4.ps1` 验证未掌握、五项目标补学、完整重试、通过、解锁和两条历史快照的完整纵向闭环。
- 两个脚本都使用隔离端口和 `.local/` 下的随机 H2 数据，不触碰日常运行数据。

启动本地 Mock：

```powershell
.\scripts\run-mock.ps1
```

Mock 账号：

| 员工号 | 显示名 | 密码 |
| --- | --- | --- |
| `10000001` | 清算学员 | `Demo@1234` |
| `10000002` | 核算学员 | `Demo@1234` |

固定密码仅用于本地 Mock。正式环境的数据库、账号和模型配置必须通过环境变量或平台密钥注入。

## 技术基线

- Java 17、Spring Boot 3.5.3、Maven、Flyway。
- React 18、TypeScript、Vite 6。
- 本地 Mock 使用 H2；正式配置支持 MySQL。
- 前端生产构建通过 Maven `web` profile 打入同源可执行 JAR。
- Fin-X-Scope 3.0.4 仅作为内网可选 profile；默认构建不解析私有依赖。
- HTTP 契约以 `contracts/openapi.yaml` 为准，正式内容以 `content/` 为准。
