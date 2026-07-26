# 托管智训营前端施工交接

## 定位

正式前端由 Kimi K3 实现。本文件只约束后端行为、接口和异常处理，不限制视觉创作。产品名统一为“托管智训营”。第一屏必须是真实登录页；登录后进入三条学习路线/学习地图，再进入案例练习主流程。保留“小托”形象位置，具体形象、排版、动效和配色由 Kimi K3 决定。

## 主流程

登录 → 三条学习路线/学习地图 → 案例列表 → 案例详情与开放作答 → 等待评分 → 四维结果 → 证据、遗漏点和学习建议 → 训练记录。知识问答是辅助页，不阻断案例训练。当前案例和知识均为占位材料，页面必须明确演示属性，不能包装成正式制度、正式课程或正式业务指引。

## 请求约定

以 `openapi.yaml` 为唯一 TypeScript 类型和请求封装事实源。部署时页面与 API 为同源服务，使用相对路径；不要假定跨域部署或自行依赖 CORS。所有 `fetch` 使用 `credentials: 'include'`，不要把会话放入 `localStorage`，也不要用 `localStorage` 伪造身份。启动时先 `GET /api/auth/csrf`，保存本次页面会话内的 `token` 和 `headerName`；所有 `POST` 请求都带该 header。页面刷新后通过 `GET /api/auth/me` 恢复登录状态，`401` 回到登录页。

- `401`：清空页面用户状态并回到登录页。
- `403`：重新获取 CSRF；若仍失败，提示安全校验失败，不要自动循环重试。
- `409`：提示“该请求标识已对应另一份提交”，保留当前答案，不要自动换 ID 原样重复提交；只有用户实质修改答案，或主动发起新一轮作答时，才生成新的 `clientRequestId`。
- `500`：显示通用失败和重试按钮，不展示服务端堆栈。
- 请求中的 `clientRequestId` 每次新答案生成一个 UUID（或满足契约的随机 ID）。同一次提交的网络重试必须复用原 ID；只有用户实质修改答案或主动发起新一轮作答时才生成新 ID。
- 永远不要提交 `userId`、`score` 或 `reviewerMode`，也不要保存密码、Key、Cookie 或直连模型。

## 页面与状态

登录页使用 `GET /api/auth/csrf`、`POST /api/auth/login`、`GET /api/auth/me`；需要校验空输入、提交中禁用按钮、错误可重试。学习地图使用 `GET /api/cases`，按 `line` 展示三条路线；处理加载、空列表、筛选失败和重试。案例页使用 `GET /api/cases/{caseId}`，只展示 `background`、`tasks` 等公开作答材料；`placeholder: true` 时显示演示标签，详情加载失败可返回列表。提交使用 `POST /api/cases/{caseId}/submissions`，按钮在评分期间禁用，成功后进入结果页，失败保留答案。

结果页使用 `POST /api/cases/{caseId}/submissions` 返回的 `TrainingRecordDetail`，按 `CONCEPT`、`PROCESS`、`RISK`、`EXPRESSION` 展示四维分数；逐点展示 `matched`、`evidence`、命中/遗漏点和 `learningSuggestions`。`weight`、`maxScore` 是当前后端真实返回字段，但前端不要把它们做成评分规则或权重说明。`reviewerMode` 可以作为简洁演示状态显示，不要暴露实现细节。

训练记录页使用 `GET /api/training-records`，支持分页、加载中、空状态、翻页失败和重试；详情使用 `GET /api/training-records/{recordId}`，遇到 `404` 显示记录不存在。知识页先取 `GET /api/knowledge/topics`，提问使用 `POST /api/knowledge/questions`；问题输入限制 2-500 字，按钮在请求期间禁用，展示 `answer`、`citations` 和 `insufficientKnowledge`。`answerMode` 可简洁显示为演示状态。当前问答是一次性 JSON，不是 SSE，不要假设流式输出、多轮聊天或前端会话 ID。

## 明确未实现

当前契约没有注册、找回密码、课程闯关、文件上传、实时流式输出、多轮聊天或学员自定义账户接口。不要在前端预留会调用这些不存在接口的流程；后续新增能力必须先更新后端和 `openapi.yaml`。
