# 当前架构

## 总体结构

系统是单一 Spring Boot 应用，前端生产构建通过 Maven `web` profile 打入同源可执行 JAR。

```text
React/Vite 桌面前端
        │ Cookie session + CSRF
Spring Boot REST API
        ├─ 认证与用户隔离
        ├─ 地图、路线与环节进度
        ├─ 草稿、正式作答与训练历史
        ├─ 异步评分、补学与解锁
        └─ FormalContentCatalog
              └─ content/ 只读正式内容
        │
Flyway + JDBC
        ├─ H2（本地 Mock）
        └─ MySQL（正式配置）
```

## 事实与状态边界

- `content/` 保存发布清单、地图、路线、Rubric 和来源，构建时打入 classpath 的 `formal/`。
- 当前 active 发布清单为 `content/releases/CUSTODY_2026.08.12.json`，登记 59 条路线（50 条 `REQUIRED`、9 条 `ADVANCED`）；旧 `ACCOUNTING_2026.08.10` 文件作为核算发布快照保留。`custody-learning-map.json` 提供三世界入口：`ACCOUNTING`、`CLEARING` 与 `SUPERVISION` 均为 `OPEN`；监督地图登记 `SPV-REGION-CORE / SPV-MODULE-LIFECYCLE` 及 4 条连续 `REQUIRED` 路线。
- `CLEARING` 长地图包含共同基础及资金、场内、银行间三条分支，共 7 个 `REQUIRED` `ROUTE` 节点；分支内首路线到正常关闭路线串联，不设置 `STAGE_GATE` 或 `ADVANCED` 节点。
- `SUPERVISION` 长地图包含合同、规则、任务和闭环四个 `REQUIRED` `ROUTE` 节点，按 `SPV-CONTRACT-001 → SPV-RULE-002 → SPV-TASK-003 → SPV-CLOSE-004` 串联；业务扩展路线仍按来源边界保持 DEFER。
- `contracts/openapi.yaml` 定义公开 HTTP 接口；`contracts/schemas/` 校验内容发布结构。
- 公开 API 只投影前端需要的安全字段，不返回正确答案、参考答案、Rubric、硬性必达项细节、评分关键词、内部项目 ID、模型名称或参数。
- 前端不根据分数计算路线结论、进度或解锁。
- 路线状态由后端依据学习进度、历史评分和前置关系推导。

核心状态：

- 路线：`LOCKED / NOT_STARTED / IN_PROGRESS / LEARNED_NOT_MASTERED / PASSED`
- 评分：`SCORING / COMPLETED / FAILED`
- 历史结论：`PASSED / LEARNED_NOT_MASTERED`

评分处理中不会成为路线状态。路线通过后再次复习得到低分，只新增一条未掌握历史，不撤销当前 `PASSED`。

## 正式作答与评分

正式提交先不可变保存作答、内容版本和 Rubric 版本快照，再异步评分。查询结果不会触发重新评分。

- 技术失败：attempt 为 `FAILED`，可对原 attempt 重试。
- 学习未达标：attempt 为 `COMPLETED`，结论为 `LEARNED_NOT_MASTERED`。
- Mock 评分器提供确定性结果。
- 模型评分器只返回结构化证据判断；分数、硬门槛和最终结论由 Java 裁决。
- 补学完成只解锁完整挑战，不直接改变路线结论。

## 数据

Flyway 保留 `app_user`，学习闭环使用：

- `learning_step_progress`
- `basic_question_progress`
- `comprehensive_practice_draft`
- `formal_attempt`
- `scoring_result`
- `remediation_plan`
- `remediation_target`

答案、内容、Rubric 和评分结果均快照化；用户隔离由服务端认证身份和数据库查询共同保证。

## 构建与环境

- Java 17、Spring Boot 3.5.3。
- React 18、TypeScript、Vite 6。
- 默认 Mock 不依赖模型或内网凭据。
- `finxscope` Maven profile 加载内网 3.0.4 starter 和专用源码；默认构建不解析该私有依赖。
- `.local/` 承载隔离数据库、日志和测试证据，不进入 Git。

部署操作分别见：

- `docs/deployment/deployment_checklist.md`
- `docs/deployment/finxscope_internal_checklist.md`
