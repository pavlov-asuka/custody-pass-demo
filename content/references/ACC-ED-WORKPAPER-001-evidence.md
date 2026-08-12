# ACC-ED-WORKPAPER-001 原材料证据与答案链

## 证据定位与恢复边界

- 老式 DOC：结构化段落 P0005-P0018 支持年报/中报复核流程、来源和时点；P0019-P0024 支持复核原则。未可靠恢复打印版式、页码和表格，因此本路线不伪造页码。
- 年报和中报 DOCX：P0003-P0017 支持任务范围、期间和资料来源；P0047-P0056 与 T01 支持 3.1 指标、利润和份额取数；P0058-P0086 与 T02 支持 3.2 净值表现、日增长和累计增长；P0100-P0111 与 T03 支持分配资料。
- P0063-P0077 含日增长、标准差周边文字；P0085-P0086 含累计增长乘积结构。XML 可恢复的 OMML 对象支持已明确乘积结构，但标准差正式公式对象不完整。
- OLE 关系和对象：word/embeddings/oleObject1.bin 至 oleObject7.bin 的 ProgID 为 Equation.3；对象存在不等于全部数学语义可可靠恢复，故不将标准差补造成正式公式。
- 历史媒体 image8、image18 可作为原材料截图证据，但其金额不直接进入综合答案；本路线只使用其支持的资料对象和关系。

## 同一 B1 正常资料包

- 资料包：ED-B1-ANNUAL-H1-CASE；产品：和宁基金（脱敏合成产品）；产品代码：CASE-FUND-001。
- 报告：中报；期间：2026-01-01 至 2026-06-30；财务和表现截止日：2026-06-30；来源版本：CASE-ED-B1-XBRL-01；复核窗口：CASE-ED-B1-WINDOW-01。
- 期初份额 100,000,000，期末份额 104,000,000；期初净资产 100,000,000，净申购 4,000,000，无赎回、无分红；期末净资产 110,000,000。
- 利润拆分：已实现利润 3,800,000；未实现/公允价值变动 2,200,000；本期利润 3,800,000 + 2,200,000 = 6,000,000。
- 分配链：期末未分配利润 6,000,000；已实现可分配部分 5,800,000；可供分配额 min(6,000,000, 5,800,000) = 5,800,000；份额利润 5,800,000 ÷ 104,000,000 = 0.055769230769，记录 0.055769。
- 净值链：期末单位净值 110,000,000 ÷ 104,000,000 = 1.057692307692，记录 1.057692；无分红、拆分，增长率 1.057692307692 ÷ 1.000000 - 1 = 0.057692307692，记录 0.057692。

## 完整 workItem 答案链

| workItem | 活动落点 | 答案 | 依据/公式 |
|---|---|---|---|
| control-report-type | FIELD_MAP | SEMI_ANNUAL | EDW-CASE-CONTROL：报告类型为中报 |
| control-period | FIELD_MAP | 2026H1 | 期间为 2026-01-01 至 2026-06-30 |
| control-source-version | FIELD_MAP | APPROVED_SNAPSHOT | CASE-ED-B1-XBRL-01 |
| realized-profit | CALCULATION | 3,800,000 | 6,000,000 - 2,200,000 |
| unrealized-profit | CALCULATION | 2,200,000 | 公允价值变动字段 |
| profit-total | RECONCILIATION | 6,000,000 | 3,800,000 + 2,200,000 |
| profit-realized-source | LEDGER_ENTRY | 利润表/账簿—本期利润—已实现 | EDW-CASE-PROFIT-LEDGER |
| profit-unrealized-source | LEDGER_ENTRY | 利润表/估值表—公允价值变动—未实现 | EDW-CASE-PROFIT-LEDGER |
| ending-units | FIELD_MAP | 104,000,000 | EDW-CASE-PROFILE |
| available-distributable | CALCULATION | 5,800,000 | min(6,000,000, 5,800,000) |
| distributable-per-unit | CALCULATION | 0.055769 | 5,800,000 ÷ 104,000,000 |
| ending-nav | CALCULATION | 1.057692 | 110,000,000 ÷ 104,000,000 |
| nav-growth | CALCULATION | 0.057692 | 1.057692307692 ÷ 1.000000 - 1 |
| growth-period-link | RECONCILIATION | MATCHED | 期间、期初/期末净值和无分红/拆分状态一致 |
| standard-deviation-boundary | FIELD_MAP | EXCLUDED_BY_EVIDENCE | 标准差正式对象不完整 |
| result-note | SHORT_TEXT | 数值链、来源一致和标准差边界 | 由上述来源、公式和勾稽共同支持 |

## 独立复算与评分落点

- 所有合成数值用 Decimal 复算：利润 3,800,000 + 2,200,000 = 6,000,000；5,800,000 ÷ 104,000,000 = 0.055769230769...；110,000,000 ÷ 104,000,000 = 1.057692307692...；除以 1 后减 1 = 0.057692307692...。
- FIELD_MAP 覆盖任务期间、来源版本和期末份额；CALCULATION 覆盖利润、分配份额、期末净值和增长率；LEDGER_ENTRY 覆盖两个利润来源；RECONCILIATION 覆盖利润/净值跨来源闭合；SHORT_TEXT 形成追溯结论。
- Rubric 固定为 CONCEPT 25、PROCESS 30、RISK 25、EXPRESSION 20，总分 100、及格 75；最多两项硬性必达分别锁定利润拆分和净值表现底稿。
- 补学 target 分别命中期间/来源、利润来源、利润公式、净值表现、分配份额计算、跨来源/公式边界和底稿结论，不奖励签送、升级或版本话术。

## 批准快照与排除边界

- 模板、XBRL/Word 字段、精度、容差、复核窗口和来源版本都是本案例批准快照；不固化为永久规则。
- 不纳入标准差正式计算，因为可恢复材料只有周边文本和不完整对象；不以推断替代原始公式对象。
- 不进入异常案例、签送/升级流程、权限判断、真实机构/账户/联系人、自动解析或内部路径教学；不使用历史截图金额作为综合答案。
