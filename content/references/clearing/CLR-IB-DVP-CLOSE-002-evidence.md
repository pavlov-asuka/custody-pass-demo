# CLR-IB-DVP-CLOSE-002 原材料—教学证据映射

## 1. 路线范围与唯一前置

本路线唯一前置为 `CLR-IB-INSTRUCTION-001`。前置路线已经完成正常结算指令匹配并形成 `CONFIRMED_FOR_SETTLEMENT`；本路线承接同一业务键和方向、独立结算合同键，继续完成：

`结算合同 → 债券账户 / DVP 资金账户 → 外部 DVP 交割结果 → 内部结算台账 → 零差对账 → 本案例日终关闭`

本路线采用买方视角：收到债券、支付结算金额。公开资料包不使用真实客户、真实账户号码、凭据、内网地址或生产数据。结算金额直接承接合同输入，不重算净价、全价、应计利息或费用。

## 2. 原材料定位和时效边界

| 材料代码 | 物理文件 | 稳定定位 | 支持的关系 | 不带入本路线 |
| --- | --- | --- | --- | --- |
| `CLR-MAT-IB-CCDC` | `project_materials/新人陪练案例库/清算/银行间/关于发布《中央国债登记结算有限责任公司债券交易结算规则》的通知.docx` | P7、P9-P11、P14 | DVP 同步办理债券与款项；结算合同承接匹配指令；债券面额、结算金额、交割日和结果/账务查询属于同一结算关系 | 历史规则的固定时点、费用、菜单、账户格式和当前状态字典 |
| `CLR-MAT-IB-SHCH` | `project_materials/新人陪练案例库/清算/银行间/关于发布《银行间市场清算所股份有限公司债券登记托管、清算结算业务规则》的公告.docx` | P109、P113-P117、P125-P126 | 债券清算与资金清算组成两腿；债券账户和指定资金结算账户分工；正常情况下足额债券锁定后同步办理资金和债券 | P127 的失败条件、回购流程、截止时点、费用和异常处理 |
| `CLR-MAT-IB-EXAMPLE` | `project_materials/新人陪练案例库/清算/银行间/银行间例题.docx` | P26-P30、P50-P54、T1.R1-T1.R2 | 仅作为 DVP、结算结果和题库口径的审计参照 | 题库中的菜单、费用、自动回款、固定时点和历史答案 |
| `CLR-MAT-IB-INTRO-2026` | `project_materials/新人陪练案例库/清算/银行间/银行间债券结算业务简介2026（1).ppt` | S5、S16、S21、S22、S24、S26 | 可读的机构、账户、系统和交收关系示意 | S21/S22 的 OLE 对象无法按正文可靠读取；S5 与题库表格存在时点冲突，不固化自动回款、截止时刻或状态机 |
| `CLR-IB-INSTRUCTION-001` | `Repository/content/routes/clearing/CLR-IB-INSTRUCTION-001.json` 及其 evidence | 路线步骤、综合资料包、确认结果 | 唯一前置，提供同一业务键、结算日、债券面额、结算金额、DVP 方式、通道和 `CONFIRMED_FOR_SETTLEMENT` | 不在本路线重复前置指令匹配、批准或把确认状态当成交割完成 |

CCDC 与 SHCH 的规则文本属于材料抽象，不作为当前制度核验。题库存在运营时点口径，旧 PPT 存在不可读 OLE 对象和时点冲突；因此本路线不固化 2005/2014 历史规则、截止时刻、自动回款、费用或正式状态机。

## 3. 正常业务对象与字段边界

综合 B 的资料包由六份资料组成：

1. **结算合同**：独立 `contract_id`、前置确认业务键/债券/面额/金额、业务日期、结算日、债券代码、方向、结算机构、结算处理系统、`settlement_method` 和 `channel`。金额由前置确认直接承接。
2. **买方债券账户**：账户角色、教育案例标签、期初面额、收到面额和期末面额。
3. **买方 DVP 资金账户**：账户角色、教育案例标签、期初资金余额、结算付款和期末资金余额。
4. **外部 DVP 交割结果**：合同键、债券代码、收到面额、支付金额、方式、通道、DVP 结果和本案例日终结果。
5. **内部结算台账**：同一合同下的两类账户期初、变动、期末、面额差、金额差和本案例日终结果。
6. **交割与日终对账资料**：合同与外部结果身份、外部/台账差额、两类余额复算差额和本案例结果。

字段分工如下：

