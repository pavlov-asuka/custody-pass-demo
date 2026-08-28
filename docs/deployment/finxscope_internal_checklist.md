# Fin-X-Scope 内网验证清单

本清单是正式部署环境的前置核验，不是本地默认 Mock 工程的完成条件。私有 starter、凭据和内网服务只能在具备相应权限的环境中验证。

## 1. 首次构建

在可访问内网 Maven 仓库的环境中进入 `Repository/backend`，先执行：

```powershell
mvn -Pfinxscope -DskipTests package
```

若失败，回传以下两项：

```powershell
mvn -Pfinxscope dependency:tree
mvn -Pfinxscope -DskipTests package
```

只需回传依赖树中 starter 版本、首个编译错误及其上下文，不要回传地址、Key、完整提示词或模型正文。

## 2. 首要兼容性确认

- 解包或编译确认 starter 3.0.4 的启动注解包名。当前代码候选为 `com.ccb.framework.finxscope.starter.FinAgentScopeStarter`；附件手册出现过 `com.aliyun.finxscope.starter.FinAgentScopeStarter`，以 3.0.4 Demo 实际源码和编译结果为准。
- 确认 `ProcessContext` 是否支持本实现使用的 `setMessageId`、`setUserId`，以及 `withSessionId`、`withConversationId`、`withExecutionMode`、`withExtras`。
- 确认 `FrameworkAiConstant.FIN_X_SCOPE_GATEWAY_EXTRA_HEADER` 的实际包名、常量名和 extras 值格式，确保只透传服务端取得的 `X-User-ID`。
- 首次编译同时确认 `McpBusinessParams`、`McpTechnicalParams`、`AgentMcpRawInput`、`FrameworkAiConstant.AGENT_RAW_DATA`、`GatewayTechParam`、`GatewayTechParam.ADDITIONAL_MODEL_PARAMS` 和 `FrameworkAiConstant.FIN_X_SCOPE_GATEWAY_EXTRA_BODY` 的实际包名、方法和常量名；当前适配按 Demo 的最小结构传入空业务参数、`sysEvtTraceId`、`userId`、`stream=false`、`sessionId`，不加入 MCP 工具、RAG user info、硬编码 UASS 或秘密。
- 确认配置文件中的 Spring `${...}` 占位符是否会被框架 YAML 加载器解析；若不会，改用内网平台支持的注入方式，不把凭据写回文件。

## 3. 启动与单次链路

构建成功后使用 `internal,finxscope` profile 启动：

```powershell
mvn -Pfinxscope spring-boot:run -Dspring-boot.run.profiles=internal,finxscope
```

所有凭据只放环境变量或平台密钥中：

- `MODEL_BASE_URL`、`MODEL_API_KEY`、`MODEL_NAME`
- 数据库连接变量和初始化账号变量
- `MODEL_TRANSPORT` 应保持为 `finxscope`

检查以下内容：

- `custody_training_agent` 成功注册，只有一个模型客户端 Bean；无重复 Bean、无默认 OpenAI 客户端误创建。
- `ccb.framework.finxscope.cache.type=local` 生效。
- `models-config.yml`、`agent-config.yml`、`skill-config.yml` 均被加载。
- `X-User-ID` 由服务端当前登录学员设置，不能由前端传入覆盖。
- 并发超过固定线程数和 `threads*2` 有界队列后，接口统一返回 `BUSY`，响应中不得包含请求内容；验证 `shutdownNow` 后不再接受新任务。
- 关闭思考模式，单次正式综合实务结构化证据判定成功一次；返回值仍通过 Java 的 item ID 白名单、完整性和证据校验，并由 Java 裁决分数、硬门槛和结论。
- 两个不同登录学员分别提交后，训练记录不能互读。

## 4. 已核验配置与关闭项

3.0.4 已核验的配置事实已写入 `application-finxscope.yml`：本地缓存、模型配置位置，以及两个可选导入文件。当前按 Demo/手册中已出现的属性关闭本项目不用的能力：embedding、vector、STM、LTM、intent、history、todolist、HITL、执行明细日志文件、code-execution，以及 MNG 的远程配置和 Redis Pub/Sub。

内网需确认这些关闭属性在 starter 3.0.4 中均生效。若报未知配置或仍实际初始化，只回传属性名、版本和首个错误，不要自行猜造新属性名。当前配置没有照搬 Demo 中的 Redis 地址、凭据、MCP、RAG 或文件日志路径。

## 5. SYNC 行为验证

框架模型调用在单次后台评分任务内同步取得结构化证据，但面向前端的 attempt API 是异步轮询，不使用 SSE。内网必须实测并记录：超时是否可控、Future 取消后框架执行是否停止、线程池关闭是否生效、并发 4 个请求时是否串会话或串用户、返回 suspended/空响应/运行异常时是否统一落为 attempt `FAILED`，以及对原 attempt 重试时是否保持答案与内容快照不变。

## 6. 验收边界

本机缺少内网私有 starter、凭据和服务，默认构建通过不代表官方框架验收完成，也不表示本地工程未完成。只有内网完成上述构建、启动、Agent 注册、网关用户头、单次评分、用户隔离、技术失败重试和框架调用行为检查后，才能宣称 Fin-X-Scope 接入验收通过。
