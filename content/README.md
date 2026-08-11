# 正式内容源资产

当前发布版本为 `ACCOUNTING_2026.08.3`：

- `releases/`：正式发布清单；
- `maps/`：三世界入口和核算连续地图骨架；
- `routes/accounting/`：跨模块核算基础与股票核算业务共 12 条正式路线；
- `rubrics/accounting/`：所有路线固定使用概念 25、处理步骤 30、风险意识 25、表达规范 20，75 分通过，并含两项业务硬性必达；
- `references/`：业务来源与使用边界。

ACCOUNTING 正式开放；CLEARING、SUPERVISION 仅为 BUILDING，不含虚假路线或进度。跨模块基础包含 4 条 REQUIRED 路线，其中“合同终止、清盘与退出”不作为资产模块前置；股票模块包含 4 条 REQUIRED 主链和 4 条 ADVANCED 支线，股票首条路线以前置“每日核算与结果闭环”为准。ADVANCED 不计入必修进度分母。

旧 `content/demo` 案例和独立知识问答资产已退出运行时。运行 `scripts/validate-content.ps1` 校验 Schema、稳定 ID、版本、引用和发布关系。
