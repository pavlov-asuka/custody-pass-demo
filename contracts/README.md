# 公共契约

`openapi.yaml` 是前后端 HTTP 事实源，版本 `2.0.0`。`schemas/` 是内容发布事实源：

- `release-manifest.schema.json`：发布清单、版本与引用；
- `map.schema.json`：三世界、核算连续地图和前置关系；
- `route.schema.json`：知识卡、正常示范、基础练习、异常案例四环节；
- `rubric.schema.json`：四维评分、硬性必达项、证据要求和补学映射。

`examples/` 中的请求与响应可直接用于前后端联调。正确答案、Rubric、硬性必达项、关键词和参考答案只存在于服务端内容包，任何公共响应都不得下发。`contentVersion` 和 `rubricVersion` 是允许公开的并发/快照版本标识，不包含评分规则。
