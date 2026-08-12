# ACC-ED-UPDATES-005 原材料证据与答案链

## 原材料定位与证据限制

- 正式来源：`project_materials/新人陪练案例库/核算/03_估值对账与信息披露__中国建设银行托管运营中心上海分中心更新招募及产品资料概要更新复核业务流程（2026年版）.docx`。
- P0069-P0071：以上一次更新定稿版为基础比对，并关注上一稿之后发布的合同变更/重大变更公告是否已在当前稿体现；P0090：新一期更新招募章节与前一次定稿正文比对。
- P0097-P0098：托管人字段应与复核意见落款日期控制的最新托管人信息一致；本路线用脱敏托管人来源和批准日期复核，不复制源材料中的内部通信信息。
- P0100-P0104：基金业绩需与年报、半年报、季报净值表现和上一期更新招募业绩核对；P0106-P0108：投资组合数字需与截至更新截止日已公开的最新季报数据一致。
- P0111-P0112：产品资料概要产品概况字段和第二稿起与前一稿比对；P0114-P0120：基准、投资组合配置和历史业绩来源；P0122-P0127：管理费、托管费、销售服务费、其他费用费率和综合运作费率。
- P0141-P0155：附件一、托管人复核意见和落款对象；复核意见只针对列示附件。本路线用批准的脱敏附件集合表达范围，不把回复/签送动作作为学习结果。
- T00 版本表已填的最新记录为 T00R04：4.0，更新时间 2024 年 7 月；文件名含“2026年版”只是文件名线索，不能据此补造 T00 的 2026 版本记录。本路线采用题面批准的 `CASE-ED-B3-*` 快照，不把历史版本表或文件名年份固化为永久规则。
- T01R01 明确内容截止日 ≥ 财务数据截止日 ≥ 业绩数据截止日；T01R05 支持托管人最新版本核对；T01R09/T01R10/T01R11 支持投资组合截止日、业绩截止日和相应章节勾稽。
- T02 是涉及组合清单对象；T03 是空白的更新登记簿模板，未提供可直接复用的历史填充记录。B3 的附件范围和登记结果均为批准的正常合成资料，不伪造历史登记内容。
- Pxxxx 为 DOCX 结构化段落序号，TxxRxx 为结构化表格/行定位，不是打印页码。本文件不伪造页码，不把源材料中的历史法律/操作时点当作永久规则。

## 正常更新资料包

- 资料包：`ED-B3-UPDATE-Q2-CASE`；产品：澄川季度基金（脱敏合成产品）；主代码：`CASE-QUARTER-FUND-001`。
- 当前稿：`CASE-CURRENT-招募-2026-第2次更新.docx` 与 `CASE-CURRENT-产品资料概要-2026-第2次更新.docx`；上一稿：`CASE-PREV-招募-2025-第1次更新.docx` 与 `CASE-PREV-产品资料概要-2025-第1次更新.docx`；批准变更公告：`CASE-ANN-托管人及费率变更-2026-05-10.pdf`。
- 三类截止日：内容截止日 2026-07-10；财务数据截止日 2026-06-30；业绩数据截止日 2026-06-30；关系为 `2026-07-10 ≥ 2026-06-30 ≥ 2026-06-30`。
- 当前托管人：案例托管人乙（脱敏）；上一稿托管人：案例托管人甲（脱敏）；批准最新托管人来源：`CASE-CUSTODIAN-BULLETIN-2026-07-15.pdf`；控制日期 2026-07-15。
- 最新公开报告：2026Q2 季度报告，公开日期 2026-07-08；期末净资产 126,000,000；期末份额 120,000,000；本期利润 4,600,000；单位净值 `126,000,000 ÷ 120,000,000 = 1.050000`。
- 当前费率：管理 0.80%、托管 0.15%、销售服务 0.20%、其他费用 0.05%；综合运作费率 `0.80% + 0.15% + 0.20% + 0.05% = 1.20%`。
- 上一稿费率：管理 1.00%、托管 0.20%、销售服务 0.20%、其他费用 0.05%；上一稿综合费率 1.45%；当前/上一稿差异 `1.45% - 1.20% = 0.25` 个百分点，公告支持管理费率、托管费率变化，基金主代码未变。
- 批准期间费用估算参数：平均资产 120,000,000；天数 91；日计数分母 365；期间费用 `120,000,000 × 1.20% × 91 ÷ 365 = 359,013.698630...`，记录 359,013.70 元。该估算只适用本案例批准参数。
- 批准附件集合：当前招募、当前产品资料概要、上一招募、上一产品资料概要、变更公告、最新季度报告、最新托管人来源和托管人复核意见；结论为 `COMPLETE_APPROVED_SET`。

