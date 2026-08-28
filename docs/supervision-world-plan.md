# 投资监督世界施工计划

## 全局模式与范围

- targetMode: `PUBLISH_OPEN`
- 模式来源：用户明确要求“开始制作投资监督世界，持续施工到完成”。
- 材料决策：用户在材料缺口报告后明确要求“就用这些资料”，随后补充 M11；本批仅允许使用 M01—M11 可追溯事实，并用显式标记 `SYNTHETIC_EDUCATIONAL / ONLY_THIS_CASE` 的脱敏教学数据构造正常案例。合成数据不得冒充生产事实，不得推断未获材料支持的法规、角色权限、系统流程或异常处置。
- 图片决策：用户明确“可以把所有图片删除”。施工范围内所有源图片、截图、EMF/Visio 预览和图像化界面材料均不进入仓库、不进入课程、不作为正式评分证据；原始 DOCX 保持只读不修改。
- 正式仓库：`/Users/wangjinlan/custody-pass-demo-investment-supervision-v2`
- 原材料绝对路径：主目录 `/Users/wangjinlan/Desktop/wiki_llm_公募基金法律法规知识库/知识岛`；用户新增材料 `/Users/wangjinlan/Downloads/投资监督处运营服务事项-清洁版.docx`。
- 本批目标：依据更新后的投资监督材料，冻结最小、连续、可验证的监督拓扑，完成共享基础、四环节路线、结构化综合实务、Rubric、证据映射、确定性验证、候选开放登记、fresh-context 去 AI 味、真实浏览器闭环、提交、推送和开放态 smoke。
- 明确排除：移动端；XP/等级/连续学习/红心/排行榜/商城/独立问答/三条线快速切换；改动通用契约、UI 结构、数据库、评分维度或视觉基线；补造材料无法支持的路线；提交原始材料、真实机构/产品/人员信息、凭据或内部地址。

## Git 基线与重叠门禁

- 分支：`learning-map-rebuild`
- 跟踪分支：`origin/learning-map-rebuild`
- 历史施工基线：`b1302022c5029dcd4260a0ef8b8c8661c33bee6d`。
- 最终发布提交：`4eaf87ef71b0b451787d595ad00dba9f0a05cef1`（PR #1 已合并）；`origin/learning-map-rebuild` 与本地提交一致，最终工作树干净。
- C1 的 19 个路径和后续 D/E 验收均已完成；当前不再存在候选工作树、未提交或待推送的监督发布变更。
- 历史重叠检查：主 Agent 曾对 C1 路径执行精确 `git status`，均无既有修改或未跟踪重叠；两份旧检出的未提交监督文件原样保护，未读取为现役材料、未覆盖、未清理。
- 保护要求：不 stash、不清理、不覆盖、不重写历史；不创建分支或 worktree；子代理不 commit、不 push。

## 现役边界

- 当前 active release：`CUSTODY_2026.08.12`，59 条正式路线（50 REQUIRED、9 ADVANCED）。
- `ACCOUNTING`、`CLEARING`、`SUPERVISION` 三个世界均为 `OPEN`；监督登记 1 个 region、1 个 module、4 个连续 REQUIRED 节点。
- 现役四环节、公开 HTTP 契约、内容 Schema、四维评分、数据库、桌面视觉和其他世界内容保持不变。
- 发布状态：`APPLIED_C1` 已完成并合并；开放态 smoke 已确认监督世界 OPEN、4 节点、首节点可进入且私有评分资产不泄漏。

## 材料索引

