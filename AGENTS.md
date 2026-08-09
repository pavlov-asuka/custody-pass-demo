# Repository Rules

## Authority

- `README.md`：项目入口和验证命令。
- `docs/current-state.md`：当前阶段、已完成能力、限制和下一步。
- `docs/architecture.md`：当前技术边界。
- `contracts/openapi.yaml`：公开 HTTP 契约。
- `content/`：地图、路线、评分和发布内容。
- `frontend/DESIGN.md`：唯一前端视觉事实源。

历史提交、旧截图和阶段交接不是当前需求。发生冲突时按以上顺序核对现役事实，不从旧代码或 Git 历史反推新需求。

## Scope

- 产品只验收桌面端，不新增移动端布局或适配。
- 保留三世界入口、核算连续长地图、四环节、异步四维评分、定向补学、综合实务重做和训练记录。
- 禁止引入 XP、等级、连续学习、红心、排行榜、商城、独立问答或三条线快速切换。
- 不自行扩展业务条线、路线或正式内容。阶段 5 股票模块已经按明确授权完成 8 条正式业务路线并发布为 `ACCOUNTING_2026.08.2`；本批完成后停止。其他模块的讨论稿尚未授权制作成正式 JSON 或发布，正式施工必须以经过业务终审的路线资产和明确批次为准。
- 不修改接口、评分语义、数据模型或内容 Schema，除非任务明确授权。

## Directory Boundaries

- `backend/`：Java 后端和数据库迁移。
- `frontend/`：桌面前端；视觉改动必须遵守 `frontend/DESIGN.md`。
- `contracts/`：公共契约，禁止泄露答案、Rubric、硬性项细节、关键词或模型参数。
- `content/`：内容源资产；公开内容与私有评分资产必须分离。
- `design-assets/`：视觉源文件和生产规范。
- `tests/e2e/`：系统级真实浏览器闭环。
- `.local/`、`target/`、`dist/`、`node_modules/`、日志和数据库均不得提交。

## Verification

按修改范围执行最小充分验证：

```powershell
.\scripts\validate-content.ps1
.\scripts\test-backend.ps1
.\scripts\build-frontend.ps1
.\scripts\build-app.ps1
.\scripts\verify-all.ps1
.\scripts\verify-phase4.ps1
```

鉴权、用户隔离、学习顺序、草稿 revision、幂等提交、异步评分、硬门槛、补学、解锁和历史快照属于高风险边界，改动时必须补测试。

## Safety

- 不提交真实密码、Cookie、密钥、内网地址或用户数据。
- 不由前端推导通过、进度或解锁；以服务端响应为准。
- 不重写 Git 历史，不强推，不清理用户未授权的文件。
- 工作树可能包含他人改动；只处理任务范围内文件。
- 完成一个阶段后停止，未经用户明确授权不得自动开始下一阶段。