## 示范合成参数与独立答案链

- 示范产品：青屿基金；当前稿为 2026 年第 1 次更新，上一稿为 2025 年第 3 次更新，公告日期 2026-03-15；当前托管人案例托管人丙（脱敏）。
- 示范截止日：内容 2026-04-05；财务 2026-03-31；业绩 2026-03-31；顺序正确。
- 示范最新报告：期末净资产 82,000,000；期末份额 80,000,000；单位净值 `82,000,000 ÷ 80,000,000 = 1.025000`。
- 示范费率：管理 0.90%、托管 0.18%、销售服务 0.15%、其他 0.07%；综合费率 `0.90% + 0.18% + 0.15% + 0.07% = 1.30%`；批准参数下期间费用 `80,000,000 × 1.30% × 90 ÷ 365 = 256,438.356...`，记录 256,438.36 元。
- 示范与综合实务不复用产品、版本文件名、期间、托管人或数值；两者均为正常资料，不制作异常差异或重签案例。

## 完整 workItem 答案链

| workItem | 活动落点 | 答案 | 来源/公式 |
|---|---|---|---|
| current-draft-id | FIELD_MAP | 当前招募/产品资料概要 2026 第 2 次更新 | EDU-CASE-VERSION-CONTROL |
| previous-draft-id | FIELD_MAP | 上一招募/产品资料概要 2025 第 1 次更新 | EDU-CASE-VERSION-CONTROL |
| announcement-id | FIELD_MAP | CASE-ANN-托管人及费率变更-2026-05-10.pdf | 公告支持差异 |
| version-diff-custodian | RECONCILIATION | CHANGED_AND_SUPPORTED | 甲 → 乙，公告支持 |
| version-diff-management-rate | RECONCILIATION | CHANGED_AND_SUPPORTED | 1.00% → 0.80% |
| version-diff-custody-rate | RECONCILIATION | CHANGED_AND_SUPPORTED | 0.20% → 0.15% |
| unchanged-fund-code | RECONCILIATION | UNCHANGED_MATCHED | CASE-QUARTER-FUND-001 未变 |
| content-cutoff | FIELD_MAP | 2026-07-10 | EDU-CASE-CUTOFFS |
| financial-cutoff | FIELD_MAP | 2026-06-30 | EDU-CASE-CUTOFFS/最新季报 |
| performance-cutoff | FIELD_MAP | 2026-06-30 | EDU-CASE-CUTOFFS/业绩资料 |
| cutoff-order | RECONCILIATION | ORDER_OK | 内容 ≥ 财务 ≥ 业绩 |
| current-custodian | FIELD_MAP | 案例托管人乙（脱敏） | EDU-CASE-CUSTODIAN |
| latest-report-period | FIELD_MAP | 2026Q2 | 2026-07-08 已公开最新季度报告 |
| latest-report-net-assets | FIELD_MAP | 126,000,000 | EDU-CASE-LATEST-REPORT |
| latest-report-units | FIELD_MAP | 120,000,000 | EDU-CASE-LATEST-REPORT |
| latest-report-nav | CALCULATION | 1.050000 | 126,000,000 ÷ 120,000,000 |
| latest-report-profit | FIELD_MAP | 4,600,000 | 最新季度报告/季度数字链 |
| management-rate-current | FIELD_MAP | 0.80% | 当前产品资料概要 |
| custody-rate-current | FIELD_MAP | 0.15% | 当前产品资料概要 |
| sales-rate-current | FIELD_MAP | 0.20% | 当前产品资料概要 |
| other-rate-current | FIELD_MAP | 0.05% | 当前产品资料概要 |
| comprehensive-fee-rate | CALCULATION | 1.20% | 四项当前费率相加 |
| average-asset-base | FIELD_MAP | 120,000,000 | 批准期间费用参数 |
| period-days | FIELD_MAP | 91 | 批准期间费用参数 |
| estimated-period-fee | CALCULATION | 359,013.70 | 120,000,000 × 1.20% × 91 ÷ 365 |
| rate-difference | RECONCILIATION | 0.25 | 1.45% - 1.20% |
| attachment-scope | FIELD_MAP | COMPLETE_APPROVED_SET | 八类批准附件对象完整 |
| attachment-current-draft | LEDGER_ENTRY | 当前招募 + 当前产品资料概要 | 当前稿附件 |
| attachment-previous-draft | LEDGER_ENTRY | 上一招募 + 上一产品资料概要 | 对比附件 |
| attachment-announcement | LEDGER_ENTRY | CASE-ANN-托管人及费率变更-2026-05-10.pdf | 批准变更公告 |
| attachment-latest-report | LEDGER_ENTRY | CASE-LATEST-季度报告-2026Q2.docx | 最新公开季报 |
| attachment-custodian-source | LEDGER_ENTRY | 托管人来源 + 复核意见 | 2026-07-15 批准附件 |
| cross-source-status | RECONCILIATION | MATCHED | 版本、截止日、报告、费率、附件闭合 |
| result-note | SHORT_TEXT | 版本/截止日/净值/费率/费用/附件短结论 | 完整复核链支持 |

