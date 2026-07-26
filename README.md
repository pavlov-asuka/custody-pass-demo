# 托管智训营

这是“托管智训营”的 Java 后端，使用 JDK 17、Maven 和 Spring Boot 构建。
当前版本提供可切换的案例训练闭环：Mock 模式使用确定性规则评分；OpenAI 兼容模式使用窄模型客户端判断原子得分点，再由 Java 校验并计算四维分数。

## 本地验证

在 Windows PowerShell 中进入本目录：

```powershell
mvn test
mvn package
```

## Mock 启动

无需真实数据库、模型或内网凭据即可启动：

```powershell
mvn spring-boot:run -Dspring-boot.run.profiles=mock
```

启动后访问 `http://localhost:8080/api/health`。

## Mock 登录联调

Mock 模式会在本地 H2 数据库中按需创建两名演示学员：

| 员工号 | 显示名 | Mock 密码 |
| --- | --- | --- |
| `10000001` | 清算学员 | `Demo@1234` |
| `10000002` | 核算学员 | `Demo@1234` |

登录前先获取 CSRF Token：

```http
GET /api/auth/csrf
```

将返回的 `token` 按 `headerName` 放入后续登录请求头，再提交仅包含员工号和密码的 JSON：

```http
POST /api/auth/login
X-CSRF-TOKEN: <返回的 token>
Content-Type: application/json

{"employeeNo":"10000001","password":"Demo@1234"}
```

登录成功后，浏览器保存服务端 HttpOnly Cookie；使用同一 Cookie 请求 `GET /api/auth/me` 即可读取当前学员。退出登录 `POST /api/auth/logout` 也必须带 CSRF 请求头。

## 案例训练 API

当前包含 3 个服务端占位案例：`C001` 清算条线部分交收处理、`C002` 核算条线估值处理、`C003` 监督条线关键风险识别。案例正式内容后续替换 JSON 资产，不改变接口结构。

所有以下接口都要求登录，写操作还需要 CSRF 请求头：

- `GET /api/cases?line=CLEARING`：读取案例列表，可按 `CLEARING`、`ACCOUNTING`、`SUPERVISION` 过滤。
- `GET /api/cases/{caseId}`：读取公开案例详情，只返回背景和作答任务。
- `POST /api/cases/{caseId}/submissions`：提交仅含 `clientRequestId` 和 `answer` 的答案，返回四维结果、命中/遗漏点和学习建议。
- `GET /api/training-records?page=0&size=20`：读取当前学员的训练记录摘要。
- `GET /api/training-records/{recordId}`：读取当前学员的一条完整训练记录和评分快照。

提交结果中的 `reviewerMode=MOCK_RULES` 表示当前使用确定性的关键词规则评分；`OPENAI_COMPATIBLE` 表示模型只返回原子得分点命中结果。服务端由 Java 根据案例原子得分点汇总总分，客户端不能传入分数或用户 ID。相同学员的相同 `clientRequestId` 重试不会重复创建记录；改动案例或答案会返回 `IDEMPOTENCY_CONFLICT`。

案例参考答案、评分点、权重、关键词和知识主题映射只保存在服务端 JSON，不通过案例列表或详情接口下发。本阶段的 OpenAI 兼容客户端支持 DeepSeek 官方 API 和内网兼容网关的共同协议，但不等于 Fin-X-Scope 内网验收。默认构建不引入 Fin-X-Scope 私有依赖；只有在能访问内网 Maven 仓库时，显式执行 `mvn -Pfinxscope ...` 才会编译官方适配层。

## 知识问答 API

知识问答是案例训练的辅助能力。`src/main/resources/knowledge/topics.json` 当前为演示占位资产，内容全部需要业务部门审核后替换；只有 `reviewStatus=APPROVED` 的条目参与检索，服务启动时会校验所有案例引用的主题 ID 都能解析。知识接口不保存问题、答案或跨请求上下文：

- `GET /api/knowledge/topics`：登录后读取公开主题元信息，仅返回 `topicId`、`title` 和 `route`。
- `POST /api/knowledge/questions`：登录且带 CSRF 请求头，提交 `{"question":"..."}`，长度为 2-500 个字符。

