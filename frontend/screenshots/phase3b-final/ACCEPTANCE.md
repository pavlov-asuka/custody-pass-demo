# 阶段 3B-6｜最终全量回归与视觉验收

> 最终画布：`1440 × 900`、`1920 × 1080`
>
> 截图目录：`frontend/screenshots/phase3b-final/`
>
> 视觉事实源：`frontend/DESIGN.md`
>
> 本目录独立于 `phase3/`、`phase3b-gate/`、`phase3b-expanded/`；三组既有目录未被覆盖。

## 1. 验收结论

- [x] 52 张 PNG 均由最终代码生成；其中所有带 `-1440`、`-1920` 的 41 张主截图分别严格为 `1440 × 900`、`1920 × 1080`。
- [x] 登录、三世界、地图、四环节、异常案例、评分双态、结果双态、补学、记录、用户菜单与历史详情均完成两档桌面复核。
- [x] 基础练习额外覆盖未选、聚焦、已选、按钮可用/禁用/按下、正确、错误和自动推进。
- [x] 动态页面使用可见标题、`data-testid`、按钮消失/出现和下一题题干等稳定条件，不以固定长等待代替状态断言。
- [x] 未发现页面横向溢出、文字截断、空白按钮、状态只靠颜色、同一视口多个主小托或旧视觉体系回退。
- [x] 页面以白/近白为主；高饱和色只承担推进、选中、等待、补学和技术状态。

## 2. 两档逐屏视觉结论

| 页面/状态 | 1440 × 900 | 1920 × 1080 | 具体验收证据与结论 |
|---|---|---|---|
| 登录 | `01-login-1440.png` | `01-login-1920.png` | 左侧欢迎情境与右侧登录区关系稳定；近白画布、轻边框输入、蓝色聚焦和绿色主按钮清楚；无注册、奖励或社交入口。 |
| 三世界 | `01-worlds-1440.png`、`02-worlds-1440.png` | `01-worlds-1920.png`、`02-worlds-1920.png` | 恰好三个世界；核算开放，清算/监督建设中；共享白画布、核算唯一绿色 CTA；正式场景 WebP 无白边或水印。 |
| 核算地图与节点 | `03-accounting-map-1440.png`、`04-map-1440.png`、`06-map-remediation-1440.png` | `03-accounting-map-1920.png`、`04-map-1920.png` | 路线名、章节、节点标签和文字状态齐全；当前、已通过、待补学、锁定/建设中不仅靠颜色；小托与节点净距充足。 |
| 地图节点细节 | `05-map-node-states.png` | — | 组件级截图同时呈现通过、待补学、锁定与建设中节点；尺寸、按压深度和状态层级符合地图规范。 |
| 知识卡 | `04-knowledge-card-1440.png` | `04-knowledge-card-1920.png` | 30px/700 核心判断为主体；单一流程、轻提示、正式拿书姿态；没有总深框、卡套卡或评分信息。 |
| 正常示范 | `05-demonstration-1440.png` | `05-demonstration-1920.png` | 纵向时间线保留角色、产品、日期与事实；动作/原因成对；完成绿、当前蓝、未来灰且有文字结构。 |
| 基础练习空态 | `06-basic-practice-1440.png`、`07-practice-empty-1440.png` | `06-basic-practice-1920.png`、`07-practice-empty-1920.png` | 顶部四环节进度、问题主体、选项和底部行动区层级稳定；未选择时主按钮明确禁用。 |
| 基础练习交互态 | `09-practice-focus.png`、`10-practice-selected.png`、`12-practice-submit-pressed.png` | — | 键盘焦点 3px 外轮廓可见；选中使用蓝色、图标和边界；按压深度只作用于按钮。 |
| 基础练习反馈态 | `13-practice-correct.png`、`14-practice-wrong.png`、`15-practice-advancing.png` | — | 正确/错误均有图标、文字和局部反馈带；正确后无残留提交按钮并自动推进；错误后保留重新提交。 |
| 异常案例 | `07-exception-case-1440.png` | `07-exception-case-1920.png` | 1120px、36/64 双栏；左侧安静事实/任务，右侧完整长文本输入；草稿状态弱化，提交答案为唯一绿色主行动。 |
| 评分等待 | `08-scoring-wait-1440.png` | `08-scoring-wait-1920.png` | 开放白色舞台、正式等待姿态、蓝色不确定进度；明确答案已保存、不会重复评分、可返回地图；无伪造百分比。 |
| 评分技术失败 | `09-scoring-failed-1440.png` | `09-scoring-failed-1920.png` | 与学习结论严格分离；红色仅为小标签；明确答案保留、重试原作答、不新建记录。 |
| 通过结果 | `10-result-passed-1440.png` | `10-result-passed-1920.png` | 庆祝姿态和少量彩纸先呈现；总分/门槛/结论同层；四维同色行条；返回地图是唯一绿色主 CTA。 |
| 通过后地图 | `11-map-after-pass-1440.png` | `11-map-after-pass-1920.png` | 路线显示“已通过 · 4/4”，后续节点状态来自服务响应；未由前端分数推导解锁。 |
| 未掌握结果 | `12-result-remediation-1440.png` | `12-result-remediation-1920.png` | 温和橙黄局部状态；首屏同时说明结论、原因和下一步；关键遗漏先于四维；补学为主 CTA，不称为失败。 |
| 定向补学 | `13-remediation-1440.png` | `13-remediation-1920.png` | 220px 轻侧轨与单目标主体；遗漏原因→对应知识→针对练习自然流动；支持姿态只出现一次。 |
| 补学完成 | `14-remediation-complete-1440.png` | `14-remediation-complete-1920.png` | 全部目标完成后才突出“重新挑战完整异常案例”；没有把单题或补学完成直接显示为路线通过。 |
| 训练记录 | `15-records-1440.png` | `15-records-1920.png` | 计数融入副标题；筛选轻量；白底记录行与 1px 分隔；时间、路线、状态、结果和四维摘要齐全。 |
| 用户菜单 | `16-user-menu-open-1440.png` | `16-user-menu-open-1920.png` | 256px、1px 浅灰边、16px 圆角；38px 头像；仅身份、脱敏员工号、训练记录和退出；退出红色面积受控。 |
| 历史详情 | `17-record-detail-history-not-mastered-current-passed-1440.png` | `17-record-detail-history-not-mastered-current-passed-1920.png` | 首屏同时显示不可修改快照、提交时间、历史未掌握和路线当前已通过；当前状态没有覆盖旧结论。 |