- `settlement_method=DVP` 是结算方式；`channel=NON_DIRECT` 是通道。两者必须分别记录，通道不能代替 DVP。
- 买方债券账户的证券腿为 `RECEIVING_SECURITIES_ACCOUNT`；买方 DVP 资金账户的资金腿为 `PAYER_FUNDS_ACCOUNT`。账户标签只用于本案例，不代表账号格式。
- 证券腿使用 `opening_face + received_face = closing_face`；资金腿使用 `opening_cash - settlement_amount = closing_cash`。
- 债券面额采用 4 位小数、容差 `0.0001 CNY_10K`；资金金额采用 2 位小数、容差 `0.01 CNY`。所有案例数量/金额均以 Decimal 字符串提供。
- 外部交割结果、内部台账和账户资料必须在同一合同键下对齐；面额差、金额差和两类余额复算差为零，才可以记录本案例关闭。

## 4. Demo A / Comprehensive B 合成案例政策

两套案例保持相同的字段角色、资料顺序、两条余额公式、跨来源对账和关闭条件，只替换合同键、业务键、日期、债券、面额、金额、账户标签和余额数值。案例参数均标记为 `SYNTHETIC_EDUCATIONAL`、`CASE_POLICY`、`ONLY_THIS_CASE`。

| 项目 | Demo A | Comprehensive B |
| --- | --- | --- |
| 结算合同键 | `SETTLE-CONTRACT-A-317` | `SETTLE-CONTRACT-B-682` |
| 业务日期 / 结算日 | `2026-08-18` / `2026-08-19` | `2026-08-21` / `2026-08-24` |
| 前置确认业务键 / 方向 | `IB-A-20260818-731` / `DELIVER_SECURITIES` | `IB-B-20260821-428` / `DELIVER_SECURITIES` |
| 债券 | `CGB-EDU-2026-A` | `CGB-EDU-2026-B` |
| 承接面额 | `120.0000 CNY_10K` | `185.7500 CNY_10K` |
| 结算金额输入 | `1024560.00 CNY` | `2487650.00 CNY` |
| 债券余额链 | `200.0000 + 120.0000 = 320.0000` | `400.0000 + 185.7500 = 585.7500` |
| 资金余额链 | `3000000.00 - 1024560.00 = 1975440.00` | `6000000.00 - 2487650.00 = 3512350.00` |
| 方式 / 通道 | `DVP / NON_DIRECT` | `DVP / NON_DIRECT` |
| 零差 | 面额 `0.0000`；金额 `0.00` | 面额 `0.0000`；金额 `0.00` |
| 本案例结果 | `DVP_SETTLED`；`EOD_CLOSED` | `DVP_SETTLED`；`EOD_CLOSED` |

`DVP_SETTLED` 和 `EOD_CLOSED` 仅用于这两套正常教育案例。它们不是公开制度状态机，也不携带截止时刻或自动回款含义。

### W6 显示映射依赖（本路线只登记，不改前端）

- `CNY_10K` 显示为“万元”，`CNY` 显示为“元”；`NON_DIRECT` 显示为“非直联”。
- `CCDC` 显示为“中央国债登记结算有限责任公司”，`SHCH` 显示为“银行间市场清算所股份有限公司”。
- `DELIVER_SECURITIES`、证券/资金账户角色、机构代码、系统名和通道枚举只保留为提交与评分键，不能直接落成学员看到的业务资料标识；账户角色应映射为业务中文。

## 5. WorkItem 四向映射

`content/evidence/clearing/ib-dvp-close/CLR-IB-DVP-CLOSE-002-evidence.json` 的 `atomicWorkItems` 为综合 B 每个 workItem 提供且仅提供一条 `source/reference/rule/remediation` 映射：

基础练习将原 ORDERING 题改为 `CLR-IB-DVP-Q-05` 短文本微任务；综合实务保留 `clr-ib-dvp-b-conclusion` 短结论，表达 remediation 指向该基础 `SHORT_TEXT`，本路线共 2 个 `SHORT_TEXT`。

