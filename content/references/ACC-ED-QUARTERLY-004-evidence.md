# ACC-ED-QUARTERLY-004 原材料证据与答案链

## 原材料定位与恢复限制

- 正式来源：`project_materials/新人陪练案例库/核算/03_估值对账与信息披露__中国建设银行托管运营中心上海分中心基金季度定期报告复核操作流程（2026年版）.docx`。
- P0005-P0015：季度任务流程、模板/来源准备、3.1/3.2 手工底稿、主管复核前置和 D 日后重签边界；P0017-P0019：财务指标、净值表现、投资组合数据一致性、文字信息完整性和增长率图片复核原则。
- P0040-P0042：重要提示标题、基金托管人、复核日期、报告期起止日期和未经审计字段；P0044-P0052：基金概况、基金基本情况和目标基金字段范围。
- P0059-P0065：管理人报告 4.2 遵规守信、4.5 业绩表现、4.6 持有人数/基金资产净值预警字段；P0067-P0072：投资组合报告 5.12.1 前十名证券发行主体监管事项以及第 10 节托管人相关信息。
- P0079-P0090：业务主管指定资产组合、3.1/3.2 定稿数字手工底稿复查、管理人报告/其他重要信息复核和报告状态检查；P0089-P0090 的状态/重签内容仅作为流程边界，不进入正常案例答案。
- 截图对象共 8 张：`word/media/image1.png`（P0025）、`image2.png`（P0027）、`image3.png`（P0029）、`image4.png`（P0031）、`image5.png`（P0038）、`image6.png`（P0042）、`image7.png`（P0051）、`image8.png`（P0081）。截图无可靠表格/公式对象可供复算，本路线只使用对象所在章节和界面字段存在性。
- `image6.png` 位于重要提示字段上下文，`image7.png` 位于目标基金概况上下文，`image8.png` 位于主管复核清单上下文；其中截图可能出现的核对异常/不符数据列表只作为界面字段证据，明确排除正常合成案例。
- DOCX 无结构化表格和 OLE 公式对象；Pxxxx 为 DOCX XML 结构化段落序号，不是打印页码。本文件不伪造页码，不补造截图文本，不把截图金额当作综合答案。

## 正常季度合成资料包

- 资料包：`ED-B2-QUARTERLY-Q2-CASE`；产品：澄川季度基金（脱敏合成产品）；主代码：`CASE-QUARTER-FUND-001`；报告期间：2026-04-01 至 2026-06-30。
- 批准快照：季度模板 `CASE-ED-B2-TEMPLATE-01`；来源 `CASE-ED-B2-XBRL-01`；题面窗口 `CASE-ED-B2-WINDOW-01`；批准披露日期 2026-07-21；批准复核日期 2026-07-18。模板、字段、时点和日期均为本题快照。
- 重要提示/基金概况：托管人为案例托管人甲（脱敏）；审计状态为未经审计；基金简称澄川季度；合同生效日 2024-09-12；期末份额 120,000,000 份。
- 3.1 链：已实现收益 3,400,000；未实现收益/公允价值变动 1,200,000；本期利润 `3,400,000 + 1,200,000 = 4,600,000`；加权平均份额 115,000,000；加权平均份额本期利润 `4,600,000 ÷ 115,000,000 = 0.040000`；期末净资产 126,000,000；期末单位净值 `126,000,000 ÷ 120,000,000 = 1.050000`。
- 3.2 链：期初单位净值 1.000000；期末单位净值 1.050000；批准每份分红 0.010000；期末累计净值 `1.050000 + 0.010000 = 1.060000`；净值增长率 `(1.050000 + 0.010000) ÷ 1.000000 - 1 = 0.060000`；基准收益率 0.042000；超额结果 `0.060000 - 0.042000 = 0.018000`。
- 指定字段：4.2 无特殊表述；4.5 与 3.2 复算结果一致；4.6 持有人数 3,200 户且无净值预警；5.12.1 未出现相关监管事项；第 10 节托管人信息一致。
- 正常状态：3.1/3.2 底稿均已填充，指定字段已勾稽，主管状态 `REVIEWED`，归档状态 `NORMAL_ARCHIVED`。

## 示范合成参数与独立答案链

- 示范产品：栖禾季度基金；期间 2026-01-01 至 2026-03-31；复核日期 2026-04-18；披露日期 2026-04-21；这些数字与综合实务不同。
- 示范 3.1：已实现收益 1,200,000；未实现收益 300,000；本期利润 `1,200,000 + 300,000 = 1,500,000`；加权平均份额 75,000,000；加权平均份额利润 `1,500,000 ÷ 75,000,000 = 0.020000`；期末净资产 82,000,000；期末份额 80,000,000；期末净值 `82,000,000 ÷ 80,000,000 = 1.025000`。
- 示范 3.2：批准每份分红 0.005000；净值增长率 `(1.025000 + 0.005000) ÷ 1.000000 - 1 = 0.030000`；基准 0.018000；超额 `0.030000 - 0.018000 = 0.012000`。
- 示范指定字段和底稿状态均为正常；不复用综合实务产品、期间、金额或代码。

## 完整 workItem 答案链

