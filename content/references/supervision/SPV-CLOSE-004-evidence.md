# SPV-CLOSE-004 原材料—教学证据映射

- evidenceId: SPV-EVID-CLOSE-004
- version: 1.0.0
- provenance: SYNTHETIC_EDUCATIONAL
- scope: ONLY_THIS_CASE
- 本索引只服务“结果确认、期限豁免、提示函、回函与归档闭环”。结果键、规则键、日期、比例和状态均为 SYNTHETIC_EDUCATIONAL / ONLY_THIS_CASE，不代表生产对象、收件人、发送状态或权限。
- 原材料保持只读。本索引只保留已审计文本对象定位，不纳入图片、截图、图像元数据、绝对路径或真实身份信息。

## 1. 原材料定位

| sourceId | 已审计定位 | 本路线使用 |
| --- | --- | --- |
| M01 | §4.4、§4.5、§6 | 结果确认、提示函生成、回函/附件记录、豁免截止日和归档语义的材料抽象 |
| M11 | §4.4—4.5/归档语义 | 独立核对确认/豁免分支、登记字段和归档动作 |

上述定位只用于文本对象教学抽象。未由 M01/M11 支持的真实收件人、发送成功代码、监管报送、整改、赔偿、技术失败补救和其他处置不进入本路线。

## 2. 两套同构教学案例与分支

| 案例 | 结果键 / 规则键 | 数据日 / 异常开始日 | 比例（教学值） |
| --- | --- | --- | --- |
| Demo A | EDU-RESULT-A-001 / EDU-RULE-A-001 | 2026-01-06 / 2026-01-06 | 4/100=4% |
| Comprehensive B | EDU-RESULT-B-002 / EDU-RULE-B-002 | 2026-02-06 / 2026-02-06 | 3/100=3% |

确认分支固定为：

`待确认 → 确认异常 → 待生成/待记录 → B复核 → A生成 → 已生成 → 次日上午检查发送状态 → 记录管理人反馈/附件 → 归档`

豁免分支固定为：

`待确认 → 本轮豁免 → 合成豁免截止日 → 不生成提示函 → 归档`

A/B 使用不同结果键、规则键、日期和比例，但两条分支的资料角色、字段结构和证据要求同构。两组均为 SYNTHETIC_EDUCATIONAL / ONLY_THIS_CASE。已生成 != 已发送。

## 3. 可核对关系

- 结果确认/豁免工作表先提供结果键、规则键、数据日、异常开始日和两条分支状态链；提示函—回函—归档登记表承接回函记录、附件标记和归档类别。
- 确认分支必须记录待确认、确认异常、待生成/待记录、B复核、A生成、已生成、次日上午检查发送状态、记录管理人反馈/附件和归档，并留下回函记录=已记录、附件标记=已标记、归档类别=确认分支。
- 豁免分支必须记录本轮豁免、合成豁免截止日、不生成提示函和归档类别=豁免分支；截止日是合成教学日期，不是永久豁免。
- 已生成 != 已发送；本路线只记录次日上午检查发送状态，不填写发送成功代码或真实收件人。业务异常不是技术故障。

## 4. 综合 B 原子工作项映射

| workItem | 来源字段 | 材料定位 | Rubric / 补学 |
| --- | --- | --- | --- |
| spv-close-b-source-map | 工作表 result_key、rule_key、data_date、anomaly_start_date；登记表分支与归档字段 | M01 §4.4、§4.5；M11 §4.4—4.5/归档语义 | B_TWO_SOURCE_ROLES_MATCH；C-SPV-CLOSE-SOURCE-ROLES；SPV-CLOSE-SOURCES；Q1 |
| spv-close-b-confirmation-branch | 两份资料的确认分支状态链 | M01 §4.4、§4.5、§6；M11 §4.4—4.5/归档语义 | B_CONFIRMATION_BRANCH_COMPLETE；P/M-SPV-CLOSE-CONFIRMATION；SPV-CLOSE-CONFIRMATION；Q2 |
| spv-close-b-exemption-branch | 两份资料的豁免状态、合成豁免截止日、不生成提示函和归档类别 | M01 §4.4、§4.5、§6；M11 §4.4—4.5/归档语义 | B_EXEMPTION_BRANCH_COMPLETE；C/P/M-SPV-CLOSE-EXEMPTION；SPV-CLOSE-EXEMPTION；Q3 |
| spv-close-b-generated-status | 登记表 generated_status、send_status_check、generated_boundary | M01 §4.5、§6；M11 §4.5/归档语义 | B_GENERATED_NOT_SENT；R/M-SPV-CLOSE-GENERATED；SPV-CLOSE-GENERATED-BOUNDARY；Q2 |
| spv-close-b-register | 两份资料的键、日期、确认回函/附件/归档和豁免截止日/提示函/归档字段 | M01 §4.4、§4.5、§6；M11 §4.4—4.5/归档语义 | 状态链、回函字段和归档类别 CONTAINS_ALL；P/R/M-SPV-CLOSE-REGISTER；SPV-CLOSE-REGISTER；Q4 |
| spv-close-b-conclusion | 两份资料全部身份、日期、两条分支和边界字段 | M01 §4.4、§4.5、§6；M11 §4.4—4.5/归档语义 | 短结论 CONTAINS_ALL；R/E/M-SPV-CLOSE；SPV-CLOSE-CONCLUSION；Q5 |

每个 workItem 均在私有 JSON 中绑定 source、材料定位、reference、确定性 rule、Rubric criterion/mandatory 和 remediation；公开 route 不呈现综合参考答案或 Rubric。

## 5. 边界与延期

- 确认分支的已生成状态绝不解释成已发送；只保留次日上午检查发送状态、回函记录、附件标记和归档类别。
- 确认分支必须有回函记录=已记录、附件标记=已标记和归档类别=确认分支；豁免分支必须有合成豁免截止日、不生成提示函和归档类别=豁免分支。
- 不覆盖永久豁免、真实发送成功/失败、真实收件人或邮箱、机构、监管报送、整改、赔偿、技术失败、发送失败补救或其他未给出的处置。
- 不扩展到其他主题的邮件或生产流程，不创建或引用图片、截图、图像路径、原材料绝对路径以及真实凭据或联系人信息。
- 未由 M01/M11 已审计定位支持的内容继续 BUILDING/DEFER；本路线不登记地图、发布清单或生产状态。