## 3. CSS 选择器可达性与清理证据

`tests/style-audit.mjs` 将仍需保留的旧结构选择器映射到实际组件，并对样式本体执行硬约束。结论如下：

| 选择器组 | 实际组件/路由/状态 | 可达性结论 | 3B-6 处理 |
|---|---|---|---|
| `.route-stepper`、`.lesson-card`、`.knowledge-card__conclusion`、`.demo-timeline` | `LearningPage` 的知识卡、示范、练习与异常案例 | 可达 | 保留结构规则；颜色迁至正式令牌；实体边框降至 1px/状态 2px；字重归一到 700；移除静态硬下沿。 |
| `.practice-question`、`.choice-list`、`.ordering-list`、`.feedback` | `PracticeQuestion`，由 `RemediationPage` 复用 | 可达 | 不盲删；保留补学练习结构并迁移为 3B 状态边界、无静态硬阴影。 |
| `.exception-case`、`.answer-editor`、`.modal`、`.conflict-preview` | 异常案例、正式提交确认、revision 冲突、离页保护 | 可达 | 容器改为 1px 浅边；状态边为 2px；输入聚焦 2px 蓝；弹窗不再使用 4px 深框和硬下沿。 |
| `.scoring-wait`、`.scoring-failed`、`.result-view`、`.dimension` | 评分等待、技术失败、通过/未掌握结果 | 可达 | 移除深框、静态硬阴影和 800/900 字重；结果结构继续由 `phase3b.css` 细化。 |
| `.record-filters`、`.record-row`、`.record-detail-header` | 训练记录、筛选、详情与历史快照 | 可达 | 行与筛选改为轻边/分隔，无硬阴影；状态继续使用文字、图标与轻色。 |

自动审计结果：

- `global.css` 旧语义令牌引用：`0`；`tokens.css` 已删除 30 个阶段 3 过渡令牌。
- `global.css` 3px 以上实体容器边框：`0`；保留 `:focus-visible` 的 3px 外轮廓。
- `font-weight: 800/900`：`0`。
- 渐变、玻璃拟态、`drop-shadow` 炫光、桌面宽度断点：`0`。
- 仍可达的结构规则已经在 `global.css` 本体迁移，不依赖 `phase3b.css` 后加载才变得合规。

## 4. 功能全量回归证据

