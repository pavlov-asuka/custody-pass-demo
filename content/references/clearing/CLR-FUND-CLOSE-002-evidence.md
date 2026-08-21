# CLR-FUND-CLOSE-002 原材料—多来源余额核对教学证据映射

## 1. 原材料定位

| 材料定位 | 支持的业务关系 | 正式承载 |
| --- | --- | --- |
| 清算/资金/托管资金结算业务介绍202608.pptx S7、S10、S13 | 资金日常工作包含支付结果承接、资金账登记、资金账户核对、日终资金对账封账和资金账户报告发送；流程材料同时区分指令处理与结果登记 | 知识卡 1—3、示范步骤 1—5、Q1—Q5、综合B来源与关闭结果 |
| 清算/资金/资金例题.docx P7-P10、P43-P56、P64-P68 | 资金账户、收支/余额、结算字段和对账资料需要分别识读；题目中出现的历史账户、比例、时点和系统选项不作为本路线参数 | 知识卡 1—2、Q1—Q4、综合B字段与 Decimal 工作纸 |
| 清算/资金/托管业务应急预案介绍202608.pptx S3-S8、S9-S13 | 只用于确认应急运行、系统中断、替代处理和远程处理是另行边界，不进入资料齐全、余额一致的正常日终案例 | 私有 evidence 的排除边界，不进入题面、答案或评分条件 |

以上材料只支持“已执行结果—资金账户/内部资金账—外部对账资料—正常关闭/报告发送”的业务关系。本路线不复用真实账户号、客户资料、厂商菜单、固定截止时刻、历史阈值或会计凭证教学。

## 2. 业务对象与来源边界

本路线承接唯一前置 CLR-FUND-PAYMENT-001 的正常已执行并已入账结果，不重新审核付款指令或选择支付渠道。综合B公开资料包包含：

- 已执行结果：关闭业务键、已执行结果键、账户、业务日期、流入、流出、EXECUTED、POSTED、REGISTERED；
- 资金账户：openingBalance、inflow、outflow、closingBalance；
- 内部资金账：同一账户和日期的余额链、账状态与关闭候选状态；
- 三类外部资料：CCBS、CCDC DVP、上海清算DVP 各自独立出现账户、日期、外部期末余额、与内部余额差和 RECONCILED 状态；
- 正常关闭输出：在结构化工作纸中登记关闭业务键、账户、余额、来源状态、逐项差额、NORMAL_CLOSED 和 SENT；这些派生结果由私有规则和答案承载，不冒充来源字段。

每个来源分别出现账户和余额关系。关闭必须满足：

openingBalance + inflow - outflow = closingBalance

并且资金账户差、内部资金账差、CCBS 差、CCDC DVP 差、上海清算 DVP 差以及总差额均为 0.00（金额两位小数，容差 0.01）；三类外部来源全部 RECONCILED 后，才可登记 NORMAL_CLOSED 和 SENT。

## 3. 合成案例政策

Demo A 与 Comprehensive B 共享来源角色、余额公式、逐来源勾稽和关闭结果结构，但使用不同日期、关闭业务键、已执行结果键、账户标识、余额和收支金额：

| 案例 | 业务身份 | Decimal 余额链 | 来源与结果 |
| --- | --- | --- | --- |
| Demo A | FUND-CLOSE-A-20260823-052 / 2026-08-23 / FUND-ACCT-A-101 | 300000.00 + 54000.00 - 78500.00 = 275500.00 CNY | 资金账户、内部资金账、CCBS、CCDC DVP、上海清算DVP均为275500.00；各项差额0.00；NORMAL_CLOSED / SENT |
| Comprehensive B | FUND-CLOSE-B-20260826-089 / 2026-08-26 / FUND-ACCT-B-204 | 480000.00 + 92500.00 - 136750.00 = 435750.00 CNY | 资金账户、内部资金账、CCBS、CCDC DVP、上海清算DVP均为435750.00；各项差额0.00；NORMAL_CLOSED / SENT |

两组日期、业务键、账户标识、金额和状态均标记为 SYNTHETIC_EDUCATIONAL、CASE_POLICY、ONLY_THIS_CASE，只用于本路线的正常迁移案例。CCBS、CCDC DVP 和上海清算DVP 是本案例外部来源类型，不写成永久系统枚举或适用于所有业务的固定来源清单。

## 4. 私有映射入口

