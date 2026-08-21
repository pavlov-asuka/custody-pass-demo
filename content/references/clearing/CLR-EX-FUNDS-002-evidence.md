# CLR-EX-FUNDS-002 原材料—教学证据映射

## 1. 路线边界

本路线只依赖 `CLR-EX-CORE-001`。Demo A 逐项承接 CORE A 的业务键、业务日期、`security_code` 和四项义务；Comprehensive B 逐项承接 CORE B 的业务键、业务日期、`security_code` 和四项义务。本路线只在各自身份上继续读取独立的外部交收结果、内部证券/资金工作纸和结算勾稽资料，不把后续账户余额或结果资料冒充前置输入。

本路线训练的是交收后结果承接、余额复算、证券/资金双向零差和正常封账，不重做成交汇总，不教股票成本费用、估值、会计分录或会计科目。`NORMAL_CLOSED` 只在本案例身份一致、义务/结果匹配、四条收付差额和两条余额差均为零且对账状态为 `RECONCILED` 时记录。

## 2. 原材料定位

| 材料定位 | 证据性质 | 支持的业务关系 | 正式承载 |
| --- | --- | --- | --- |
| `场内/场内业务介绍.pptx` Slide 6、13-16、19-27、29-34 | `DIRECT` | 托管行视角下的场内市场；登记结算、清算与交收的定义；法人/分级结算；托管行结算模式；结算数据接收、处理、交收和结果反馈链 | 知识卡 1-3、示范步骤 1-5、来源映射 |
| `场内/场内例题.docx` P3-P65 | `DIRECT_WITH_BOUNDARY` | 核对场内岗位使用的清算、结算、交收和托管行/券商模式术语 | 知识卡和示范的业务语境；历史时点、比例、账户号码、平台名称和费率只作排除说明 |
| `场内结算规则/深圳分公司证券资金结算业务指南（2022年3月修订版）.pdf` p8-9、p42-50、p82-86 | `DIRECT_WITH_VERSION_BOUNDARY` | 结算包含清算与交收；成交结果和其他业务数据形成证券/资金清算结果；结算数据发送、交收对象、交收结果反馈和数据资料关系 | 知识卡 1-3、示范步骤 1-5、四条差额和两条余额链 |
| `场内结算规则/上海、深圳港股通存管结算业务指南.pdf` | `BOUNDARY_ONLY` | 港股通具有跨境存管、清算、交收、换汇、未交收头寸和公司行为等专门安排 | 港股通保持 `BUILDING`，不进入题面或答案 |
| `场内结算规则/上海、北京、深圳 QFII/RQFII 境内证券投资登记结算业务指南.pdf` | `BOUNDARY_ONLY` | 合格境外投资者具有专门的资格、账户、托管和结算参与安排 | QFII/RQFII 本批 `DEFER`，不进入题面或答案 |
| `场内结算规则/上海、北京货银对付改革参考版指南.pdf` | `BOUNDARY_ONLY` | 参考版材料明示为货银对付改革相关测试参考，含其专门安排 | 改革测试、标识、锁定、多批次、违约处置、时点和阈值不固化 |

上述表覆盖场内目录的 10 份材料：1 份场内业务介绍、1 份场内例题、1 份深圳证券资金结算指南、2 份港股通指南、3 份 QFII/RQFII 指南和 2 份货银对付改革参考版指南。正式案例只使用前三项中能支撑正常结果链的关系，后七项仅用于边界判断。

## 3. 直接证据摘要

### 3.1 场内业务介绍

- Slide 6 从托管行获取交易结算数据的视角区分场内和场外市场，支持把场内资料处理作为结算数据承接问题，而不是重新定义交易。
- Slide 13-16 说明交易所市场的登记结算机构以及“结算 = 清算 + 交收”的定义。清算回答相互债务责任，交收回答证券或资金转移履行义务。
- Slide 19-22 说明法人结算、分级结算和结算模式。路线因此保留前置义务、外部结果和内部工作纸三个不同资料层，不把投资者层或内部岗位名称写进答案。
- Slide 24-27 说明托管行结算模式下交易数据、结算数据和交收情况之间的承接关系。路线使用业务对象和结果工作纸，不固化其中的历史资金要求或时间参数。
- Slide 29-34 说明场内清算业务包含交易后的证券、资金清算交收，以及接收数据、规则处理、指令生成、清算交收和结果登记的日常处理链。路线把它收敛为正常交收结果、余额复算和零差封账。