| 能力 | 验证证据 | 结论 |
|---|---|---|
| 登录、会话恢复、Cookie、动态 CSRF、未授权、退出与绝对超时 | `CustodyTrainingApplicationTests` 14 项；页面测试初始未授权重定向、登录后会话恢复与动态 CSRF 请求头断言 | 通过 |
| 三世界、开放/建设中、地图、进度与解锁 | 内容校验；`LearningFlowApplicationTests` 的世界/地图/通过解锁；两档页面断言和截图 | 通过 |
| 四环节顺序与复习 | `firstLearningSequenceIsEnforcedButCompletedStepsCanBeReviewed`；页面逐步进入知识卡、示范、练习、异常案例 | 通过 |
| 基础练习全部关键态与至少答对一次 | `basicPracticeRequiresEveryQuestionCorrectOnceAndNeverReturnsAnswerKey`；门槛脚本 2 次提交及 9 个视觉关键态 | 通过 |
| 草稿自动保存、revision 冲突、离页保护 | 后端版本化/隔离测试；页面测试断言 revision PUT、冲突取舍和未保存环节切换拦截 | 通过 |
| 幂等正式提交、异步评分、技术失败与同一作答重试 | 后端幂等/不可变 attempt/原 attempt 重试测试；页面测试正式提交、等待、失败和 attempt `44` 重试 | 通过 |
| 通过、未掌握、硬性项、四维、补学与完整案例重试 | 后端硬性项覆盖、补学不直接通过、挑战解锁；页面双态结果与补学完成断言 | 通过 |
| 已通过后低分复习不撤销通过 | `lowReviewAfterPassKeepsRoutePassedButRecordsCurrentConclusion`；历史详情双标签截图 | 通过 |
| 训练记录筛选、历史快照、用户隔离与无私有评分泄露 | 后端分页/筛选/不可变/隔离和公开内容泄露测试；页面列表、菜单、详情断言 | 通过 |

统一脚本最终结果：

- `scripts/validate-content.ps1`：15 个 JSON、1 条正式路线、4 份 Schema，通过。
- `scripts/test-backend.ps1`：41 tests，0 failures / 0 errors / 0 skipped。
- `scripts/build-frontend.ps1`：typecheck 与生产构建通过，1616 modules。
- `scripts/build-app.ps1`：同源 JAR 构建通过，复制 20 个前端生产资源。
- `scripts/verify-all.ps1`：隔离端口 `18080` 与 `.local` 随机 H2 数据库通过；HTTP smoke 为 `COMPLETED/PASSED`、下一节点解锁、训练记录存在。
- `npm run test:styles`、两档 `npm run test:pages`、最终 `node tests/gate-shots.mjs`：全部通过。

## 5. 字体与插画生产包

### 字体

| 文件 | 发布字节 |
|---|---:|
| `noto-sans-sc-400.woff2` | 1,028,488 |
| `noto-sans-sc-500.woff2` | 1,029,112 |
| `noto-sans-sc-700.woff2` | 1,028,864 |
| `nunito-400.woff2` | 24,828 |
| `nunito-500.woff2` | 24,840 |
| `nunito-700.woff2` | 24,880 |
| **合计** | **3,161,012** |

- 生产包恰好 6 个 WOFF2，原始发布字节严格小于 `10,000,000`。
- Noto Sans SC 三字重对当前 3,944 个允许字符均为 `0` 缺字；覆盖中文业务文案、数字、日期、金额和标点。
- 页面测试等待 `document.fonts.ready` 并断言 Nunito、Noto Sans SC 浏览器实际可用。
- 6 个 `@font-face` 均为自托管、`font-display: swap`；字体栈保留 Segoe UI、微软雅黑与 system-ui 回退；授权为 SIL OFL 1.1。

### 插画

- 生产包恰好 10 张 WebP：3 张世界场景、7 张小托正式姿态；均为 RGBA 透明图。
- 10 张文件 SHA-256 均不同，没有重复成品；尺寸保持世界 1100px 宽、小托 512px 宽。
- 逐屏截图和像素边界检查未见白底、水印、损坏或裁切；透明内容 bbox 四周保留 1—5px 安全边。
- 生产 JS 只引用 10 张正式 WebP；原始 PNG 与 `process_illustrations.py` 未进入 `dist`。

## 6. 禁止项、限制与停止边界

- 禁止项扫描为 0：XP、等级、连续学习、红心、排行榜、商城、Lingots、独立问答、三条线快速切换、移动端业务分支。
- 前端只读取服务返回的 `conclusion`、`progressPercent`、`currentRouteState` 和 `challengeUnlocked`；没有根据分数推导通过、进度或解锁。
- 生产页面未显示答案、Rubric、硬性项内部明细、评分关键词、内部项目 ID、模型名称或参数。
- 本轮未修改后端、契约、API 客户端、路由定义或数据模型；契约变更请求：无。
- 已知限制：知识卡契约仍没有公开原材料 URL，因此没有虚构入口；技术失败继续复用正式 `RESULT_SUPPORT` 姿态，不新增第八张资产。

**阶段 3B-6 已完成，阶段 3B 施工已停止，未启动阶段 4。**
