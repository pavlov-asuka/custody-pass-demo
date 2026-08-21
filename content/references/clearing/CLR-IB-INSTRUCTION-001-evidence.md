# CLR-IB-INSTRUCTION-001 原材料—教学证据映射

## 1. 路线范围与依赖

本路线只依赖 `CLR-BASE-001`，训练一条正常的银行间债券结算指令确认链：

`交易数据/成交单 → 结算任务 → 本方与对手方指令 → 字段匹配 → 本案例批准检查 → 结算确认`

这里的“确认”是确认资料和阶段状态已形成，不是证券和资金已经完成 DVP 交割。DVP 实际交割、交割日日终和后续对账关闭由 `CLR-IB-DVP-CLOSE-002` 承接；本路线不写该路线的前置或答案。

## 2. 原材料定位和使用边界

| 材料代码 | 物理文件 | 稳定定位 | 支持的关系 | 不带入本路线 |
| --- | --- | --- | --- | --- |
| `CLR-MAT-IB-CCDC` | `project_materials/新人陪练案例库/清算/银行间/关于发布《中央国债登记结算有限责任公司债券交易结算规则》的通知.docx` | P7—P11、P14—P15 | 结算机构/簿记系统/结算成员边界；托管账号、业务类别、方向、结算方式、债券代码、债券面额、结算金额、交割日、经办/复核和指令确认关系 | 2005 年历史时点、费用、菜单、账号、当前状态字典和制度有效性 |
| `CLR-MAT-IB-SHCH` | `project_materials/新人陪练案例库/清算/银行间/关于发布《银行间市场清算所股份有限公司债券登记托管、清算结算业务规则》的公告.docx` | P106—P127、P147—P150 | 交易进入结算；债券账户与资金结算账户分工；有效指令、逐笔处理和角色关系 | 历史截止时点、失败条件、费用、回购和异常处理 |
| `CLR-MAT-IB-EXAMPLE` | `project_materials/新人陪练案例库/清算/银行间/银行间例题.docx` | P26—P30、P50—P54、T1.R1—T1.R2 | 题库中出现的任务/确认/状态类对象作为审计参照 | 不把答案、界面菜单、费用或自动回款时点当作永久规则 |
| `CLR-MAT-IB-INTRO-2026` | `project_materials/新人陪练案例库/清算/银行间/银行间债券结算业务简介2026（1).ppt` | S5、S16、S21、S22、S24、S26 | 可读的机构/系统/账户对象示意和业务关系 | S21/S22 的 OLE 对象不可按正文可靠读取；S5 与题库 T1 的时点存在冲突，不写入案例 |
| `CLR-BASE-001` | `Repository/content/routes/clearing/CLR-BASE-001.json`；`Repository/content/evidence/clearing/base/CLR-BASE-001-evidence.json` | route steps、answerChains、atomicWorkItems | 业务键、日期、来源承接、工作纸和零差勾稽的公共结构 | 不把资金、场内或其他银行间路线状态写入依赖 |

CCDC 规则文本为 2005 年发布的材料，SHCH 规则文本亦按材料审计视为历史制度文本。它们在本路线只承担“字段和业务关系的材料抽象”，不承担当前制度核验。2026 PPT 的可读性受到旧 `.ppt` 格式、图片化对象和 OLE 对象限制，因此不从不可读对象推导规则。

## 3. 业务对象因果链

1. 交易数据/成交单提供一笔业务的业务键、业务日期、交割日、债券代码、方向、债券面额和结算金额输入。
2. 结算任务在结算处理系统中承接该业务键，并保留结算机构和处理对象。交易系统、结算处理系统是系统角色，不能替代机构。
3. 本方和对手方指令分别保留证券账户、资金账户的角色关系，以及结算方式、通道和核心输入字段。证券账户承载债券对象，资金账户承载款项对象。
4. 匹配时逐项比较业务键、日期、交割日、债券代码、方向、机构、面额、金额、账户角色、方式和通道。`DVP` 是结算方式，`NON_DIRECT` 是通道，二者不能互换。
5. 本案例批准检查只确认字段完整、身份一致、两类输入差额为零和方式/通道边界清楚；随后形成 `CONFIRMED_FOR_SETTLEMENT`。
6. 该状态不表示 DVP 已完成，也不表示交割日日终结果。回购为 `BUILDING`；非 DVP、失败、缺券、缺款、重付、部分交收、系统故障和应急为 `DEFER`。

## 4. 公开资料包与私有答案链

公开 route 的综合 B 提供六份正常资料：交易数据、结算任务、本方指令、对手方指令、字段匹配/批准报告和结算确认资料。工作纸要求学员完成：