content/evidence/clearing/fund-close/CLR-FUND-CLOSE-002-evidence.json 的 atomicWorkItems 为综合B每个 workItem 提供唯一的 source、reference、rule 和 remediation 映射：

| workItem | source | reference | rule | remediation |
| --- | --- | --- | --- | --- |
| clr-fund-close-b-source-map | 已执行结果、资金账户、内部资金账和三类外部资料的业务键、余额和状态字段 | 资金流程、字段识读和外部来源抽象 | CLR-FUND-CLOSE-RULE-SOURCE-MAP | CLR-FUND-CLOSE-SOURCES |
| clr-fund-close-b-balance-calculation | 已执行收支、资金账户 opening/inflow/outflow/closing 和内部账余额 | 正常日终余额公式 | CLR-FUND-CLOSE-RULE-BALANCE-CALC | CLR-FUND-CLOSE-BALANCE |
| clr-fund-close-b-result-ledger | 已执行状态、资金账户/内部账结果、三类外部来源状态和关闭输出 | 正常结果工作纸抽象 | CLR-FUND-CLOSE-RULE-RESULT-LEDGER | CLR-FUND-CLOSE-RESULT |
| clr-fund-close-b-identity-reconciliation | 六份资料的关闭业务键、账户、日期和来源类型 | 账户/日期/来源身份勾稽 | CLR-FUND-CLOSE-RULE-IDENTITY-RECON | CLR-FUND-CLOSE-RECONCILIATION |
| clr-fund-close-b-fund-account-difference | 资金账户 opening/inflow/outflow/closing | 资金账户与理论余额差 | CLR-FUND-CLOSE-RULE-FUND-ACCOUNT-DIFFERENCE | CLR-FUND-CLOSE-FUND-ACCOUNT-DIFF |
| clr-fund-close-b-internal-ledger-difference | 资金账户 closing 与内部资金账 ledger_closing | 内部资金账与资金账户差 | CLR-FUND-CLOSE-RULE-INTERNAL-LEDGER-DIFFERENCE | CLR-FUND-CLOSE-INTERNAL-LEDGER-DIFF |
| clr-fund-close-b-ccbs-difference | 资金账户 closing 与 CCBS external_closing | CCBS 来源差 | CLR-FUND-CLOSE-RULE-CCBS-DIFFERENCE | CLR-FUND-CLOSE-CCBS-DIFF |
| clr-fund-close-b-ccdc-dvp-difference | 资金账户 closing 与 CCDC DVP external_closing | CCDC DVP 来源差 | CLR-FUND-CLOSE-RULE-CCDC-DVP-DIFFERENCE | CLR-FUND-CLOSE-CCDC-DVP-DIFF |
| clr-fund-close-b-shanghai-dvp-difference | 资金账户 closing 与上海清算DVP external_closing | 上海清算DVP 来源差 | CLR-FUND-CLOSE-RULE-SHANGHAI-DVP-DIFFERENCE | CLR-FUND-CLOSE-SHANGHAI-DVP-DIFF |
| clr-fund-close-b-total-difference | 五项独立差额的结果值 | 五项独立差额汇总为总差额 | CLR-FUND-CLOSE-RULE-ZERO-DIFFERENCE | CLR-FUND-CLOSE-TOTAL-DIFF |
| clr-fund-close-b-close-gate | 前置状态、账户/账状态、三类外部 RECONCILED、差额和关闭/报告状态 | 正常关闭前置抽象 | CLR-FUND-CLOSE-RULE-CLOSE-GATE | CLR-FUND-CLOSE-GATE |
| clr-fund-close-b-conclusion | 业务键、账户、余额公式、五类差额、外部来源状态和两个输出状态 | 可追溯正常关闭结论 | CLR-FUND-CLOSE-RULE-CONCLUSION | CLR-FUND-CLOSE-CONCLUSION |

Rubric 的 referenceAnswer、evidenceRules 与 remediationTargets 使用同一组 workItem、rule 和 target ID；答案与补学映射不进入公开 route。

## 5. 不覆盖范围与依赖

本路线只覆盖资料齐全、余额一致、正常已执行结果已承接的资金日终关闭。失败、重付、余额不足、应急、系统中断、无依据调账、异常差额、人工强制关闭、真实账户号、固定截止时刻、厂商菜单和会计凭证均不进入本路线题面。唯一前置为 CLR-FUND-PAYMENT-001，不登记地图或发布清单。