- 两个显式材料位置均存在、可读、非空；排除 `.DS_Store` 后共 11 份材料：2 份 DOCX、9 份 PDF。
- M01：`【汇总清洁版】内控监督处运营服务事项-更新版2025.06.docx`
- M02：`《证券投资基金托管业务管理办法》（证监会令【第172号】）.pdf`
- M03：`公开募集证券投资基金运作管理办法.pdf`
- M04：`中华人民共和国公司法（2023年修订）.pdf`
- M05：`《公开募集证券投资基金信息披露管理办法》.pdf`
- M06：`公开募集证券投资基金投资信用衍生品指引.pdf`
- M07：`中华人民共和国证券法(2019年修订版).pdf`
- M08：`《公开募集开放式证券投资基金流动性风险管理规定》（证监会公告〔2017〕12号）.pdf`
- M09：`《中华人民共和国证券投资基金法》.pdf`
- M10：`关于实施公开募集证券投资基金信息披露管理办法有关问题的规定.pdf`
- M11：`/Users/wangjinlan/Downloads/投资监督处运营服务事项-清洁版.docx`
- 材料 SHA-256 已冻结：M01 `c91ab721…98ec`；M02 `45997315…8985`；M03 `7b0d3248…c72d`；M04 `2ca900fb…04a`；M05 `4d8ac4d0…6e05`；M06 `32592e69…cac1`；M07 `bc6fbc98…388a`；M08 `81355800…cf93`；M09 `71d12aa9…003e`；M10 `ec696e9b…7d24`。对象位置、字段、状态、数字、公式、敏感边界与缺口由 A 阶段对象级审计补录。
- M11 SHA-256：`d9aea826aa40ca06ca461a146a1ae79d232af17bb2ddab21868d46165559f298`；文件于 2026-08-26 14:19 更新，单独执行对象级审计后再进入第二次拓扑裁决。

## 阶段状态

| 阶段 | 状态 | 子代理 | 文件范围 | 证据/验证 | 阻塞 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 0 前置核验与计划 | `PASSED` | 主 Agent | 本计划 | 仓库根、现役文档、Git 基线、材料目录、SHA-256 与监督空位已核验 | 无 | 启动 A |
| A 材料对象级只读审计 | `PASSED` | `audit_operations_docx`、`audit_core_laws`、`audit_disclosure_risk`、`audit_operations_docx_m11` | M01—M11，只读 | M11 与 M01 的 OOXML、表格、媒体、嵌入对象和正文差异已核对；主 Agent抽查年金/保险/理财/QFII、公式、状态、提示函与归档一致 | 无 | 基于 M01—M11 启动最终最小拓扑设计 |
| A→B 拓扑冻结 | `PASSED` | `design_minimum_topology` | 本计划；设计只读 | 用户材料决策与 M11 解除首轮 blocker；冻结 4 条 REQUIRED 连续主链、无 STAGE_GATE/ADVANCED，图片全部排除 | 无 | 启动 B0 |
| B0 共享基础包 | `PASSED` | `write_b0_foundation` | 五个冻结文件 | 主 Agent 复核 `--shared-only` 为 720/720；比例负向变异以非零退出；JSON、py_compile、图片/路径/敏感项扫描和 `git diff --check` 通过；M02/M03 页码定位已修正 | 无 | 启动 B1 |
| B1 合同条款与监督规则可实现性 | `PASSED` | `write_b1_contract` | B1 四个冻结文件 | 主 Agent 使用 Draft 2020-12 正式 Schema 验 route/rubric；四环节、2 份资料、5 个工作项、四维 25/30/25/20、100/75、2 个硬要求及 workItem—Rubric 映射通过；B0 route 721/721、图片/路径/敏感项和 diff 检查通过 | 无 | 启动 B2 |
| B2 监督对象启停与规则生效期 | `PASSED` | `write_b1_contract` | B2 四个冻结文件 | 主 Agent 使用正式 Schema 验 route/rubric；四环节、2 份资料、5 个工作项、日期窗口、N=10→N-1=9、四维/硬要求/workItem 映射通过；B0 route 721/721、安全与 diff 检查通过 | 无 | 启动 B3 |
| B3 每日数据、任务与结果分类 | `PASSED` | `write_b1_contract` | B3 四个冻结文件 | 主 Agent 使用正式 Schema 验 route/rubric；四环节、2 份资料、7 个工作项、3/100=0.0300<5%、导入成功→任务完成→业务异常→待确认、四维/硬要求/workItem 映射通过；错误码排除、B0 route 721/721 和 diff 通过 | 无 | 启动 B4 |
| B4 结果确认与归档闭环 | `PASSED` | `write_b1_contract` | B4 四个冻结文件 | 主 Agent 使用正式 Schema 验 route/rubric；四环节、2 份资料、6 个工作项、确认/豁免双分支、回函/附件/归档、已生成≠已发送、四维/硬要求/workItem 映射通过；B0 route 721/721、安全与 diff 通过 | 无 | 启动 B5 verifier 收口 |
| B5 统一确定性 verifier 收口 | `PASSED` | `write_b0_foundation`（主 Agent 完成负向验收） | `scripts/verify-supervision-content.py` | `--shared-only` 720/720，四条 `--route` 分别 1215/1192/1245/1276 全过，`--full` 2765/2765；评分、workItem、任务状态、生成/发送边界四类临时负向变异均非零退出；py_compile/diff 通过 | 无 | 启动 C0 只读发现 |
| C0 候选开放登记只读发现 | `PASSED` | `discover_c_registration` | 只读现役架构与登记路径 | 已定位 active selector、map/release、来源目录约定、后端/前端登记点、校验常量及相关测试；现役 55 条，新增后 59 条（REQUIRED 50、ADVANCED 9） | 无 | 按冻结 writeSet 启动 C1 |
| C1 候选开放登记 | `PASSED` | `write_b0_foundation` | 19 个冻结路径（详见“C1 冻结 writeSet”，历史记录） | 历史候选 `APPLIED_C1` 已纳入最终发布；监督 verifier 2765/2765；map/release/source 断言通过；后端 62/62；前端 typecheck、build、page/text/style 全过；diff check 通过 | 无；clearing 独立校验的 41 个旧原材料 physical-exists 缺口为基线外部依赖，登记断言通过 | 启动 D fresh-context 独立复核 |
| D Fresh-context 去 AI 味 | `PASSED` | `audit_core_laws`（只读）、`write_b0_foundation`（最小修复）；`discover_c_registration` 因代理额度耗尽未返回 | 8 个冻结修复路径 | 内容、公式、日期、状态链、答案-Rubric、合成边界和安全均通过；共享 fixture 明确为 foundation normal reference，当前登记元数据同步为 OPEN/PUBLISHED；全量 verifier 2868/2868，状态负向变异非零失败 | 无 | 进入 E 完整验收 |
| E 完整验收与发布 | `PASSED` | 主 Agent | 最终发布提交与远端跟踪分支 | verifier 2868/2868；JSON/安全/图片/diff 检查通过；后端 68/68；前端 typecheck/build/page/text/style 通过；同源 JAR 构建成功；隔离服务 API smoke 通过监督 OPEN/4 节点/首节点可进入/私有资产不泄漏；Chromium 页面回归与截图通过；PR #1 已合并为 `4eaf87e`，远端哈希一致 | 无；应用内浏览器实例不可用，但已有真实 Chromium 自动化证据覆盖页面回归 | 无；仅保留真实新人试学和业务人员复核，Fin-X-Scope 内网核验另列为部署环境前置 |

