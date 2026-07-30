# 阶段 3B-4 视觉闸门修订|施工交接 Handoff

> 交接原因:原施工 session(Kimi)额度耗尽,插画资产已生产完毕,代码改造未开始。
> 接手对象:新的前端施工模型 session。
> 本文件是本轮修订的唯一施工入口,请完整阅读后再动手。

## 1. 任务定位

- 仓库:`D:\coding\Project\CCBAGENT-CODEX\Repository`
- 分支:`codex/learning-map-rebuild`
- 交接时 HEAD:`62fb1c9`(docs: add phase 3b construction report)+ 交接提交(见第 9 节)
- 阶段 3 功能基线:`025a0ebe9bfe5ed12a194ce94ff767d9eb69ba68`
- 本轮是 **3B-4 视觉闸门修订**,不是 3B-5。只修复主控在第一次 3B-4 验收中指出的三项视觉阻断,不得扩展任何其他页面。

## 2. 必读文档(按顺序)

1. `frontend/DESIGN.md`——唯一视觉事实源
2. `docs/handoffs/phase3b-frontend-visual-brief.md`——阶段 3B 正式施工 Brief
3. `frontend/PHASE3B-REPORT.md`——第一轮施工报告
4. `../discussion_log.md`(仓库外层 `D:\coding\Project\CCBAGENT-CODEX\discussion_log.md`)——重点读「44.11 阶段 3B-4 第一轮视觉闸门主控复核」
5. 用户下发的本轮修订任务(三项阻断的具体要求,第 3 节已转述要点)
6. `design-assets/xiaotuo/xiaotuo-character-baseline-v1.png`——小托身份基准

## 3. 三项阻断项(主控原意)

1. **三世界入口仍是三张大卡片**:外围完整白色卡片框+道具图标组合,1920×1080 下主体集中中部、上下空洞。要改成共享白色画布上的三个**开放式学习世界场景**(独立地台/场景地形/前中背景/边缘自然消失在白画布),移除卡片容器;三列等权保留;只有核算可进入(绿态+主按钮);清算/监督完整场景但整体去饱和,「内容建设中」不能像按钮;不加统计卡/XP/游戏经济;不要大面积深色背景/渐变/玻璃/硬卡片框;成熟专业,不做儿童游戏地图。
2. **世界场景与小托是低精度内联手写 SVG**,与身份基准差距明显。要求使用正式插画资产(独立 PNG/WebP/正式 SVG),React 组件只负责姿态、尺寸、语义和布局,不再承担绘制。**资产已生产完毕(见第 4 节),此项的主要工作是把组件切换到资产渲染。**
3. **基础练习正确反馈右下空白灰色按钮**:正确反馈后仍渲染被禁用的「检查答案」按钮,禁用文字对比极低呈空白控件,约 650ms 后自动推进。要求:保留自动推进逻辑,正确反馈后**隐藏提交按钮**,在原行动位置显示非交互状态文字(「即将进入下一题…」/最后一题时「即将完成基础练习…」),可加轻量等待指示但不伪造进度;反馈带保持浅绿;截图中完整可读;增加测试断言。

已通过、**不得推倒重做**的部分:功能与接口边界、字体方案(<10MB)、地图路径/节点/标签/首屏结构、基础练习题面/选项/反馈带/底部行动栏结构、公共颜色/间距/边框/按压深度体系、typecheck/test:pages/build。

## 4. 已完成的插画资产(交接提交内)

### 4.1 成品资产(`frontend/src/assets/illustrations/*.webp`,透明背景,已去水印)

| 文件 | 用途 | 规格 | 内容 |
|---|---|---|---|
| `xiaotuo-wave.webp` | 小托·欢迎挥手 | 512×665, 64KB | 全身,右手高举挥手 |
| `xiaotuo-point.webp` | 小托·指路 | 512×716, 63KB | 全身,右手指向右侧,左手叉腰 |
| `xiaotuo-think.webp` | 小托·思考/温和提示 | 512×740, 65KB | **半身**(源图为半身构图,短裤下沿为止,无腿部;反馈区使用完全合适),托腮思考 |
| `xiaotuo-book.webp` | 小托·拿书讲解 | 512×788, 72KB | 全身,双手捧书 |
| `xiaotuo-wait.webp` | 小托·等待 | 512×861, 72KB | 全身,抱写字板安静等待 |
| `xiaotuo-support.webp` | 小托·安慰 | 512×700, 66KB | 全身,双臂温和张开 |
| `xiaotuo-celebrate.webp` | 小托·庆祝 | 512×556, 56KB | 全身,双臂高举+稀疏彩纸 |
| `world-clearing.webp` | 清算世界场景 | 1100×687, 75KB | 金色货币仓+蓝色证券仓+桥+双向交收箭头+对勾+云 |
| `world-accounting.webp` | 核算世界场景 | 1100×802, 62KB | 打开账簿+绿色计算器+对勾章+金币+铅笔+云 |
| `world-supervision.webp` | 监督世界场景 | 1100×638, 67KB | 紫色盾牌+黄旗界桩虚线+蓝色望远镜+云 |

