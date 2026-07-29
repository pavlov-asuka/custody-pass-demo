# 阶段2后端架构

系统保持单一 Spring Boot 应用、同源 Cookie 会话和关系型数据库。正式内容从 `content/` 经 Maven 打包到只读 classpath，运行时由 `FormalContentCatalog` 加载；公开 API 只投影安全字段。

业务链路为：

`三世界 → 核算地图 → 路线概览 → 四环节顺序学习 → 不可变正式作答 → 异步评分 → 通过或定向补学 → 完整异常案例重试 → 历史记录`

数据库保留 `app_user`，V3 删除旧 `training_record` 后创建环节进度、基础练习、草稿、正式作答、评分结果、补学计划和补学目标表。路线通过和解锁由后端依据历史评分结果及前置关系推导，不存可任意修改的“已通过”真值。

正式作答与评分结果分离。提交先保存答案、内容和 Rubric 快照，再异步评分；查询不触发重新评分。技术失败是 attempt 的 `FAILED`，可对原 attempt 重试；业务未达标是 `COMPLETED + LEARNED_NOT_MASTERED`。Mock 使用确定性证据命中，模型适配器只返回结构化证据判断，分数、硬门槛和结论均由 Java 裁决。

状态边界：

- 路线：`LOCKED / NOT_STARTED / IN_PROGRESS / LEARNED_NOT_MASTERED / PASSED`
- 评分处理：`SCORING / COMPLETED / FAILED`
- 历史结论：`PASSED / LEARNED_NOT_MASTERED`

评分中从不成为路线状态。已通过路线后续复习低分，只新增一条未达标历史，不撤销当前 `PASSED`。
