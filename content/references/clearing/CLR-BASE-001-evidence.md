# CLR-BASE-001 原材料—教学证据映射

## 1. 原材料定位

| 材料定位 | 支持的共同关系 | 正式承载 |
| --- | --- | --- |
| `资金/托管资金结算业务介绍202608.pptx` S7、S13 | 指令承接、结果登记、台账与对账资料之间存在连续关系；对账按同一业务对象比较预期与结果 | 知识卡 1、示范步骤 1/4/5、Q1/Q3/Q5 |
| `场内/场内业务介绍.pptx` S15、S19、S25、S32 | 清算义务由参与主体承担，交收包含结果转移，资料按交易/结算/结果顺序承接 | 知识卡 2、示范步骤 1/2/4、综合实务来源映射 |
| `银行间/关于发布《中央国债登记结算有限责任公司债券交易结算规则》的通知.docx` P10—P11、P14 | 指令具有业务身份、方向、数量/金额、参与角色和状态；结果资料与账务/对账资料可查询核对 | 知识卡 1—3、示范步骤 2/3/5、Q2/Q3 |
| `资金/资金例题.docx` P6—P7 | 日终台账信息与对账信息需要分别核对，不能用单一结果字段代替对账 | 知识卡 3、示范步骤 5、Q5 |

上述材料仅用于抽象共同字段和资料关系。没有把具体渠道、平台、内部账户、真实机构、固定时点、费率或分支业务规则写入本路线。

## 2. 共同对象与资料边界

本路线的公开对象是 `SETTLEMENT_OBLIGATION`。一笔对象必须至少保留：

- 业务键、业务日期、资产类型、方向；
- 数量、金额及各自单位；
- 交付方、接收方和复核方等参与角色；
- 指令、确认/成交、交收结果和对账资料中的对应状态。

对账只能在业务键、日期和方向对应后进行；数量差按整数精度为 `0`，金额差按两位小数容差 `0.01`。这些精度和容差是 `CLR-BASE-EDU-1.0` 的教育案例参数，不是永久制度。

## 3. 合成案例政策

Demo A（`CLR-BASE-DEMO-A`）与 Comprehensive B（`CLR-BASE-COMP-B`）共享资料角色、字段关系、处理顺序和核对规则，但分别使用不同业务键、日期、数量和金额：

| 案例 | 身份 | 数量链 | 金额链 | 结果链 |
| --- | --- | --- | --- | --- |
| Demo A | `BASE-A-20260818-017` / `2026-08-18` / `RECEIVE` | `12 × 200 = 2400 unit` | `7250.00 + 11500.00 = 18750.00 CNY` | `SETTLED`，数量差 `0`，金额差 `0.00` |
| Comprehensive B | `BASE-B-20260821-284` / `2026-08-21` / `RECEIVE` | `15 × 110 = 1650 unit` | `4800.00 + 7740.00 = 12540.00 CNY` | `SETTLED`，数量差 `0`，金额差 `0.00` |

两组数字、键、日期和状态均标记为 `SYNTHETIC_EDUCATIONAL`、`CASE_POLICY`、`ONLY_THIS_CASE`，只用于本路线。材料支持的是对象关系和资料顺序，不能据此推导其他分支的具体制度参数。

## 4. 私有映射入口

`content/evidence/clearing/base/CLR-BASE-001-evidence.json` 的 `atomicWorkItems` 对综合 B 的每个 workItem 提供唯一映射：

| workItem | source | reference | rule | remediation |
| --- | --- | --- | --- | --- |
| `clr-base-b-instruction-source` | 指令资料身份与角色字段 | 三类共同材料抽象 | `CLR-BASE-RULE-IDENTITY` | `CLR-BASE-SOURCES` |
| `clr-base-b-confirmation-source` | 确认/成交资料确认字段 | 三类共同材料抽象 | `CLR-BASE-RULE-IDENTITY` | `CLR-BASE-SOURCES` |
| `clr-base-b-settlement-source` | 交收结果资料实际字段 | 三类共同材料抽象 | `CLR-BASE-RULE-RESULT` | `CLR-BASE-SOURCES` |
| `clr-base-b-quantity` | 指令批次与单位字段 | 银行间字段抽象、案例版本 | `CLR-BASE-RULE-QUANTITY` | `CLR-BASE-CALC` |
| `clr-base-b-amount` | 指令金额分项字段 | 银行间字段抽象、案例版本 | `CLR-BASE-RULE-AMOUNT` | `CLR-BASE-CALC` |
| `clr-base-b-result-ledger` | 交收结果与确认角色字段 | 场内/资金对象抽象 | `CLR-BASE-RULE-RESULT` | `CLR-BASE-OBJECT` |
| `clr-base-b-identity-check` | 四份资料的身份字段 | 三类共同材料抽象 | `CLR-BASE-RULE-IDENTITY` | `CLR-BASE-IDENTITY` |
| `clr-base-b-quantity-diff` | 对账预期/结果数量 | 资金对账抽象、案例版本 | `CLR-BASE-RULE-RECON` | `CLR-BASE-RECON` |
| `clr-base-b-amount-diff` | 对账预期/结果金额 | 资金对账抽象、案例版本 | `CLR-BASE-RULE-RECON` | `CLR-BASE-RECON` |
| `clr-base-b-reconciliation` | 对账差额与结果状态 | 资金对账抽象、案例版本 | `CLR-BASE-RULE-RECON` | `CLR-BASE-RECON` |
| `clr-base-b-conclusion` | 身份（含资产类型）、结果与差额字段 | 案例版本及共同对象抽象 | `CLR-BASE-RULE-CONCLUSION` | `CLR-BASE-CONCLUSION` |

Rubric 的 `referenceAnswer`、`evidenceRules` 与 `remediationTargets` 使用同一组 workItem、rule 和 target ID；答案与补学资产不进入公开 route 的 reference 描述。

## 5. 不覆盖范围

本路线只建立跨分支公共对象和资料链，不制作资金、场内或银行间的具体业务规则，不使用菜单、内部账户、真实客户、固定时点/费率、非正常结果状态、应急处理、改革、跨境或特殊资格专题。后续分支路线须另行使用各自材料包和案例参数。