### 4.2 资产来源与合规

- 生产方式:ImageGen 图生图(小托以 `design-assets/xiaotuo/xiaotuo-character-baseline-v1.png` 为输入,`input_fidelity=high`)+ 文生图(场景);统一「扁平矢量、纯色平涂、深蓝轮廓、无渐变」风格。
- 原图(白底 PNG,每张约 1MB)已随交接提交保存在 `frontend/src/assets/illustrations/` 同名原始文件中,作为可复现输入保留。
- 后处理:`frontend/scripts/process_illustrations.py`(边缘洪水填充去白底 → 裁平台水印 → 内容 bbox → 缩放 → WebP q92)。重跑:`python frontend/scripts/process_illustrations.py`(JOBS 表含全部源图映射)。
- 小托姿态均保持身份基准特征:蓝色珊瑚鹿角、蓝色额前毛、白色蓬松头部、大圆黑眼带高光、粉耳内、蓝色翻领工作服、深蓝短裤、蓝鞋;同一角色模型,姿态间无角色漂移。
- 未复制 Duo 或任何第三方受保护角色;不使用 Emoji/通用人物图标/低保真占位。
- 若需新增/替换姿态:优先复用基准图走同一图生图流程,再跑处理脚本;注意生成文件名按时间戳,同秒并发会互相覆盖(本轮已踩过,请串行生成)。

## 5. 待办施工步骤(按顺序)

### 5.1 `frontend/src/components/Mascot.tsx`(重写为资产渲染)

- 保留对外 API 不变:`pose`、`size`('small'|'medium'|'large')、`message`、`className`。其他页面(AttemptPage/ResultView/RemediationPage/LoginPage/ExceptionCaseStep)均在引用,不能破坏。
- pose → 资产映射:
  - `WELCOME_WAVE` → xiaotuo-wave
  - `GUIDE_POINT` → xiaotuo-point
  - `THINKING` → xiaotuo-think
  - `READ_WITH_BOOK` → xiaotuo-book
  - `SCORING_WAIT` → xiaotuo-wait
  - `RESULT_SUPPORT` → xiaotuo-support
  - `CELEBRATE` → xiaotuo-celebrate
- 用 Vite 静态导入(`import waveUrl from '../assets/illustrations/xiaotuo-wave.webp'`)渲染 `<img>`,删除全部内联手写 SVG。保留 `role="img"`、`aria-label="小托"` 与气泡 `.mascot__bubble`。
- 尺寸(CSS 在 `global.css` 的 `.mascot--*` 段,允许按本轮需要微调):三世界标题区 100—140px(small=120 已合规);地图 140—190px(MapTrack 当前传 small=120,**需要改为 medium=140**);学习反馈 120—170px;净距 ≥24px;一视口一个主角色。
- `xiaotuo-think` 是半身像,按宽缩放即可,不要强行补脚。

### 5.2 `frontend/src/components/WorldScene.tsx`(重写为资产渲染)

- line → 资产映射:CLEARING/ACCOUNTING/SUPERVISION → 对应 world-*.webp,`<img>` 渲染,删除手写 SVG。
- 保留 `building` 属性:建设中世界用 CSS `filter: saturate()` 整体去饱和(现有 `.world-scene.is-building svg` 滤镜改写到 img),不要画第二套图。

### 5.3 `frontend/src/pages/WorldsPage.tsx` + 对应 CSS(修订项 1 主战场)

- 移除三世界外围完整卡片框(边框/圆角/卡片背景/卡片阴影),三列改为共享白画布上的开放式场景列。
- 建议结构(可微调,但不得退回卡片):
  - 每列:上部 WorldScene 大图(透明背景,直接坐白画布,1440 下高度约 320—380px,1920 下主体必须舒展,不能中部一小团);下部轻量文字区(kicker、世界名、一句职责、状态/进度、行动),左对齐或居中,无边框无卡片底。
  - 核算:场景鲜活 + 绿色当前状态 + `.b3-btn--primary` 主按钮「进入学习地图」。
  - 清算/监督:场景 `saturate()` 去饱和 + 「内容建设中」灰药丸标签(必须保持文本精确为「内容建设中」,page-test 有断言)+ 无按钮。
- **必须保留**:`data-testid="world-grid"`;三个世界列容器继续使用 `.world-card` class 名(`tests/page-test.mjs` 断言 `.world-card` 数量为 3;只改视觉不改 class 名);「进入学习地图」按钮文本;三列等权;不加统计/XP/快速切线。
- 1920×1080 专项:壳仍按 DESIGN.md(1180—1200px),通过放大场景体量与纵向节奏消除「中部小卡片+上下空洞」感,而不是拉宽壳。