- `FIELD_MAP`：机构/系统/账户来源和方式/通道来源；
- `CALCULATION`：面额和结算金额的输入一致性差额；
- `LEDGER_ENTRY`：机构、系统、账户角色、方式/通道和批准/确认状态工作纸；
- `RECONCILIATION`：身份一致、两类差额为零、批准/确认闭合；
- 一个基础 `SHORT_TEXT`：用一句话写出交易数据、结算任务、双边指令、批准检查和结算确认的正常承接顺序；综合实务另保留一个可追溯结论 `SHORT_TEXT`。

答案、规则、补学和来源四向映射均在 `content/evidence/clearing/ib-instruction/CLR-IB-INSTRUCTION-001-evidence.json` 与同名 Rubric 中，公开 route 不放入 Rubric 维度或私有规则 ID。

## 5. Demo A / Comprehensive B 合成案例政策

两套案例保持相同的字段角色、处理顺序、复算公式、批准检查和确认结构；只替换业务键、日期、债券代码、面额和结算金额。所有值均为 `SYNTHETIC_EDUCATIONAL`、`CASE_POLICY`、`ONLY_THIS_CASE`，不代表真实账户、真实机构账号或永久状态。

| 项目 | Demo A | Comprehensive B |
| --- | --- | --- |
| 业务键 | `IB-A-20260818-731` | `IB-B-20260821-428` |
| 业务日期 / 交割日 | `2026-08-18` / `2026-08-19` | `2026-08-21` / `2026-08-24` |
| 债券代码 | `CGB-EDU-2026-A` | `CGB-EDU-2026-B` |
| 债券面额 | `120.0000 CNY_10K` | `185.7500 CNY_10K` |
| 结算金额输入 | `1024560.00 CNY` | `2487650.00 CNY` |
| 一致性复算 | `120.0000 - 120.0000 = 0.0000`；`1024560.00 - 1024560.00 = 0.00` | `185.7500 - 185.7500 = 0.0000`；`2487650.00 - 2487650.00 = 0.00` |
| 机构 / 系统 | `CCDC` / `SETTLEMENT_PROCESSING_SYSTEM` | `CCDC` / `SETTLEMENT_PROCESSING_SYSTEM` |
| 方式 / 通道 | `DVP` / `NON_DIRECT` | `DVP` / `NON_DIRECT` |
| 阶段结果 | `APPROVED_FOR_CONFIRMATION` → `CONFIRMED_FOR_SETTLEMENT` | `APPROVED_FOR_CONFIRMATION` → `CONFIRMED_FOR_SETTLEMENT` |

面额精度为 4 位、容差 `0.0001 CNY_10K`；结算金额精度为 2 位、容差 `0.01 CNY`。金额直接取资料输入，只做两份输入的差额比较；不计算净价、全价、应计利息、费用、资金头寸或交割后余额。

### W6 显示映射依赖（本路线只登记，不改前端）

- `CNY_10K` 显示为“万元”，`CNY` 显示为“元”；`NON_DIRECT` 显示为“非直联”。
- `CCDC` 显示为“中央国债登记结算有限责任公司”，`SHCH` 显示为“银行间市场清算所股份有限公司”。
- `DELIVER_SECURITIES`、证券/资金账户角色、机构代码、系统名和通道枚举只保留为提交与评分键，不能直接落成学员看到的业务资料标识；账户角色应映射为业务中文。

## 6. WorkItem 四向闭合

