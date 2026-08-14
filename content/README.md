# 正式内容源资产

当前发布版本为 `ACCOUNTING_2026.08.9`：

- `releases/`：正式发布清单；
- `maps/`：三世界入口和核算连续地图骨架；
- `routes/accounting/`：跨模块核算基础、股票、固定收益、期货、估值对账与信息披露、普通货币基金、券结基金、FOF 共 44 条正式路线；
- `rubrics/accounting/`：所有路线固定使用概念 25、处理步骤 30、风险意识 25、表达规范 20，75 分通过，并含两项业务硬性必达；
- `references/`：业务来源与使用边界。

ACCOUNTING 正式开放；CLEARING、SUPERVISION 仅为 BUILDING，不含虚假路线或进度。普通货币基金包含 5 条 REQUIRED 连续主链；券结基金包含 4 条 REQUIRED 连续主链，普通证券交收路线同时依赖已发布股票买卖基础；FOF 包含 5 条 REQUIRED 连续主链。三模块均不设阶段闸门；货币基金进阶、券结复杂扩展，以及 FOF 互认/跨境、特殊合同和受控人工处理不进入当前发布。ADVANCED 不计入必修进度分母。

旧 `content/demo` 案例和独立知识问答资产已退出运行时。运行 `scripts/validate-content.ps1` 校验 Schema、稳定 ID、版本、引用和发布关系。