## 当前收口结论

- 工程发布已完成：监督四条路线已进入 `CUSTODY_2026.08.12`，PR #1 已合并，合并提交 `4eaf87e`，本地与 `origin/learning-map-rebuild` 一致；监督 OPEN smoke 和当前自动化回归均已完成。
- 唯一保留的产品验收待办：线下组织 6—8 名真实新人试学，以及至少 2 名业务人员复核；不得用自动化或模拟账号替代。
- Fin-X-Scope 私有 starter、凭据和内网环境核验是部署环境前置，不是本地工程未完成；当前不宣称 Fin-X-Scope 已通过。

## BUILDING / DEFER

- A 阶段共同结论：法规职责、披露时限、流动性阈值、合同监督字段、状态链和公式关系可支撑知识卡与基础规则练习；M01 中的反例、孤立截图和系统说明不能替代正常业务资料包。
- 当前缺口：缺同一案例的完整合同/托管协议/监督事项表、成立与到期依据、持仓/净值/申赎/外部数据、规则参数与版本、任务与异常数量、提示函/回函/归档，以及可脱敏字段字典、权限口径和标准答案。
- 敏感边界：不得公开真实机构/组合/联系人/账号/操作员、未公开持仓与净值、异常和监管信息；M01 截图与元数据不得直接进入正式内容。
- 任何缺少正常资料包、字段、数字、公式或跨来源闭环的主题继续保持 `BUILDING/DEFER`，不进入地图或 release。
- M11 相对 M01 保留旧版年金、保险、理财、QFII/WFOE 业务章节，移除 M01 后增的公募/REITs、非标债 DOTX/XLSX 等内容；它补充了报告、层级、时点与归档说明，但仍没有同一产品共享键、同一数据日连续业务包或两套正常 fixture。
- M11 可支持的新增候选仅作为证据边界：年金监督事项表 1—3 个工作日审阅、季度/年度报告时限；QFII/WFOE 成立/停用增减表、T+1/T+2 监督、30%/24%持股比例提示与外汇衍生品实需原则。没有配套材料的年金/保险/理财/QFII/WFOE 正式路线继续 `BUILDING/DEFER`。

