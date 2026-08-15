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
- 不自行扩展业务条线、路线或正式内容。阶段 5 跨模块核算基础 4 条、股票模块 8 条、固定收益模块 9 条、期货模块 4 条、估值对账与信息披露模块 5 条、普通货币基金模块 5 条、券结基金模块 4 条、FOF 模块 5 条和 ETF 模块 4 条路线已经按明确授权完成，统一发布为 `ACCOUNTING_2026.08.10`。ETF 收口为 4 条 REQUIRED 连续主链，不设阶段闸门；联接、跨市场、跨境、互认/集中申购、券结 ETF 增量、公司行为和商品类 ETF 继续 BUILDING/DEFER。资产模块均以前置“每日核算与结果闭环”为准，“合同终止、清盘与退出”不阻挡资产模块。本批完成后停止，未经明确授权不得启动其他模块。
- 不修改接口、评分语义、数据模型或内容 Schema，除非任务明确授权。
- 学员可见文字采用“业务对象 + 具体动作 + 可核对结果”；禁止用“能力未体现、继续进步、一步一步来”等泛化话术替代字段、金额、状态或勾稽反馈。非业务型内部 ID、活动枚举和状态码只能通过显示映射呈现，提交值和私有评分键不得改写。
- 当前多邻国式桌面视觉、小托资产、地图、布局和交互基线已冻结；文字治理不得顺手修改 `frontend/DESIGN.md`、样式、视觉资产或路线拓扑。

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
py -3 .\scripts\verify-text-humanization.py
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