问答响应固定包含 `answer`、`citations`、`insufficientKnowledge`、`answerMode`。检索最多返回 3 条，未命中时直接返回知识不足，不调用模型。默认使用确定性的 `MOCK` 回答器；设置 `KNOWLEDGE_ANSWER_MODE=openai` 后才使用现有通用 OpenAI 兼容客户端，模型只接收检索到的已审核条目，并不代表已接入最终 Fin-X-Scope 框架。

数据库迁移 `V2__create_training_record.sql` 使用兼容 H2 MySQL 模式和 MySQL 兼容数据库的普通文本字段保存评分快照；本地使用 H2，正式 internal 环境应使用平台提供的关系型数据库。

## 配置边界

`mock` 配置使用本地 H2，固定密码仅限本地演示，数据库中保存的是 BCrypt 摘要；`internal` 配置仅通过环境变量读取托管关系型数据库信息和两组初始化账号。internal 不使用 Mock 固定密码，账号只在外部变量完整提供且不存在时初始化一次。

服务端会话空闲 2 小时失效，单次登录最长 8 小时；Cookie 默认 HttpOnly、SameSite=Lax，internal 默认启用 Secure。地址、账号、密码和模型信息不得写入源码或提交记录。

## OpenAI 兼容评分

只有显式设置 `CASE_REVIEW_MODE=openai` 或 `KNOWLEDGE_ANSWER_MODE=openai` 才会访问模型；默认 Mock 模式不需要模型地址、Key 或网络。模型配置通过环境变量注入：`MODEL_BASE_URL`、`MODEL_CHAT_PATH`、`MODEL_API_KEY`、`MODEL_NAME`、`MODEL_SEND_USER_ID_HEADER`、`MODEL_CONNECT_TIMEOUT`、`MODEL_REVIEW_TIME_BUDGET`、`MODEL_MAX_TOKENS`、`MODEL_TEMPERATURE`、`MODEL_MAX_REPAIR_ATTEMPTS` 和 `MODEL_THINKING_MODE`。`MODEL_THINKING_MODE` 通用默认值为 `omit`，在未确认网关支持前不会发送 `thinking` 扩展字段。不要把 Key 粘贴到聊天、源码、日志或 Git 历史。

模型只接收案例评分所需的服务端内容，不接收真实敏感业务资料。模型输出必须通过结构校验；失败时返回通用错误，不在一次请求中偷偷降级为 Mock。

## Fin-X-Scope 官方框架准备

`app.model.transport` 默认值为 `openai`。Fin-X-Scope 适配代码和配置位于 `src/finxscope/`，通过 `finxscope` Maven profile 加入，默认 `mvn test`、`mvn package` 不扫描这些目录。内网构建前先阅读 `finxscope_internal_checklist.md`，并使用：

```powershell
mvn -Pfinxscope -DskipTests package
```

当前本机无法解析内网 starter，因此本地只能验证默认构建和静态边界，不能宣称官方框架已经验收。

## 模型安全基准

基准只使用 C001 占位案例和合成答案，不启动 Web 端口、不写入训练记录：

```powershell
.\scripts\run-model-benchmark.ps1 -BaseUrl '<公共或内网兼容地址>' -ModelName '<模型名>'
```

脚本会检查 JDK/Maven；当前进程没有 `MODEL_API_KEY` 时安全提示输入，Key 只存在于本次子进程环境，不写入文件。运行次数由 `MODEL_BENCHMARK_RUNS` 控制，范围为 1-10。最终输出只包含次数、成功率、p50/p95、分数范围和失败状态。

对明确支持 `thinking` 字段的模型服务，可以在相同运行次数下分别执行两组基准：

```powershell
$env:MODEL_BENCHMARK_RUNS = '5'
.\scripts\run-model-benchmark.ps1 -BaseUrl '<兼容地址>' -ModelName '<模型名>' -ThinkingMode disabled
.\scripts\run-model-benchmark.ps1 -BaseUrl '<兼容地址>' -ModelName '<模型名>' -ThinkingMode enabled
```

两组结果用于比较结构化成功率、P95 和分数波动，不预设哪种模式一定更好。DeepSeek 官方时延敏感测试可尝试 `disabled`；内网网关在确认支持前应保持 `omit`。

正式前端目录和页面由 Kimi K3 单独维护，本阶段不包含正式前端。
