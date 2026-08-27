# SPV-RULE-002 原材料—教学证据映射

- evidenceId: SPV-EVID-RULE-002
- version: 1.0.0
- provenance: SYNTHETIC_EDUCATIONAL
- scope: ONLY_THIS_CASE
- 本索引只服务“监督对象启停与规则生效期”。教学组合键、日期和参数均为 SYNTHETIC_EDUCATIONAL / ONLY_THIS_CASE，不代表生产对象、生产关闭日期、系统状态或权限。
- 原材料保持只读。本索引只保留已审计文本对象定位，不纳入图片、截图、图像元数据、绝对路径或真实身份信息。

## 1. 原材料定位

| sourceId | 已审计定位 | 本路线使用 |
| --- | --- | --- |
| M01 | §1.1.2—1.1.3、§4.1.1—4.1.2、§4.2.2 | 对象类型、组合成立/到期信息、启停日期、规则生效期和 N/N-1 参数的材料抽象 |
| M11 | §4.1、§4.2 | 独立核对对象启停窗口、规则配置和参数复算顺序 |

上述定位只用于文本对象的教学抽象。M01/M11 未支持的生产关闭日、交易日历、权限、技术状态和其他通用规则不在本路线范围内。

## 2. 两套同构教学案例

| 案例 | subjectType / 教学组合键 | 启用日 / 数据日 / 默认停用日 | 规则参数 |
| --- | --- | --- | --- |
| Demo A | 资产组合 / EDU-SPV-A-001 | 2026-01-05 / 2026-01-06 / 29991231 | RULE_CONFIGURED；N=10；N-1=9 |
| Comprehensive B | 资产组合 / EDU-SPV-B-002 | 2026-02-05 / 2026-02-06 / 29991231 | RULE_CONFIGURED；N=10；N-1=9 |

A/B 使用不同教学组合键、启用日期和数据日期，但共享“依据表识读 → 配置表对应 → 日期窗口勾稽 → Decimal 复算 → 短结论”的结构。两组均为 SYNTHETIC_EDUCATIONAL / ONLY_THIS_CASE。

## 3. 可核对关系

- 对象类型为资产组合；对象和规则参数按同一 teachingKey 对应。
- 日期关系为 `enableDate ≤ dataDate < stopDate`。Demo A：2026-01-05 ≤ 2026-01-06 < 29991231；Comprehensive B：2026-02-05 ≤ 2026-02-06 < 29991231。
- 规则配置给出 N=10；用 `Decimal('10') - Decimal('1')` 复算 N-1=9。N 与 N-1 分开记录，不引入其他日期算法。
- 29991231 仅为本案例默认停用日期；不得写成生产关闭日期或从中推断交易日历。

## 4. 综合 B 原子工作项映射

| workItem | 来源字段 | 材料定位 | Rubric / 补学 |
| --- | --- | --- | --- |
| spv-rule-b-source-map | 依据表 subject_type、teaching_key、enable_date、data_date、stop_date；配置表 rule_status、adjustment_days_n、adjustment_days_n_minus_1 | M01 §1.1.2—1.1.3、§4.1.1—4.1.2；M11 §4.1、§4.2 | B_SOURCE_ROLE_MATCH；C/P/M-SPV-RULE-SOURCE；SPV-RULE-SOURCES-DATES；Q1 |
| spv-rule-b-date-window | 两份材料 subject_type、teaching_key、enable_date、data_date、stop_date、effective_window | M01 §4.1.1—4.1.2；M11 §4.1 | B_ACTIVE_WINDOW_RECONCILED；C/P/R/M-SPV-RULE-DATE；SPV-RULE-DATE-WINDOW；Q4 |
| spv-rule-b-n-minus-1 | 配置表 adjustment_days_n、adjustment_days_n_minus_1 | M01 §4.2.2；M11 §4.2 | Decimal('10') - Decimal('1')=9；P-SPV-RULE-N-MINUS-1；SPV-RULE-N-MINUS-1；Q2 |
| spv-rule-b-object-period-entry | 两份材料对象、教学组合键、三项日期、rule_status、N 和 N-1 | M01 §1.1.2—1.1.3、§4.1.1—4.1.2、§4.2.2；M11 §4.1、§4.2 | 字段集合 EQUALS/CONTAINS_ALL；C/R/M-SPV-RULE；SPV-RULE-WORKPAPER；Q3 |
| spv-rule-b-conclusion | 两份材料全部对象、日期、窗口和参数字段 | M01 §1.1.2—1.1.3、§4.1.1—4.1.2、§4.2.2；M11 §4.1、§4.2 | 短结论 CONTAINS_ALL；R/E/M-SPV-RULE；SPV-RULE-CONCLUSION；Q5 |

每个 workItem 均在私有 JSON 中绑定 source、材料定位、reference、确定性 rule、Rubric criterion/mandatory 和 remediation；公开 route 不呈现私有答案或 Rubric。

## 5. 边界与延期

- 只使用 enableDate ≤ dataDate < stopDate、默认 stopDate=29991231、N=10 和 N-1=9 这些本案例关系。
- 不覆盖真实对象或产品、真实启停/关闭日期、真实交易日历、QFII/WFOE 流程、T+1/T+2 普遍规则、生产权限、系统技术失败或异常处置。
- 不创建或引用图片、截图、图像路径、原材料绝对路径以及真实机构、账户、人员、邮箱或凭据。
- 未由 M01/M11 已审计定位支持的内容继续 BUILDING/DEFER；本路线不登记地图、发布清单或生产状态。
