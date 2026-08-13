# ACC-MF-TA-003 证据与闭合说明

## 1. 路线边界

本路线只训练普通货币基金正常申购/赎回的指令、确认、到账和三方勾稽。题面将 T 日申请与 T+1 TA 确认明确拆开：T 日不形成最终份额或银行现金，T+1 才按批准 TA 确认资料形成确认份额并核对净到账。所有日期、金额、单位结果、精度和容差均为路线题面版本化参数，不是永久制度。

现役路线 Schema 没有独立共享资料包对象。本路线沿既有自包含拓扑落地：`PARAMETER → INSTRUCTION → CONFIRMATION → LEDGER/STATEMENT → WORKPAPER`。综合资料包同时提供管理人份额/资金台账、TA台账和银行现金摘要，避免只凭单一来源给出结论。综合案例是本路线独立脱敏批次，不承接其他路线的金额、份额或余额；只复用前置的确认状态和单位结果字段定义。

## 2. 原材料定位

| 教学内容 | 原始定位 | 正式使用 |
|---|---|---|
| T+1确认与普通货币基金状态 | `04_特殊产品区_货币基金__货币市场基金核算业务介绍202306.docx`：P137-P138 | 知识卡、T/T+1参数和申请/确认状态 workItem |
| TA确认凭证及数量关系 | 同上：P140-P142；借“应收申购款”、贷“实收基金（4001）”、数量=金额 | 演示第4步、基础 Q3、综合 `subscription-debit/subscription-credit` |
| T+1申赎款结转与管理公司指令核对 | 同上：P144-P146 | 演示第5步、综合到账字段、管理人/TA/银行三方勾稽 |
| TA日常主题和系统截图定位 | `货币市场基金核算业务介绍202306.pptx`：S13-S15；S13-S15含对应媒体对象 | 只确认TA确认、结转主题和结构；不复制内部截图参数 |
| 直销申购款利息 | 同上 DOCX：P148-P152 | 明确排除，不创建直销利息 workItem 或答案 |
| 分级强增强减 | 同上 DOCX：P154-P158 | 明确排除，不引入分级基金或份额升降级 |

P137-P146 的 DOCX 结构复核未发现公式对象或嵌入媒体；TA 画面主要位于 PPT S13-S15 的媒体对象中。本路线不声称完成 DOCX 打印页或 PNG 视觉 QA，只保留可复核的 P/S 定位。

## 3. 正常示范答案链（案例产品甲）

参数：T 日 2026-08-19，T+1 日 2026-08-20；T 日申购申请 260,000.00 元、赎回申请 90,000.00 元；T+1 确认申购 260,000.00 元、确认赎回 90,000.00 元；单位结果 1.000000；期初份额 8,400,000 份；期初银行现金 2,600,000.00 元。

1. T 日只登记申请，最终份额变化和银行现金到账均为 0。
2. T+1 TA 确认形成 260,000 份申购和 90,000 份赎回。
3. 净确认资金 `260,000 − 90,000 = 170,000.00` 元；净确认份额 `260,000 − 90,000 = 170,000` 份。
4. 已确认申购凭证为借“应收申购款”260,000.00 元，贷“实收基金（4001）”260,000.00 元，数量 260,000 份；赎回结转金额只按 T+1 管理公司指令和 TA 资料核对。
5. 期末份额 `8,400,000 + 170,000 = 8,570,000` 份；期末现金 `2,600,000 + 170,000 = 2,770,000.00` 元。

## 4. 综合实务答案链（案例产品乙）

综合数字与演示不同：T 日 2026-08-26，T+1 日 2026-08-27；T 日申购申请 375,000.00 元、赎回申请 125,000.00 元；T+1 确认申购 375,000.00 元、确认赎回 125,000.00 元；期初份额 12,600,000 份；期初现金 4,320,000.00 元。

| workItem | 类型 | 答案 | 依据 |
|---|---|---:|---|
| `instruction-timing` | FIELD_MAP | `T_APPLY_T1_CONFIRM` | 批准参数日期 |
| `instruction-state` | FIELD_MAP | `APPLICATION_NO_CONFIRMATION` | T 日指令资料 |
| `unit-basis` | FIELD_MAP | `AMOUNT_TO_UNITS` | 单位结果1.000000 |
| `cash-arrival-date` | FIELD_MAP | `T_PLUS_1` | T+1现金摘要 |
| `confirmed-subscription-amount` | CALCULATION | 375,000.00 | TA确认表 |
| `confirmed-redemption-amount` | CALCULATION | 125,000.00 | TA确认表 |
| `net-confirmed-cash` | CALCULATION | 250,000.00 | 申购减赎回 |
| `net-confirmed-units` | CALCULATION | 250,000 | 确认份额净额 |
| `ending-units` | CALCULATION | 12,850,000 | 12,600,000+250,000 |
| `ending-cash` | CALCULATION | 4,570,000.00 | 4,320,000+250,000 |
| `t-day-unit-delta` | RECONCILIATION | 0 | T 日未确认 |
| `management-ta-unit-diff` | RECONCILIATION | 0 | 管理人台账与TA |
| `ta-cash-diff` | RECONCILIATION | 0.00 | TA与银行到账 |
| `management-cash-diff` | RECONCILIATION | 0.00 | 管理人资金与银行 |
| `subscription-debit` / `subscription-credit` | LEDGER_ENTRY | 应收申购款 / 实收基金（4001） | T+1已确认申购凭证 |
| `reconciliation-result` | RECONCILIATION | `BALANCED` | 三方闭合 |
| `result-note` | SHORT_TEXT | T日不确认；T+1确认并到账；份额、净资金与三方勾稽一致 | 上述资料与计算 |

## 5. Rubric、补学与排除

- Rubric 固定为 `CONCEPT 25 / PROCESS 30 / RISK 25 / EXPRESSION 20`，通过线75；两项硬性必达分别锁定 T/T+1 时序状态和 T+1 份额/到账/三方闭合。
- 综合 workItem 共18个，覆盖 `FIELD_MAP`、`CALCULATION`、`LEDGER_ENTRY`、`RECONCILIATION`、`SHORT_TEXT`；每个 workItem 均进入 referenceAnswer.responses，并至少被一条 evidenceRules 覆盖。
- 补学目标分别命中时序、申请/确认状态、确认金额/份额、凭证、三方勾稽和可追溯表达；不以“升级”话术替代来源核对。
- 不纳入直销申购款利息、交易型货币、分级强增强减、巨额赎回、负收益或任何异常指令处置。