### 3.2 深圳证券资金结算业务指南

- p42-43 将结算分为清算与交收，说明法人/分级结算、资金交收账户和证券/资金清算结果之间的关系；路线只抽象业务对象和结果来源，不写账户代码。
- p43-44 说明根据成交结果及其他业务数据计算应收/应付证券并形成资金清算结果，再发送清算数据；路线用前置四项义务承接这层关系，不重复成交汇总。
- p47-50 说明交收前后的资金/证券结果反馈关系；路线使用“外部结果 vs 内部工作纸”的四条双向差额，不复制历史批次、时点、平台或指令条件。
- p82-86 展示结算数据及对账/结果资料的类别；路线抽象为外部交收结果、内部证券/资金工作纸和结算勾稽资料，不把文件名或接口作为教学规则。

### 3.3 场内例题的边界处理

场内例题含最低备付、RTGS 勾单时点、港股通安排、账户号码、比例和平台名称等历史业务题。它只用于核对场内岗位术语和正常处理语境；本路线不把这些值写进 Demo A、Comprehensive B、基础练习答案、Rubric 或证据规则。

## 4. 合成案例政策

案例值均标记为 `SYNTHETIC_EDUCATIONAL`、`ONLY_THIS_CASE`。材料支持的是资料角色和业务关系，不支持把案例值推广为永久规则。

| 案例 | 身份 | 证券余额链 | 资金余额链 | 双向差额与状态 |
| --- | --- | --- | --- | --- |
| Demo A | `EX-A-20260818-017` / `2026-08-18` / `EXA-SEC-01` | `4800 + 2000 - 500 = 6300 share` | `120000.00 + 23500.00 - 47120.00 = 96380.00 CNY` | 收到/交付证券差 `0/0`；收到/支付资金差 `0.00/0.00`；`MATCHED`、`RECONCILED`、`NORMAL_CLOSED` |
| Comprehensive B | `EX-B-20260821-284` / `2026-08-21` / `EXB-SEC-01`（承接 CORE B） | `7600 + 2000 - 700 = 8900 share` | `205000.00 + 18900.00 - 54100.00 = 169800.00 CNY` | 收到/交付证券差 `0/0`；收到/支付资金差 `0.00/0.00`；`MATCHED`、`RECONCILED`、`NORMAL_CLOSED` |

证券数量精度为整数、容差为 `0`；资金金额精度为两位小数、容差为 `0.01`。A/B 保持相同资料结构、余额公式、四条双向差额、结果状态和封账条件，但使用不同业务键、日期、证券代码、数量、金额和余额。

## 5. 综合实务 workItem 闭合映射

