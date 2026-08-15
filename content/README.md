# 正式内容源资产

当前发布版本为 `ACCOUNTING_2026.08.10`：

- `releases/`：正式发布清单；
- `maps/`：三世界入口和核算连续地图骨架；
- `routes/accounting/`：跨模块核算基础、股票、固定收益、期货、估值对账与信息披露、普通货币基金、券结基金、FOF、ETF 共 48 条正式路线；
- `rubrics/accounting/`：所有路线固定使用概念 25、处理步骤 30、风险意识 25、表达规范 20，75 分通过，并含两项业务硬性必达；
- `references/`：业务来源与使用边界。

ACCOUNTING 正式开放；CLEARING、SUPERVISION 仅为 BUILDING，不含虚假路线或进度。普通货币基金包含 5 条 REQUIRED 连续主链；券结基金包含 4 条 REQUIRED 连续主链，普通证券交收路线同时依赖已发布股票买卖基础；FOF 包含 5 条 REQUIRED 连续主链；ETF 包含 4 条 REQUIRED 连续主链并以股票买卖基础作为首条路线前置。四模块均不设阶段闸门；货币基金进阶、券结复杂扩展、FOF 特殊主题及 ETF 联接/跨市场/跨境/公司行为等扩展不进入当前发布。ADVANCED 不计入必修进度分母。

旧 `content/demo` 案例和独立知识问答资产已退出运行时。运行 `scripts/validate-content.ps1` 校验 Schema、稳定 ID、版本、引用和发布关系。
