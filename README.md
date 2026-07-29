# 托管智训营

阶段2已完成一条可供前端直接接入的正式核算学习闭环。Spring Boot 后端提供 Cookie 会话、动态 CSRF、三世界入口、核算连续地图、四环节顺序学习、草稿、不可变正式作答、异步评分、定向补学、重试挑战和不可变训练历史。默认 Mock 使用 H2 与确定性正式评分，不需要模型或内网凭据。

当前前端仍是阶段1实现，尚未接入新契约；阶段2没有修改 `frontend/`。旧占位案例、独立知识问答和旧训练记录运行依赖已移除。

## 正式范围

- ACCOUNTING：`OPEN`，首路线“站上核算岗”（`ACC-LIFE-ROLE-001`）。
- CLEARING / SUPERVISION：`BUILDING`，无虚假路线和进度。
- 下一核算节点“接管一只新产品”仅提供通过后的解锁展示，内容仍为 `BUILDING`。
- 四维 Rubric：概念 25、处理步骤 30、风险意识 25、表达规范 20；75 分且两项硬性必达均满足才通过。

## 目录

```text
backend/       Spring Boot 后端、Flyway、自动化测试
frontend/      阶段1前端（阶段2未修改）
contracts/     OpenAPI、正式 JSON Schema、联调 examples
content/       发布清单、地图、路线、Rubric、来源
design-assets/ 小托身份基准与生产规范
docs/          架构、部署与 Kimi K3 交接
scripts/       构建、校验、启动和真实 HTTP smoke
.local/        本地数据库、日志和构建验证残留（Git 忽略）
```

## 验证与启动

在仓库根目录使用 PowerShell：

```powershell
.\scripts\validate-content.ps1
.\scripts\test-backend.ps1
.\scripts\build-app.ps1
.\scripts\run-mock.ps1
```

`build-app.ps1` 会只读构建当前前端，再生成同源 JAR：
`backend/target/custody-training-0.1.0-SNAPSHOT.jar`。

阶段2统一验证会在隔离端口 `18080` 和随机 `.local/data/phase2-smoke-*` 数据库启动 JAR，不触碰当前 8080 服务或旧 `data/`：

```powershell
.\scripts\verify-all.ps1
```

它执行内容校验、后端测试、组合构建和真实 HTTP 闭环 smoke。阶段1旧前端 E2E 不在阶段2验收范围。

对已启动环境单独 smoke：

```powershell
$password = Read-Host Password -AsSecureString
.\scripts\run-api-smoke.ps1 `
  -BaseUrl http://localhost:8080 `
  -EmployeeNo 10000002 `
  -Password $password
```

## Mock 登录

| 员工号 | 显示名 | Mock 密码 |
| --- | --- | --- |
| `10000001` | 清算学员 | `Demo@1234` |
| `10000002` | 核算学员 | `Demo@1234` |

固定密码只用于本地 Mock。internal 数据库、初始化账号和模型配置必须通过环境变量或平台密钥注入。

## 数据库

Flyway V1 保留 `app_user`；V3 删除 V2 旧 `training_record` 并创建：

- `learning_step_progress`
- `basic_question_progress`
- `exception_case_draft`
- `formal_attempt`
- `scoring_result`
- `remediation_plan`
- `remediation_target`

不迁移或兼容旧占位训练数据。路线通过、解锁和主进度由后端推导，不存在可直接修改的“已通过”真值字段。

## 契约与交接

- HTTP 契约：`contracts/openapi.yaml`
- 内容 Schema 与 examples：`contracts/`
- Kimi K3 接入：`docs/handoffs/kimi-k3-backend-phase2.md`
- 后端架构：`docs/architecture/README.md`
- 小托资产：`design-assets/xiaotuo/`
- Linux 部署：`docs/deployment/deployment_checklist.md`
- Fin-X-Scope 内网验证：`docs/deployment/finxscope_internal_checklist.md`

默认构建不引入 Fin-X-Scope 私有依赖。只有内网 Maven 可用时才执行 `mvn -Pfinxscope ...`；本地默认构建通过不代表官方框架验收完成。