| workItem | source | reference | rule | remediation |
| --- | --- | --- | --- | --- |
| `clr-ib-b-field-institution-system-account` | 综合 B 本方指令的机构/系统/账户角色字段 | `CLR-IB-REF-BASE`、`CLR-IB-REF-CCDC`、`CLR-IB-REF-SHCH` | `CLR-IB-RULE-FIELD-ROLES` | `CLR-IB-ROLES` → KC-01 / Q-01 |
| `clr-ib-b-field-method-channel` | 综合 B 双边指令的 `settlement_method`、`channel` | `CLR-IB-REF-CCDC`、`CLR-IB-REF-SHCH`、`CLR-IB-REF-CASE` | `CLR-IB-RULE-METHOD-CHANNEL` | `CLR-IB-ROLES` → KC-01 / Q-01 |
| `clr-ib-b-face-value-check` | 交易数据与本方指令面额输入 | `CLR-IB-REF-CCDC`、`CLR-IB-REF-CASE` | `CLR-IB-RULE-FACE-CONSISTENCY` | `CLR-IB-DECIMAL` → Demo step 3 / Q-02 |
| `clr-ib-b-settlement-amount-check` | 交易数据与本方指令结算金额输入 | `CLR-IB-REF-CCDC`、`CLR-IB-REF-SHCH`、`CLR-IB-REF-CASE` | `CLR-IB-RULE-AMOUNT-CONSISTENCY` | `CLR-IB-DECIMAL` → Demo step 3 / Q-02 |
| `clr-ib-b-confirmation-workpaper` | 本方指令、匹配报告和确认资料 | `CLR-IB-REF-BASE`、`CLR-IB-REF-CCDC`、`CLR-IB-REF-SHCH`、`CLR-IB-REF-CASE` | `CLR-IB-RULE-CONFIRMATION` | `CLR-IB-APPROVAL` → KC-03 / Q-04 |
| `clr-ib-b-identity-match` | 交易数据、任务、双边指令和确认资料身份字段 | `CLR-IB-REF-BASE`、`CLR-IB-REF-CCDC`、`CLR-IB-REF-SHCH` | `CLR-IB-RULE-IDENTITY` | `CLR-IB-MATCH` → Demo step 2 / Q-05 |
| `clr-ib-b-zero-difference` | 匹配报告与两份输入资料的差额字段 | `CLR-IB-REF-BASE`、`CLR-IB-REF-CASE` | `CLR-IB-RULE-APPROVAL` | `CLR-IB-DECIMAL` → Demo step 3 / Q-02 |
| `clr-ib-b-approval-confirmation` | 匹配报告和确认资料阶段字段 | `CLR-IB-REF-BASE`、`CLR-IB-REF-CCDC`、`CLR-IB-REF-SHCH`、`CLR-IB-REF-CASE` | `CLR-IB-RULE-CONFIRMATION` | `CLR-IB-APPROVAL` → KC-03 / Q-04 |
| `clr-ib-b-conclusion` | 输入、匹配、确认和边界字段 | `CLR-IB-REF-BASE`、`CLR-IB-REF-CASE` | `CLR-IB-RULE-CONCLUSION` | `CLR-IB-CONCLUSION` → Demo step 5 / 基础短文本 Q-03 |

每个 workItem 只在 evidence 中有一条 `atomicWorkItems` 映射；Rubric 的每条 criterion、mandatory 和 remediationTarget 均回到这些 ID。综合实务共 9 个 workItem，类型覆盖 `FIELD_MAP` 2、`CALCULATION` 2、`LEDGER_ENTRY` 1、`RECONCILIATION` 3、`SHORT_TEXT` 1。

## 7. Rubric、硬达和补学

Rubric 固定为 `CONCEPT 25 / PROCESS 30 / RISK 25 / EXPRESSION 20`，总分 100，75 分通过。两个硬达分别为：

1. `M-CLR-IB-ROLE-METHOD-CLOSED`：机构、系统、账户角色、DVP 和 NON_DIRECT 必须同时、分开登记。
2. `M-CLR-IB-CONFIRMATION-CLOSED`：面额/金额差均为零、身份匹配、批准检查和结算确认闭合，并明确实际 DVP 交割不在本路线。

补学不是直接改状态：命中缺口后回到对应知识卡或示范步骤，重做相关基础练习，再重新提交综合实务。补学目标分别覆盖对象边界、处理顺序、Decimal 一致性、字段匹配、批准/确认和可追溯结论。

## 8. 与固定收益核算路线去重

本路线只读债券结算指令的业务字段和阶段状态：债券代码、面额、结算金额输入、方向、账户角色、结算方式、通道、匹配和确认。它不计算净价、全价、应计利息、费用、成本、估值、会计分录、资金头寸或交割后余额；这些属于固定收益核算或后续 DVP 交收边界。结算金额在本路线是输入字段，只做来源间零差复算，避免与固定收益价格/利息链重复。

## 9. 施工与验证记录

本批只允许以下路径：

- `Repository/content/routes/clearing/CLR-IB-INSTRUCTION-001.json`
- `Repository/content/rubrics/clearing/CLR-IB-INSTRUCTION-001.json`
- `Repository/content/evidence/clearing/ib-instruction/**`
- `Repository/content/references/clearing/CLR-IB-INSTRUCTION-001-evidence.md`

本路线不登记地图或发布清单，不修改 Schema、计划、BASE、其他路线、共享索引、脚本、后端、前端或材料。完成交付前应定向验证：

1. route/rubric JSON Schema；
2. 3 张知识卡、5 步示范、5 个异构基础，综合 9 个 workItem 且只含 1 个 `SHORT_TEXT`；
3. Rubric 25/30/25/20、75 通过、2 个硬达、每个 workItem 的 source/reference/rule/remediation 闭合；
4. A/B Decimal 字符串复算、键/日期/债券/面额/金额差异、所有案例参数 `ONLY_THIS_CASE`；
5. institution/system/account/method/channel 分隔，异常和永久时点未进入题面；
6. `git diff --check` 与允许路径核对，保留并行未跟踪的 `CLR-BASE-001` 资产。