| workItem | 活动落点 | 答案 | 来源/公式 |
|---|---|---|---|
| control-report-type | FIELD_MAP | QUARTERLY | EDQ-CASE-CONTROL：季度报告 |
| control-period | FIELD_MAP | 2026Q2 | 2026-04-01 至 2026-06-30 |
| control-template-source | FIELD_MAP | APPROVED_SNAPSHOT | 模板/来源批准快照 |
| review-timing | FIELD_MAP | BEFORE_DISCLOSURE_DATE | 2026-07-18 早于 2026-07-21 |
| d-day-resign-boundary | FIELD_MAP | BOUNDARY_ONLY | D 日后重签不进入正常案例 |
| screenshot-boundary | FIELD_MAP | EXCLUDED_FROM_NORMAL_CASE | 8 张截图中的异常/不符列表只作界面证据 |
| important-custodian | FIELD_MAP | 案例托管人甲（脱敏） | EDQ-CASE-IMPORTANT |
| important-period | FIELD_MAP | 2026Q2 | 重要提示报告期 |
| fund-short-name | FIELD_MAP | 澄川季度 | EDQ-CASE-FUND-PROFILE |
| fund-primary-code | FIELD_MAP | CASE-QUARTER-FUND-001 | EDQ-CASE-FUND-PROFILE |
| contract-effective-date | FIELD_MAP | 2024-09-12 | EDQ-CASE-FUND-PROFILE |
| ending-units | FIELD_MAP | 120,000,000 | 基金概况/3.1 期末份额 |
| realized-profit | CALCULATION | 3,400,000 | 3.1 已实现收益字段 |
| unrealized-profit | CALCULATION | 1,200,000 | 3.1 未实现收益/公允价值变动字段 |
| current-profit | RECONCILIATION | 4,600,000 | 3,400,000 + 1,200,000 |
| weighted-average-units | FIELD_MAP | 115,000,000 | 3.1 加权平均基金份额 |
| weighted-average-share-profit | CALCULATION | 0.040000 | 4,600,000 ÷ 115,000,000 |
| ending-net-assets | FIELD_MAP | 126,000,000 | 3.1 期末基金资产净值 |
| ending-nav | CALCULATION | 1.050000 | 126,000,000 ÷ 120,000,000 |
| ending-cumulative-nav | CALCULATION | 1.060000 | 1.050000 + 0.010000 |
| nav-growth | CALCULATION | 0.060000 | (1.050000 + 0.010000) ÷ 1.000000 - 1 |
| benchmark-growth | FIELD_MAP | 0.042000 | 3.2 批准基准字段 |
| excess-performance | RECONCILIATION | 0.018000 | 0.060000 - 0.042000 |
| performance-link | RECONCILIATION | MATCHED | 期间、净值、分红和基准同一快照 |
| manager-compliance | FIELD_MAP | NO_SPECIAL_STATEMENT | 4.2 指定字段 |
| manager-performance | RECONCILIATION | PERFORMANCE_TEXT_MATCHED | 4.5 与 3.2 结果一致 |
| holder-warning | FIELD_MAP | NO_WARNING | 4.6 指定字段 |
| top10-regulatory | FIELD_MAP | NO_REGULATORY_EVENT | 5.12.1 指定字段 |
| custodian-info | FIELD_MAP | CUSTODIAN_INFO_MATCHED | 第 10 节托管人相关信息 |
| workpaper-3-1 | LEDGER_ENTRY | 3.1 完整数值链 | 手工底稿局部填充 |
| workpaper-3-2 | LEDGER_ENTRY | 3.2 完整数值链 | 手工底稿局部填充 |
| supervisor-review-status | RECONCILIATION | REVIEWED | 正常主管复核结果 |
| archive-status | RECONCILIATION | NORMAL_ARCHIVED | 正常归档结果 |
| result-note | SHORT_TEXT | 完整短结论 | 数字、指定字段、截图边界和状态共同支持 |

## 活动、评分与补学落点

- `FIELD_MAP`：季度控制、模板/来源、日期边界、重要提示、基金概况、基准和指定文字字段。
- `CALCULATION`：3.1 本期利润、加权平均份额利润、期末净值/累计净值；3.2 净值增长率。
- `RECONCILIATION`：3.1 利润闭合、3.2 超额结果/来源期间、管理人业绩、主管复核和归档状态。
- `LEDGER_ENTRY`：3.1/3.2 手工工作底稿局部填充，保留公式与来源，不生成签名或发送动作。
- `SHORT_TEXT`：形成包含 3.1、3.2、指定字段和正常状态的短结论。
- Rubric 固定为 CONCEPT 25、PROCESS 30、RISK 25、EXPRESSION 20，总分 100、及格 75；最多两项硬性必达分别锁定 3.1 和 3.2 数值链。
- 补学 target 分别命中季度期间/来源、指定字段、3.1、3.2、截图边界、底稿状态和短结论错误；RISK 不奖励签送、升级、重签或权限话术。

## 批准快照与排除边界

- 报告期间、复核日期、披露日期、模板字段、XBRL/报告来源、D 日后重签、权限和敏感边界均为本案例批准快照或排除边界，不固化为永久规则。
- 资料包为资料充分、规则明确、业务正常的季度定稿包，不制作核对异常、不符数据、异常差异、重签、升级或签送案例。
- 截图对象只支持界面章节/字段位置存在；不可可靠辨认的截图文字、截图金额和异常列表均不进入综合答案。
- 所有产品、代码、机构和状态均为脱敏合成值；不包含真实账号、联系人、权限、内部路径或敏感信息。
