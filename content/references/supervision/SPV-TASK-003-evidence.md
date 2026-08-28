# SPV-TASK-003 原材料—教学证据映射

- evidenceId: SPV-EVID-TASK-003
- version: 1.0.0
- provenance: SYNTHETIC_EDUCATIONAL
- scope: ONLY_THIS_CASE
- 本索引只服务“每日数据、任务与结果分类”。教学组合键、数据日、比例和状态均为 SYNTHETIC_EDUCATIONAL / ONLY_THIS_CASE，不代表生产导入、系统状态或技术故障。
- 原材料保持只读。本索引只保留已审计文本对象定位，不纳入图片、截图、图像元数据、绝对路径或真实身份信息。

## 1. 原材料定位

| sourceId | 已审计定位 | 本路线使用 |
| --- | --- | --- |
| M01 | §4.3.1、§4.3.2、§4.4 | 每日资料导入、任务完成语义、比例结果、业务结果和确认状态的材料抽象 |
| M11 | §4.3、§4.4 | 独立核对导入→任务→业务结果→确认状态的正常流程和参数复算顺序 |

上述定位只用于文本对象的教学抽象。没有材料支持的任务数量、失败数量、异常编码、外部数据源、监管报告、补偿或技术修复不进入本路线。

## 2. 两套同构正常案例

| 案例 | 教学组合键 / 数据日 | 分子/分母与比例 | 导入→任务→业务结果→确认 |
| --- | --- | --- | --- |
| Demo A | EDU-SPV-A-001 / 2026-01-06 | 4/100=0.0400（4%）< CS_BLXX=5% | 成功 → 已执行完成 → 异常 → 待确认 |
| Comprehensive B | EDU-SPV-B-002 / 2026-02-06 | 3/100=0.0300（3%）< CS_BLXX=5% | 成功 → 已执行完成 → 异常 → 待确认 |

A/B 使用不同教学组合键、数据日和分子/比例数值，但共享两份资料的角色、状态链、计算链和勾稽结构。两组均为 SYNTHETIC_EDUCATIONAL / ONLY_THIS_CASE。业务性异常不等同技术故障，仅是本案例比例分类。

## 3. 可核对关系

- 导入日志读取 teachingKey、dataDate 和 importStatus=成功；任务与结果汇总表按同一教学组合键读取任务已执行完成、B0100002、B0100003、比例、CS_BLXX、业务结果异常和确认状态待确认。
- 公式为 `B0100001 = B0100002 / B0100003`。Demo A：`Decimal('4') / Decimal('100') = 0.0400`（4%）；Comprehensive B：`Decimal('3') / Decimal('100') = 0.0300`（3%）。
- 两组均低于本案例 `CS_BLXX=5%`，因此形成正常监督流程中的业务结果异常，确认状态仍为待确认。
- 执行查询原文语义“正在执行”无额外信息时，本案例按汇总表语义记录已执行完成；不构造执行失败、预检失败或技术修复。

## 4. 综合 B 原子工作项映射

| workItem | 来源字段 | 材料定位 | Rubric / 补学 |
| --- | --- | --- | --- |
| spv-task-b-source-map | 导入日志 teaching_key、data_date、import_status；汇总表 task_status、比例、结果/确认字段 | M01 §4.3.1、§4.3.2；M11 §4.3、§4.4 | B_SOURCE_ROLE_MATCH；C/P/M-SPV-TASK；SPV-TASK-SOURCES；Q1 |
| spv-task-b-import-status | 导入日志 teaching_key、data_date、import_status | M01 §4.3.1；M11 §4.3 | IMPORT_SUCCESS=成功；P/M-SPV-TASK-IMPORT；SPV-TASK-IMPORT；Q3 |
| spv-task-b-ratio | 汇总表 numerator、denominator、ratio_scale、lower_bound | M01 §4.4；M11 §4.4 | Decimal('3')/Decimal('100')=0.0300；P/R/M-SPV-TASK-RATIO；SPV-TASK-RATIO；Q2 |
| spv-task-b-result-status | 汇总表 numerator、denominator、ratio_scale、lower_bound、business_result | M01 §4.4；M11 §4.4 | BUSINESS_RESULT_ANOMALY=异常；C/R/M-SPV-TASK-RESULT；SPV-TASK-RESULT；Q3 |
| spv-task-b-confirmation-status | 汇总表 business_result、confirmation_status | M01 §4.4；M11 §4.4 | PENDING_CONFIRMATION=待确认；R/M-SPV-TASK-CONFIRM；SPV-TASK-CONFIRM；Q3 |
| spv-task-b-workpaper | 两份资料的 teaching_key、data_date、导入/任务/结果/确认状态、分子/分母、比例和案例边界 | M01 §4.3.1、§4.3.2、§4.4；M11 §4.3、§4.4 | 状态链 CONTAINS_ALL；C/P/M-SPV-TASK-WORKPAPER；SPV-TASK-WORKPAPER；Q4 |
| spv-task-b-conclusion | 两份资料全部身份、数据、比例和状态字段 | M01 §4.3.1、§4.3.2、§4.4；M11 §4.3、§4.4 | 短结论 CONTAINS_ALL；R/E/M-SPV-TASK；SPV-TASK-CONCLUSION；Q5 |

每个 workItem 均在私有 JSON 中绑定 source、材料定位、reference、确定性 rule、Rubric criterion/mandatory 和 remediation；公开 route 不呈现综合参考答案或 Rubric。

## 5. 边界与延期

- 允许的正常状态为导入成功、任务已执行完成、业务结果异常、确认状态待确认；不把业务异常写成技术异常。
- `CS_BLXX=5%` 是本案例参数，不是通用法规阈值；比例只用本案例的 4/100 和 3/100 复算。
- 不覆盖真实对象、产品、组合、账户、机构、人员、外部数据源、监管报告、任务数量、失败数量、异常编码、执行失败、预检失败、补偿或技术修复。
- 不创建或引用图片、截图、图像路径、原材料绝对路径以及真实邮箱、凭据或联系人信息。
- 未由 M01/M11 已审计定位支持的内容继续 BUILDING/DEFER；本路线不登记地图、发布清单或生产状态。
