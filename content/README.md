# 正式内容源资产

当前 active 发布版本为 `CUSTODY_2026.08.11`；旧 `ACCOUNTING_2026.08.10` 作为核算发布快照保留：

- `releases/`：正式发布清单；
- `maps/`：三世界入口、核算连续地图和清算长地图；
- `routes/accounting/`：跨模块核算基础、股票、固定收益、期货、估值对账与信息披露、普通货币基金、券结基金、FOF、ETF 共 48 条正式路线；
- `routes/clearing/`：共同清算基础、资金结算、场内清算和银行间清算共 7 条正式路线；
- `rubrics/`：正式路线固定使用概念 25、处理步骤 30、风险意识 25、表达规范 20，75 分通过，并含业务硬性必达；
- `references/`：业务来源与使用边界。

ACCOUNTING 和 CLEARING 正式开放，SUPERVISION 继续 BUILDING。当前发布共 55 条路线，其中 46 条 REQUIRED、9 条 ACCOUNTING ADVANCED；清算 7 条均为 REQUIRED，使用共同基础后进入资金、场内、银行间三条分支，不设阶段闸门。普通货币基金包含 5 条 REQUIRED 连续主链；券结基金包含 4 条 REQUIRED 连续主链，普通证券交收路线同时依赖已发布股票买卖基础；FOF 包含 5 条 REQUIRED 连续主链；ETF 包含 4 条 REQUIRED 连续主链并以股票买卖基础作为首条路线前置。货币基金进阶、券结复杂扩展、FOF 特殊主题及 ETF 联接/跨市场/跨境/公司行为等扩展不进入当前发布。ADVANCED 不计入必修进度分母。

旧 `content/demo` 案例和独立知识问答资产已退出运行时。运行 `scripts/validate-content.ps1` 校验 Schema、稳定 ID、版本、引用和发布关系。