## 首轮 A→B 裁决：EMPTY_TOPOLOGY_DEFER（历史记录，已解除）

以下记录的是 A→B 拓扑冻结前的历史阻塞，不代表当前产品状态。当前 `SUPERVISION` 已完成正式拓扑冻结、登记和开放发布。

- 当时不能冻结任何正式 region、module、route 或 node；`SUPERVISION` 当时保持 `BUILDING` 且 `regions: []`，active release 当时为 `CUSTODY_2026.08.11`。
- 当时仅保留不发布、不分配正式 ID、不计入地图进度的概念候选链：合同与监督事项表审阅 → 产品成立及监督启停 → 母规则/指标/阈值配置 → 当日数据与任务执行 → 结果确认/提示函/回函 → 停用与归档。
- CONTRACT 失败：没有同一产品合同、监督事项表、字段值和正常审阅结论。
- LIFECYCLE 失败：没有同一产品的成立依据、首笔流入、启停记录、A/B 审核与权限闭合。
- RULE 失败：只有公式结构，没有同案分子、分母、阈值、指标因子、规则编码和配置对象。
- DAILY 失败：没有同一数据日的成功导入、封账/估值、任务结果、规则对象和正常结果字段。
- NOTICE 失败：只有状态说明，没有同一记录对应的提示函、收件角色、发送结果、回函和附件。
- ARCHIVE 失败：没有同一产品的停用日期、完整清单、上传结果和归档结论。
- 因而无法合法生成至少 2 份 `sourceMaterials`、至少 3 个结构化 `workItems`、两套同构正常 fixture、Rubric 的确定性 expected 值、referenceAnswer 和定向补学证据映射。

## 最终冻结拓扑与批次

- Region：`SPV-REGION-CORE`，投资监督日常作业。
- Module：`SPV-MODULE-LIFECYCLE`，监督规则与结果闭环。
- 四条路线均为 `REQUIRED`、连续主链，不设 `STAGE_GATE` 或 `ADVANCED`：
  1. `SPV-CONTRACT-001` / `SPV-NODE-CONTRACT-001`：合同条款与监督规则可实现性；无前置。
  2. `SPV-RULE-002` / `SPV-NODE-RULE-002`：监督对象启停与规则生效期；前置 `SPV-NODE-CONTRACT-001`。
  3. `SPV-TASK-003` / `SPV-NODE-TASK-003`：每日数据、任务与结果分类；前置 `SPV-NODE-RULE-002`。
  4. `SPV-CLOSE-004` / `SPV-NODE-CLOSE-004`：结果确认、期限豁免、提示函、回函与归档闭环；前置 `SPV-NODE-TASK-003`。
- 共享合成比例仅使用 M01/M11 明示关系：`B0100001 = B0100002 / B0100003`、`B0100001 < CS_BLXX`、`CS_BLXX = 5%`。教学 A/B 使用 `4/100=4%` 与 `3/100=3%`，只代表本案例计算，不代表真实资产金额。
- 共享日期仅表达 `启用日 ≤ 数据日 < 停用日`、结果确认 → 发函/豁免 → 回函 → 归档；`N=10` 时 `N-1=9`。不推断真实交易日历、生产日期或未获支持的权限。
- B0 writeSet：
  - `content/evidence/supervision/SPV-FOUNDATION-001.json`
  - `content/references/supervision/SPV-FOUNDATION-001-evidence.md`
  - `tests/fixtures/supervision/SPV-A.json`
  - `tests/fixtures/supervision/SPV-B.json`
  - `scripts/verify-supervision-content.py`