## 活动、评分与补学落点

- `FIELD_MAP`：当前稿/上一稿/公告、三类截止日、托管人、最新报告字段、当前费率、批准参数和附件范围。
- `CALCULATION`：最新报告单位净值、综合运作费率和批准参数下期间费用。
- `RECONCILIATION`：版本差异公告支持、基金代码未变、截止日顺序、费率差异和跨来源闭合。
- `LEDGER_ENTRY`：当前/上一稿费率及当前稿、上一稿、公告、最新报告、托管人来源附件的局部对比底稿。
- `SHORT_TEXT`：形成版本、日期、最新报告、费率/费用和附件范围短结论。
- Rubric 固定为 CONCEPT 25、PROCESS 30、RISK 25、EXPRESSION 20，总分 100、及格 75；两项硬性必达分别锁定版本/截止日链和最新报告/费率数字链。
- 补学 target 命中版本身份、截止日顺序、最新报告来源/数值、费率/费用、附件范围、跨来源勾稽和结论错误；不奖励逐段比对、回复、签送、权限或重签话术。

## 批准快照与排除边界

- 费率、平均资产基数、天数、日计数分母、模板字段、文件名、权限、复核意见日期和附件范围均为本案例批准快照，不固化为材料中的永久规则。
- T00 的 4.0/2024-07 是已填入的最新版本记录；文件名“2026年版”与该记录不一致时，以批准题面和正文/表格对象为准，不自行补造 2026 版本表记录。
- 源材料中的内部通信、路径和历史工作安排不进入正式答案；T03 空白登记簿不被当作历史业务记录。
- 不制作异常变更、缺件、未公开报告、费率争议、权限判断、回复签送或后续改稿案例；复核结论只针对批准附件集合。
- 所有产品、代码、机构、文件名和公告均为脱敏合成值，不包含真实账号、联系人或敏感内部数据。