### 5.4 `frontend/src/components/PracticeSession.tsx`(修订项 3)

- 正确反馈后:不再渲染提交按钮;行动区原位显示非交互状态——非最后一题「即将进入下一题…」,最后一题「即将完成基础练习…」;可配轻量循环等待点(不伪造百分比)。
- 保留 650ms 自动推进与 `onCompleted` 回调逻辑不变;错误反馈仍显示「重新提交」。
- 在 `frontend/tests/gate-shots.mjs` 增加断言:正确反馈后页面不存在「检查答案」按钮、状态文字可见、自动推进仍发生(第二题题干出现)。
- `tests/page-test.mjs` 如受布局变化影响可同步最小更新(只允许与本轮状态相关的断言)。

### 5.5 地图页(仅限小托资产替换)

- 只允许:MapTrack 小托换正式指路资产(size 调为 medium=140px,保持净距 ≥24px,必要时微调 `map-track__mascot` 位置)。
- 不得重设计:路径/节点状态/节点尺寸/单元标题带/章节定位带/路线标签/地图业务数据。

### 5.6 截图重拍(`frontend/tests/gate-shots.mjs` + `frontend/screenshots/phase3b-gate/`)

- 覆盖重拍 phase3b-gate,**严禁覆盖 `frontend/screenshots/phase3/`**。
- 至少:三世界 1440/1920 + 核算细节 + 建设中细节 + 开放场景局部细节;地图 1440/1920 + 指路小托净距细节 + 节点状态(保持正确);练习:未选择/已选择/正确/错误/**正确自动推进状态**/错误思考小托。
- 沿用现有编号便于对照,新增「正确自动推进」可用 `15-practice-advancing.png`。

### 5.7 文档更新

- `frontend/screenshots/phase3b-gate/ACCEPTANCE.md`:逐项写明截图编号、**修改前问题、修改后证据**、是否满足 DESIGN.md、是否仍存在限制(不许只写「通过」)。
- `frontend/PHASE3B-REPORT.md`:增加 3B-4 第一次主控驳回原因、本轮每项修复、世界场景与小托资产形式和来源、与身份基准的对应关系、正确反馈修复、新截图清单、测试结果、字体复测、完整提交链、已知问题、工作树状态。

## 6. 验证要求(全部重新运行)

- `npm run typecheck`、`npm run test:pages`、`npm run build`、`git diff --check`
- 字体复测:`dist/fonts/` 仍为 6 个 WOFF2,合计严格 < 10,000,000 bytes(本轮不得修改字体包与流水线)
- 确认:未改 API/路由/后端/数据模型;未改 phase3 历史截图;无移动端代码;无 XP/等级/连续学习/排行榜/独立问答/快速切线;无渐变/玻璃拟态/大面积深色背景;工作树最终干净。

## 7. 提交要求

- 一个独立修订提交:`fix: revise phase 3b visual gate`,不含任务范围外修改。
- 允许修改范围:`WorldsPage.tsx`、`WorldScene.tsx`、`Mascot.tsx`、`PracticeSession.tsx`、相关阶段 3B CSS、`frontend/src/assets/illustrations/`、`frontend/tests/gate-shots.mjs`、相关页面测试断言、`frontend/screenshots/phase3b-gate/`(含 ACCEPTANCE.md)、`frontend/PHASE3B-REPORT.md`、`MapTrack.tsx` 的小托尺寸/位置微调。
- 禁止:后端/契约/API/路由/数据模型;地图业务结构;扩展登录/知识卡/示范/异常案例/评分/结果/补学/记录/详情页;字体包与字体流水线;`frontend/screenshots/phase3/`;启动 3B-5 与阶段 4。

## 8. 完成后报告

向项目主控报告:提交哈希、修改文件、插画资产清单及来源、三项阻断修复证据、测试与构建结果、字体发布总字节、截图目录、已知问题、工作树状态。

最终必须明确写出:

**「已完成 3B-4 视觉闸门修订,仍停在 3B-4,未启动 3B-5,未启动阶段 4。」**

然后停止,等待主控与用户重新验收。

## 9. 交接提交(本 handoff 形成时)

- `chore: add phase 3b illustration assets`:10 张成品 WebP + 生成原图 + 处理脚本 `process_illustrations.py`。
- `docs: handoff phase 3b gate revision`:本文件。

## 10. 接手检查清单(开工前 5 分钟)

- [ ] `git log --oneline -5` 看到交接提交;`git status` 干净
- [ ] `ls frontend/src/assets/illustrations/*.webp` 共 10 张
- [ ] 读完第 2 节全部必读文档
- [ ] 用 Read 查看 xiaotuo-wave/point/think 与三张 world webp,确认资产完好
- [ ] 确认未启动 3B-5、未启动阶段 4 的边界理解无误
