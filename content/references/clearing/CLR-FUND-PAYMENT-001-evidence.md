# CLR-FUND-PAYMENT-001 原材料—教学证据映射

## 1. 原材料定位

| 材料定位 | 支持的业务关系 | 正式承载 |
| --- | --- | --- |
| `资金/托管资金结算业务介绍202608.pptx` S7、S10、S13；嵌入 `Document1.docx` P8、P12-P14 | 资金支付、指令审核、业务依据/账户核对、执行结果登记、资金账与对账之间存在连续关系；账户状态与锁定属于审核字段 | 知识卡 1—3、示范步骤 1—5、Q1—Q4、综合B来源与结果链 |
| `资金/资金例题.docx` P7-P10、P64-P68、P76-P80 | 清算审核需要区分业务字段；支付渠道是需要核对的字段；日终台账与对账资料要分别核对 | 知识卡 1—3、Q1、Q4、综合B勾稽字段 |
| `资金/托管业务应急预案介绍202608.pptx` S3-S8、S9-S13；嵌入 `Document1.docx` P31-P35、P86-P95 | 仅用于确认应急场景、系统中断、替代手段和远程处理不属于本条正常支付主链 | 私有 evidence 的排除边界；不进入题面、答案或评分规则 |

以上材料只用于抽象“指令/业务依据—账户与批准字段—执行结果—资金账—对账”的业务关系。没有把历史金额阈值、具体截止时刻、厂商菜单、真实账户名称、真实客户或应急处置写入本路线。

## 2. 业务对象与来源边界

本路线的公开对象是一笔正常资金支付记录，至少保留：

- 支付业务键、业务日期和支付日期；
- 业务依据编号、依据状态和批准业务类型；
- 付款账户、收款账户、账户状态与锁定字段；
- 批准渠道、执行渠道、执行结果和资金账状态；
- 批准支付金额、执行金额、资金账支付变动、openingCash、closingCash；
- 批准—执行差、执行—资金账差、现金余额差和正常对账状态；
- 唯一执行控制，确保同一业务键只形成一条正常执行结果记录。

审核字段必须先在指令、业务依据和执行确认之间对应，再把结果登记到资金账。资金账不替代业务依据，执行状态也不替代批准状态。

## 3. 合成案例政策

Demo A 与 Comprehensive B 共享来源角色、审核字段、金额关系、结果登记和勾稽规则，但使用不同业务键、日期、账户标识、渠道和金额：

| 案例 | 身份与控制 | 现金链 | 金额链与结果 |
| --- | --- | --- | --- |
| Demo A | `FUND-A-20260819-071` / `2026-08-19` / `BASIS-A-20260819-071` / `PAY-ACCT-A-001` → `REC-ACCT-A-001` / `CASE_APPROVED_CHANNEL_A` | `125000.00 - 26840.50 = 98159.50 CNY` | 批准=`26840.50`、执行=`26840.50`、资金账变动=`26840.50`；执行=`EXECUTED`、入账=`POSTED`、对账=`RECONCILED` |
| Comprehensive B | `FUND-B-20260822-184` / `2026-08-22` / `BASIS-B-20260822-184` / `PAY-ACCT-B-002` → `REC-ACCT-B-002` / `CASE_APPROVED_CHANNEL_B` | `210000.00 - 41725.80 = 168274.20 CNY` | 批准=`41725.80`、执行=`41725.80`、资金账变动=`41725.80`；执行=`EXECUTED`、入账=`POSTED`、对账=`RECONCILED` |

两组数字、日期、业务键、账户标识、渠道和状态均标记为 `SYNTHETIC_EDUCATIONAL`、`CASE_POLICY`、`ONLY_THIS_CASE`，只用于本路线。材料支持的是审核与结果关系，不能据此推导其他支付渠道的永久门槛或操作时点。金额按两位小数保存，容差为 `0.01`。

## 4. 私有映射入口

`content/evidence/clearing/fund-payment/CLR-FUND-PAYMENT-001-evidence.json` 的 `atomicWorkItems` 为综合B每个 workItem 提供唯一的 `source`、`reference`、`rule` 和 `remediation` 映射：

| workItem | source | reference | rule | remediation |
| --- | --- | --- | --- | --- |
| `clr-fund-b-source-fields` | 五类资料的业务键、日期、金额和结果字段 | 支付流程与对账关系抽象 | `CLR-FUND-RULE-SOURCE-MAP` | `CLR-FUND-PAYMENT-SOURCES` |
| `clr-fund-b-approval-controls` | 指令、依据和执行确认的账户/锁定/日期/渠道字段 | 审核与支付渠道抽象 | `CLR-FUND-RULE-APPROVAL-CONTROLS` | `CLR-FUND-PAYMENT-CONTROLS` |
| `clr-fund-b-closing-cash` | 资金账 openingCash、批准金额和 closingCash | 案例现金链 | `CLR-FUND-RULE-CASH-BALANCE` | `CLR-FUND-PAYMENT-CASH-CALC` |
| `clr-fund-b-amount-chain` | 指令批准金额、执行确认执行金额 | 批准—执行第一处金额差 | `CLR-FUND-RULE-AMOUNT-CHAIN` | `CLR-FUND-PAYMENT-APPROVED-EXECUTED` |
| `clr-fund-b-amount-recon` | 执行确认执行金额、资金账支付变动 | 执行—资金账第二处金额差 | `CLR-FUND-RULE-EXECUTED-LEDGER-AMOUNT` | `CLR-FUND-PAYMENT-EXECUTED-LEDGER` |
| `clr-fund-b-execution-ledger` | 执行确认与资金账的结果字段 | 结果登记抽象 | `CLR-FUND-RULE-RESULT-LEDGER` | `CLR-FUND-PAYMENT-LEDGER` |
| `clr-fund-b-identity-recon` | 指令、依据、执行和对账的身份/控制字段 | 跨来源审核勾稽抽象 | `CLR-FUND-RULE-IDENTITY-RECON` | `CLR-FUND-PAYMENT-CONTROLS` |
| `clr-fund-b-cash-recon` | 资金账余额与对账差额 | 案例余额链 | `CLR-FUND-RULE-CASH-RECON` | `CLR-FUND-PAYMENT-RECON` |
| `clr-fund-b-conclusion` | 身份、控制、金额、余额、状态和差额 | 案例结论规则 | `CLR-FUND-RULE-CONCLUSION` | `CLR-FUND-PAYMENT-CONCLUSION` |

Rubric 的 `referenceAnswer`、`evidenceRules` 与 `remediationTargets` 使用同一组 workItem、rule 和 target ID；答案与补学映射不进入公开 route 的 reference 描述。

## 5. 不覆盖范围与依赖

本路线只覆盖 `CLR-BASE-001` 之后的正常资金支付审核、执行结果登记和资金账承接，不制作支付失败、重付、余额不足、应急、系统中断、替代渠道、历史阈值/截止时点、厂商菜单或具体会计分录。唯一前置为 `CLR-BASE-001`，不读取其他世界的路线状态；本路线不登记地图或发布清单。