| workItem | source | reference | rule | remediation |
| --- | --- | --- | --- | --- |
| `clr-ex-b-core-source` | 前置义务业务键、日期、证券代码和四项义务 | `CLR-EX-FUNDS-REF-CORE`、场内介绍 | `CLR-EX-FUNDS-RULE-SOURCE` | `CLR-EX-FUNDS-SOURCES` / KC-01 / Q1 |
| `clr-ex-b-external-source` | 外部结果业务键、日期、证券代码、四条收付和状态 | 场内介绍、深圳资金结算指南 | `CLR-EX-FUNDS-RULE-SOURCE` | `CLR-EX-FUNDS-SOURCES` / KC-01 / Q1 |
| `clr-ex-b-security-closing` | 内部证券 opening、receive、deliver、closing | 场内介绍、深圳资金结算指南、前置义务 | `CLR-EX-FUNDS-RULE-SECURITY-BALANCE` | `CLR-EX-FUNDS-BALANCE` / DEMO-03 / Q2 |
| `clr-ex-b-cash-closing` | 内部资金 opening、cashIn、cashOut、closing | 场内介绍、深圳资金结算指南、前置义务 | `CLR-EX-FUNDS-RULE-CASH-BALANCE` | `CLR-EX-FUNDS-BALANCE` / DEMO-03 / Q2 |
| `clr-ex-b-security-receive-diff` | 外部收到证券、内部 receive、结算资料差额 | 深圳资金结算指南、场内介绍 | `CLR-EX-FUNDS-RULE-SECURITY-DIFF` | `CLR-EX-FUNDS-SECURITY-RECON` / DEMO-04 / Q4 |
| `clr-ex-b-security-deliver-diff` | 外部交付证券、内部 deliver、结算资料差额 | 深圳资金结算指南、场内介绍 | `CLR-EX-FUNDS-RULE-SECURITY-DIFF` | `CLR-EX-FUNDS-SECURITY-RECON` / DEMO-04 / Q4 |
| `clr-ex-b-cash-in-diff` | 外部收到资金、内部 cashIn、结算资料差额 | 深圳资金结算指南、场内介绍 | `CLR-EX-FUNDS-RULE-CASH-DIFF` | `CLR-EX-FUNDS-SECURITY-RECON` / DEMO-04 / Q4 |
| `clr-ex-b-cash-out-diff` | 外部支付资金、内部 cashOut、结算资料差额 | 深圳资金结算指南、场内介绍 | `CLR-EX-FUNDS-RULE-CASH-DIFF` | `CLR-EX-FUNDS-SECURITY-RECON` / DEMO-04 / Q4 |
| `clr-ex-b-securities-ledger` | 内部证券双向变动、余额和状态 | 场内介绍、深圳资金结算指南 | `CLR-EX-FUNDS-RULE-SECURITY-LEDGER` | `CLR-EX-FUNDS-LEDGER` / KC-02 / Q3 |
| `clr-ex-b-cash-ledger` | 内部资金双向变动、余额和状态 | 场内介绍、深圳资金结算指南 | `CLR-EX-FUNDS-RULE-CASH-LEDGER` | `CLR-EX-FUNDS-LEDGER` / KC-02 / Q3 |
| `clr-ex-b-obligation-result-match` | 前置义务、外部结果和结算资料身份及四项对象 | CORE、场内介绍、深圳资金结算指南 | `CLR-EX-FUNDS-RULE-OBLIGATION-RESULT` | `CLR-EX-FUNDS-CLOSE` / KC-03 / Q4 |
| `clr-ex-b-securities-recon` | 证券四项差额、证券余额差和对账状态 | 深圳资金结算指南、场内介绍 | `CLR-EX-FUNDS-RULE-SECURITY-DIFF` | `CLR-EX-FUNDS-SECURITY-RECON` / DEMO-04 / Q4 |
| `clr-ex-b-cash-recon` | 资金四项差额、资金余额差和对账状态 | 深圳资金结算指南、场内介绍 | `CLR-EX-FUNDS-RULE-CASH-DIFF` | `CLR-EX-FUNDS-SECURITY-RECON` / DEMO-04 / Q4 |
| `clr-ex-b-close-status` | 义务/结果匹配、证券/资金总差和余额差、对账及封账状态 | CORE、场内介绍、深圳资金结算指南 | `CLR-EX-FUNDS-RULE-CLOSE` | `CLR-EX-FUNDS-CLOSE` / DEMO-05 / Q4 |
| `clr-ex-funds-b-conclusion` | 身份、交收后余额、双向差额和封账状态 | CORE、场内介绍、深圳资金结算指南 | `CLR-EX-FUNDS-RULE-CONCLUSION` | `CLR-EX-FUNDS-CONCLUSION` / DEMO-05 / Q4 |

每个 workItem 在 `content/evidence/clearing/ex-funds/CLR-EX-FUNDS-002-evidence.json` 中恰有一条 `source/reference/rule/remediation` 映射；A/B 的 `sourceToRole` 字段集合和 Decimal 链结构同构，但 B 的 opening 余额和后续结果资料独立；Rubric 的 `referenceAnswer.responses`、`evidenceRules` 和 `remediationTargets` 使用同一组稳定 ID。基础练习的 `SHORT_TEXT` 微任务与综合实务的 `SHORT_TEXT` 结论各一项，表达补学目标指向基础短文本题。

## 6. 不覆盖范围

- 不重做成交汇总，不把成交数据直接当作交收结果。
- 不教股票成本、费用、估值、会计分录、会计科目或券结基金备付金。
- 港股通、QFII/RQFII、货银对付改革参考版、公司行为、缺券失败、资金不足、部分交收、重付、应急和系统故障不形成案例、答案或评分条件。
- 历史固定时点、费率、账户代码、平台/接口文件名、最低备付比例、永久净额算法和真实客户数据不进入公开或私有答案。
- `NORMAL_CLOSED` 是本案例由匹配、双向零差、余额差为零和 `RECONCILED` 共同推出的结果，不是对所有业务的永久状态约定。
