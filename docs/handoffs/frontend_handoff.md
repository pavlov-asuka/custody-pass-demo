# 前端交接入口

阶段2正式后端交接以 [kimi-k3-backend-phase2.md](kimi-k3-backend-phase2.md) 为唯一当前事实源。

阶段1的 `/api/cases`、`/api/knowledge/*`、同步评分返回和占位训练记录已经移除，不能保留兼容调用。前端必须从 `contracts/openapi.yaml` 和 `contracts/examples/` 生成或手写新客户端，不得自行计算路线状态、进度、解锁、总分、硬性必达或通过结论。