| workItem | 类型 | source | reference | rule | remediation |
| --- | --- | --- | --- | --- | --- |
| `clr-ib-dvp-b-field-contract` | `FIELD_MAP` | 独立合同键、前置确认业务键/债券/面额/金额、机构/系统、方式/通道 | `CLR-IB-DVP-REF-INSTRUCTION`、`CLR-IB-DVP-REF-CCDC` | `CLR-IB-DVP-RULE-CONTRACT-INHERIT` | `CLR-IB-DVP-SOURCES` |
| `clr-ib-dvp-b-field-accounts-method` | `FIELD_MAP` | 债券账户、DVP 资金账户、结算合同 | `CLR-IB-DVP-REF-CCDC`、`CLR-IB-DVP-REF-SHCH` | `CLR-IB-DVP-RULE-ACCOUNT-ROLES` | `CLR-IB-DVP-SOURCES` |
| `clr-ib-dvp-b-bond-balance` | `CALCULATION` | 债券账户与内部台账面额字段 | `CLR-IB-DVP-REF-CCDC`、`CLR-IB-DVP-REF-CASE` | `CLR-IB-DVP-RULE-BOND-BALANCE` | `CLR-IB-DVP-DECIMAL` |
| `clr-ib-dvp-b-cash-balance` | `CALCULATION` | DVP 资金账户、结算合同和内部台账金额字段 | `CLR-IB-DVP-REF-CCDC`、`CLR-IB-DVP-REF-SHCH`、`CLR-IB-DVP-REF-CASE` | `CLR-IB-DVP-RULE-CASH-BALANCE` | `CLR-IB-DVP-DECIMAL` |
| `clr-ib-dvp-b-delivery-workpaper` | `LEDGER_ENTRY` | 合同、两类账户、外部结果、内部台账 | `CLR-IB-DVP-REF-INSTRUCTION`、`CLR-IB-DVP-REF-CCDC`、`CLR-IB-DVP-REF-SHCH`、`CLR-IB-DVP-REF-CASE` | `CLR-IB-DVP-RULE-CROSS-SOURCE` | `CLR-IB-DVP-LEDGER` |
| `clr-ib-dvp-b-contract-result-match` | `RECONCILIATION` | 合同、外部结果、对账资料 | `CLR-IB-DVP-REF-CCDC`、`CLR-IB-DVP-REF-SHCH`、`CLR-IB-DVP-REF-CASE` | `CLR-IB-DVP-RULE-CROSS-SOURCE` | `CLR-IB-DVP-RECON` |
| `clr-ib-dvp-b-ledger-match` | `RECONCILIATION` | 两类账户与内部台账 | `CLR-IB-DVP-REF-CCDC`、`CLR-IB-DVP-REF-SHCH`、`CLR-IB-DVP-REF-CASE` | `CLR-IB-DVP-RULE-CROSS-SOURCE` | `CLR-IB-DVP-RECON` |
| `clr-ib-dvp-b-zero-difference` | `RECONCILIATION` | 外部结果、内部台账、对账资料差额 | `CLR-IB-DVP-REF-BASE`、`CLR-IB-DVP-REF-CCDC`、`CLR-IB-DVP-REF-CASE` | `CLR-IB-DVP-RULE-ZERO-DIFFERENCE` | `CLR-IB-DVP-RECON` |
| `clr-ib-dvp-b-close-result` | `RECONCILIATION` | 外部结果、内部台账、对账资料结果 | `CLR-IB-DVP-REF-CCDC`、`CLR-IB-DVP-REF-SHCH`、`CLR-IB-DVP-REF-CASE` | `CLR-IB-DVP-RULE-EOD-CLOSE` | `CLR-IB-DVP-CLOSE` |
| `clr-ib-dvp-b-conclusion` | `SHORT_TEXT` | 六份综合 B 资料的身份、余额、零差和结果字段 | `CLR-IB-DVP-REF-INSTRUCTION`、`CLR-IB-DVP-REF-CCDC`、`CLR-IB-DVP-REF-CASE` | `CLR-IB-DVP-RULE-CONCLUSION` | `CLR-IB-DVP-CONCLUSION` |

Rubric 的 `referenceAnswer`、每条 criterion/mandatory 的 `evidenceRules` 与上述 workItem、rule、remediationTargetId 使用同一组 ID；公开 route 不放入 Rubric 评分细节。

## 6. Rubric、硬达和补学

Rubric 固定为 `CONCEPT 25 / PROCESS 30 / RISK 25 / EXPRESSION 20`，总分 100，75 分通过。两个硬达为：

1. `M-CLR-IB-DVP-TWO-LEGS-CLOSED`：证券腿和资金腿必须同时记录；外部 DVP 结果与内部台账均须为本案例 `DVP_SETTLED`，并分别保留债券账户与 DVP 资金账户。
2. `M-CLR-IB-DVP-ZERO-DIFF-CLOSE`：合同、账户、外部结果和内部台账身份一致，面额/金额差和两类余额复算差均为零后，才记录本案例 `EOD_CLOSED`。

补学不是直接改状态：命中来源边界、Decimal、交割工作纸或零差勾稽缺口后，回到对应知识卡/正常示范，重做相关基础练习，再用新的结构化综合实务提交。`DVP_SETTLED`、`EOD_CLOSED` 只在本案例答案和证据中使用。

## 7. 不覆盖范围

本路线只制作资料充分的正常买方 DVP 交收链，不制作异常案例。回购保留 `BUILDING`；非 DVP、分销、失败、重付、缺钱、缺券、部分交收、系统故障、接口故障、应急、截止时点和自动回款均为 `DEFER` 或材料时效边界。路线不计算净价、全价、应计利息、费用、资金头寸、会计分录或估值，不写实际账号格式，也不登记地图/发布清单。
