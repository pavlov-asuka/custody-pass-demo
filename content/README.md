# 正式内容源资产

当前发布版本为 `ACCOUNTING_2026.08.7`：

- `releases/`：正式发布清单；
- `maps/`：三世界入口和核算连续地图骨架；
- `routes/accounting/`：跨模块核算基础、股票、固定收益、期货、估值对账与信息披露、普通货币基金共 35 条正式路线；
- `rubrics/accounting/`：所有路线固定使用概念 25、处理步骤 30、风险意识 25、表达规范 20，75 分通过，并含两项业务硬性必达；
- `references/`：业务来源与使用边界。

ACCOUNTING 正式开放；CLEARING、SUPERVISION 仅为 BUILDING，不含虚假路线或进度。普通货币基金包含 5 条 REQUIRED 连续主链，以固定收益必修主链为前置，不设阶段闸门；活期存款、回购、交易型货币基金、巨额赎回/负收益和重要货币市场基金不进入当前发布。ADVANCED 不计入必修进度分母。

旧 `content/demo` 案例和独立知识问答资产已退出运行时。运行 `scripts/validate-content.ps1` 校验 Schema、稳定 ID、版本、引用和发布关系。