- B1 `SPV-CONTRACT-001` writeSet：route、rubric、`content/evidence/supervision/contract/SPV-CONTRACT-001-evidence.json`、对应 evidence Markdown。
- B2 `SPV-RULE-002` writeSet：route、rubric、`content/evidence/supervision/rule/SPV-RULE-002-evidence.json`、对应 evidence Markdown。
- B3 `SPV-TASK-003` writeSet：route、rubric、`content/evidence/supervision/task/SPV-TASK-003-evidence.json`、对应 evidence Markdown。
- B4 `SPV-CLOSE-004` writeSet：route、rubric、`content/evidence/supervision/close/SPV-CLOSE-004-evidence.json`、对应 evidence Markdown。
- 每条路线至少 2 份结构化 `sourceMaterials`、3 个 `workItems`，固定四维 `25/30/25/20`、总分 100、75 分通过及 1—2 个硬要求；A/B 结构同构但键、日期、数值不同。
- verifier 必须校验 Schema、Decimal、日期关系、N-1、允许状态、证据映射、图片/真实实体/绝对源路径扫描，以及“已生成不等于已发送”。
- 年金、保险、理财、QFII/WFOE、披露、流动性、信用衍生品、技术失败、异常码处置和发送失败补救路线继续 `BUILDING/DEFER`。

## C1 冻结 writeSet

- `content/maps/custody-learning-map.json`
- `content/releases/CUSTODY_2026.08.12.json`
- `content/references/supervision-sources.json`
- `README.md`
- `docs/current-state.md`
- `docs/architecture.md`
- `content/README.md`
- `backend/src/main/java/com/ccb/custodytraining/learning/FormalContentCatalog.java`
- `backend/src/main/java/com/ccb/custodytraining/learning/LearningRepository.java`
- `scripts/validate-content.ps1`
- `scripts/verify-clearing-content.py`
- `scripts/run-api-smoke.ps1`
- `scripts/run-phase4-vertical-smoke.ps1`
- `backend/src/test/java/com/ccb/custodytraining/LearningFlowApplicationTests.java`
- `frontend/src/pages/MapPage.tsx`
- `frontend/src/utils/format.ts`
- `frontend/tests/page-test.mjs`
- `frontend/tests/gate-shots.mjs`
- `frontend/tests/text-format-test.mjs`
- 新 release 必须完整保留现役 55 条并追加 4 条监督 REQUIRED 路线；地图版本与 selector 升至 `2026.08.12` / `CUSTODY_2026.08.12`，总数 59、REQUIRED 50、ADVANCED 9。
- `supervision-sources.json` 仅登记 M01—M11 的可发布来源标题、用途和边界，不含绝对路径、图片或真实敏感实体；合成教学内容继续显式标记 `SYNTHETIC_EDUCATIONAL / ONLY_THIS_CASE`。
- `run-phase4-vertical-smoke.ps1` 仅修正现役世界状态断言，使 `ACCOUNTING`、`CLEARING`、`SUPERVISION` 均为 `OPEN`，不扩大既有会计纵向流程范围。

## 恢复施工所需的最小升级材料

1. 一套同一产品、同一产品键的完整脱敏连续包：合同/投资监督事项表 → 成立/首笔流入 → 监督启停 → 母规则/配置 → 当日数据导入 → 封账/估值 → 任务结果 → 结果确认 → 提示函 → 发送状态 → 管理人回函 → 归档索引。
2. 正式字段字典和代码表：产品/组合键、合同版本、规则编码、指标因子、分子/分母/上下限、启停及调整期、数据日、导入/解析/处理、预检/执行、异常、确认/豁免、提示函/回函/归档状态。
3. 至少两套同构正常 fixture：相同资料角色与字段关系，不同产品键、日期和数字；所有数值明确单位、精度、容差与可复算公式。
4. 真实系统角色—操作权限矩阵，明确 A/B 岗及启停、复核、发函、回函、归档权限。
5. 脱敏后可读的业务资料，移除真实机构、组合、账户、联系人、邮箱、操作员和客户信息，但保留字段关系、状态与可核对结果。
6. 法规适用矩阵，明确每条规则对应产品类型、合同条款、法规依据及托管监督职责，避免把通用阈值直接当案例答案。

## 首轮阻塞与恢复

- 首轮 blocker：更新后的知识岛缺正式路线必需的正常业务资料包和可确定性评分口径。
- 用户决定：不再补充外部材料，仅使用本目录；允许以明确教学标记的脱敏合成正常案例填充可由现有字段、公式、日期和状态关系确定的数值。
- 仍然禁止：复用真实截图值、虚构角色权限、把法规阈值写成现役系统事实、补造异常处置、移除来源边界或把合成案例声称为生产案例。
- 恢复点：A→B 重新裁决；只有能够在上述边界内闭合的最小路线才进入 B0，其余继续 `BUILDING/DEFER`。
