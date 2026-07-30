# 阶段 3B 第一轮施工报告（3B-0 至 3B-3，停在 3B-4)

> 仓库:`D:\coding\Project\CCBAGENT-CODEX\Repository`
> 分支:`codex/learning-map-rebuild`
> 阶段 3 功能基线:`025a0ebe9bfe5ed12a194ce94ff767d9eb69ba68`
> 唯一视觉事实源:`frontend/DESIGN.md`
> 施工范围:3B-0 冻结核验、3B-1 视觉基础、3B-2 公共组件、3B-3 三张门槛页、3B-4 截图验收材料

## 一、提交哈希

| 提交 | 哈希 | 内容 |
|---|---|---|
| 提交 1 | `fe968de` | docs: lock phase 3b visual specification(仅 DESIGN.md + 施工 Brief) |
| 提交 2 | `23c31fd` | feat: build phase 3b visual gate(56 文件,+2674/−975,全部位于 frontend/ 与根 .gitignore) |

## 二、修改文件清单

- **样式**:`src/styles/tokens.css`(重写为阶段 3B 设计令牌)、`src/styles/fonts.css`(新)、`src/styles/phase3b.css`(新,903 行)、`src/styles/global.css`(顶栏/用户菜单/小托/四环节进度升级,删除门槛页旧样式)
- **组件**:`src/components/Mascot.tsx`(按基准图重绘 7 姿态)、`src/components/WorldScene.tsx`(新)、`src/components/MapTrack.tsx`(新)、`src/components/PracticeSession.tsx`(新)
- **页面**:`src/pages/WorldsPage.tsx`、`src/pages/MapPage.tsx`(重构)、`src/pages/LearningPage.tsx`(仅基础练习切换为母版,其余环节未动)
- **字体**:`scripts/build_fonts.py`(可复现子集流水线)+ `public/fonts/` 6 个 WOFF2
- **测试与截图**:`tests/gate-shots.mjs`(新门槛截图脚本)、`screenshots/phase3b-gate/`(17 图 + ACCEPTANCE.md)、`screenshots/phase3/`(16 张功能回归基线更新)
- **其他**:根 `.gitignore`(忽略字体源目录与 Python 缓存)

## 三、公共组件清单(3B-2)

1. 设计令牌(颜色唯一语义、字级、4px 间距、圆角、0/1/2px 边框、按压深度、动效时长、减少动态效果)
2. 字体声明与系统字体回退栈
3. `.b3-btn` 按钮系统:主按钮 4px 按压、次按钮 2px、幽灵按钮;禁用/悬停/按下/焦点全状态
4. `.b3-progress` 细进度条
5. 轻量 AppShell 顶栏(68px、白底、1px 浅灰分隔、Logo+用户头像)与用户菜单(300px、轻环境阴影、46px 菜单项、训练记录入口)
6. RouteStepper 四环节进度(40px 圆点、6px 连线、当前蓝环、完成绿勾)
7. 小托情景容器(7 姿态:欢迎/指路/讲解/思考/等待/安慰/庆祝)与短气泡
8. WorldScene 三世界场景(清算=交收箭头与资金桥梁、核算=账簿与计算器、监督=盾牌与边界界桩;统一几何语言,建设中去饱和)
9. MapTrack 地图轨道(SVG S 形路径 10px、普通 80px/当前 92px/里程碑 102px 节点、节点按压 7px、150—190px 常显标签、小托路径留白定位)
10. 单元标题带(720×96)、章节定位带(52px)、模块次级分隔
11. PracticeSession 基础练习母版(顶部进度区 980px、主列 720px、底部行动区 96px、选项默认/选中/正确/错误四态、局部反馈带)

## 四、三个门槛页面完成情况(3B-3)

### A. 三个大型学习世界入口

- 三世界等权并列(壳 1200px,单卡约 357px),上部场景 ≥50%
- 核算:绿色当前状态 + 可按压「进入学习地图」主操作
- 清算/监督:完整去饱和场景 + 「内容建设中」灰标签,无假按钮、无假进度
- 移除文字后可凭场景道具区分三世界;呈现为贴纸式学习世界而非企业门户卡
- 小托 WELCOME_WAVE(120px)+ 短气泡,不遮挡内容

### B. 核算连续长地图

- 路径为页面第一视觉主体;无 Hero、无概要卡压路径
- 顶栏 68px、轻量章节定位带 52px、地图主轴 720px
- 首屏同见:当前单元(绿色标题带)、当前节点(92px 绿星+外环+「继续」药丸)、至少一个后继节点、路径继续方向
- 普通/当前/通过/未掌握/锁定/里程碑六态可辨,图标+文字双通道,不只靠颜色
- 路线名与 `x/4` 进度常显;小托 GUIDE_POINT 位于路径转折留白,净距 ≥24px

### C. 基础练习视觉母版

- 顶部进度区 980px、主列 720px、底部行动区 96px;一屏一个问题
- 页面顺序:进度 → 题干 → 选项 → 局部反馈 → 唯一主行动
- 八态全部产出截图:未选择(浅灰边)/已选择(2px 蓝边淡蓝底)/正确(2px 绿边淡绿底+绿反馈带)/错误(2px 红边淡红底+红反馈带+小托提示)/主按钮禁用/可用/按下(位移 4px 阴影归零)/键盘焦点(蓝色轮廓)
- 错误红只出现在对应选项与局部反馈;无整页失败卡、无侧栏解释

## 五、验证结果

| 项目 | 结果 |
|---|---|
| `npm run typecheck` | 通过 |
| `npm run build` | 通过(1606 模块;CSS 47.13 kB;JS 287.91 kB) |
| `npm run test:pages` | 通过(16 个页面走查与断言全绿,含三世界数量、建设中标签、地图节点状态、草稿自动保存幂等、补学闭环) |
| `git diff --check` | 通过 |
| 接口/路由/数据模型 | 未修改,仍使用阶段 2/3 API 契约 |
| 前端推导检查 | 无通过/解锁/进度/评分的前端推导,状态均由后端返回渲染 |
| 禁用机制扫描 | 无 XP/等级/连续学习/排行榜/独立问答/快速切线/渐变/玻璃拟态/移动端残留 |
| 私有评分内容 | 未接触正确答案/Rubric/关键词/内部评分项/模型信息 |

## 六、字体实测与结论

生产构建产物 `dist/fonts/` 逐文件实测(命令:`npm run build` 后枚举全部字体文件按字节汇总):

| 文件 | 字重 | 原始字节 | gzip | brotli |
|---|---:|---:|---:|---:|
| nunito-400.woff2 | 400 | 24,828 | 24,856 | 24,832 |
| nunito-500.woff2 | 500 | 24,840 | 24,868 | 24,844 |
| nunito-700.woff2 | 700 | 24,880 | 24,908 | 24,884 |
| noto-sans-sc-400.woff2 | 400 | 1,028,488 | 1,028,821 | 1,028,493 |
| noto-sans-sc-500.woff2 | 500 | 1,029,112 | 1,029,445 | 1,029,117 |
| noto-sans-sc-700.woff2 | 700 | 1,028,864 | 1,029,191 | 1,028,869 |
| **合计(6 文件,无重复)** | | **3,161,012** | **3,162,089** | **3,161,039** |

- **体积判定**:最保守口径(gzip 合计)3,162,089 字节,**严格小于 10,000,000**,通过
- **授权**:Nunito(SIL OFL 1.1,Nunito Project Authors)、Noto Sans SC(SIL OFL 1.1,Adobe,Reserved Font Name 'Source');子集产物 name 表保留 copyright/license 字段(nameID 0/13/14)
- **字符集**:ASCII + GB2312 一级字库(3755 汉字)+ 中文标点 + frontend/src、frontend/tests、content/、contracts/、backend Java 实际字符,共 3944 字符
- **覆盖验证**:子集后 Noto Sans SC 三字重对全部 3944 字符零缺字;Nunito 承担拉丁与数字,中文及符号按字体栈回退 Noto Sans SC
- **可复现**:`python frontend/scripts/build_fonts.py`(fontTools 4.63 + brotli;可变字体 instancer → 子集 → WOFF2;源字体 URL 见脚本头注释,源文件不进 Git)
- **回退**:`"Nunito", "Noto Sans SC", "Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif`;`font-display: swap`;`font-synthesis: none` 防止伪造字重

## 七、截图交付清单

目录:`frontend/screenshots/phase3b-gate/`(逐项验收见同目录 `ACCEPTANCE.md`)

- 三世界:`01-worlds-1440.png`、`01-worlds-1920.png`、`02-worlds-accounting-detail.png`、`03-worlds-building-detail.png`
- 地图:`04-map-1440.png`、`04-map-1920.png`、`05-map-node-states.png`、`06-map-remediation-1440.png`
- 基础练习:`07-practice-empty-1440.png`、`07-practice-empty-1920.png`、`08-practice-submit-disabled.png`、`09-practice-focus.png`、`10-practice-selected.png`、`11-practice-submit-enabled.png`、`12-practice-submit-pressed.png`、`13-practice-correct.png`、`14-practice-wrong.png`

## 八、已知问题

1. 旧页面(登录/知识卡/正常示范/异常案例/评分/结果/补学/记录/详情)仍保留阶段 3 页面级旧视觉;顶栏、小托、四环节进度与字体已全局统一,页面级迁移属 3B-5 范围
2. RemediationPage 沿用旧 PracticeQuestion(其样式已保留未删),待 3B-5 统一为母版
3. 清算/监督去饱和场景道具构图可继续打磨,但不影响整体气质判断
4. 错误反馈带上主按钮保持推进绿(唯一主行动语义),红绿相邻为刻意取舍
5. 长地图节点增多后,小托位置与节点密度需在扩展内容时复核截图

## 九、契约变更请求

无。

## 十、当前工作树状态

干净。分支 `codex/learning-map-rebuild`,HEAD `23c31fd`,无未提交或未跟踪文件。

---

**已停在阶段 3B-4 用户视觉闸门,未启动 3B-5,未启动阶段 4。**

停止工作,等待用户和项目主控确认三张门槛页面。用户未明确确认前,不得扩展登录、知识卡、示范、异常案例、评分、结果、补学、记录或详情页。

## 十、3B-4 视觉闸门修订（本轮）

本节是第一次主控复核后的修订记录，覆盖本轮实际施工和验证；前文保留第一轮施工历史。

### 10.1 第一次驳回与修订边界

第一次 3B-4 主控复核确认功能、接口、字体体积和地图业务结构通过，但驳回三项视觉阻断：

1. 三世界仍是三个完整白色大卡片，1920×1080 下场景集中在中部，未达到共享白色画布上的开放式大型学习世界。
2. `Mascot.tsx` 和 `WorldScene.tsx` 通过内联手写 SVG 绘制，角色与世界场景未达到正式资产和小托身份基准要求。
3. 基础练习正确反馈后仍渲染低对比度禁用“检查答案”按钮，650ms 自动推进虽存在，但截图语义不完整。

本轮严格停留在 3B-4：只替换正式插画渲染、开放式世界布局、地图小托尺寸、正确反馈行动区、门槛截图和验收文档；未修改后端、契约、API、路由、数据模型、字体包、字体流水线或地图路径/节点/标签/业务结构，未启动 3B-5 或阶段 4。

### 10.2 插画资产形式、来源与身份基准

- 资产形式：10 张成品透明 WebP；7 张小托姿态为 `512px` 宽，3 张世界场景为 `1100px` 宽；原始 ImageGen PNG 与 `frontend/scripts/process_illustrations.py` 一并保留。
- 小托姿态映射：`WELCOME_WAVE → xiaotuo-wave.webp`、`GUIDE_POINT → xiaotuo-point.webp`、`THINKING → xiaotuo-think.webp`、`READ_WITH_BOOK → xiaotuo-book.webp`、`SCORING_WAIT → xiaotuo-wait.webp`、`RESULT_SUPPORT → xiaotuo-support.webp`、`CELEBRATE → xiaotuo-celebrate.webp`。
- 世界场景映射：`CLEARING → world-clearing.webp`、`ACCOUNTING → world-accounting.webp`、`SUPERVISION → world-supervision.webp`。
- 来源：小托以 `design-assets/xiaotuo/xiaotuo-character-baseline-v1.png` 为高保真图生图输入；世界场景采用统一扁平矢量、纯色平涂、深蓝轮廓、无渐变的文生图流程。后处理脚本记录了边缘洪水填充去白底、平台水印裁剪、内容 bbox、缩放和 WebP q92 导出。
- 复核：逐张查看 `xiaotuo-wave/point/think.webp` 和三张 world WebP，并检查全部 WebP/原始 PNG。指定成品均为 RGBA，透明背景，无水印、损坏或明显身份漂移；小托保留蓝色珊瑚鹿角、额前蓝毛、白色蓬松头部、大圆黑眼带高光、粉耳内、蓝色翻领工作服、深蓝短裤和蓝鞋等基准特征。`xiaotuo-think.webp` 为半身源图，按原始比例使用，没有强行补脚。

### 10.3 本轮代码修复

| 文件 | 修复 |
|---|---|
| `frontend/src/components/Mascot.tsx` | 删除全部内联手写 SVG，保留 `pose`、`size`、`message`、`className` API，用 Vite 静态导入正式 WebP，继续提供 `role="img"`、`aria-label="小托"` 和气泡。 |
| `frontend/src/components/WorldScene.tsx` | 删除场景 SVG 组件，改为三张正式 world WebP 映射；建设中只由统一 CSS `filter: saturate(0.16)` 去饱和。 |
| `frontend/src/pages/WorldsPage.tsx`、`frontend/src/styles/phase3b.css` | 移除世界外围边框、圆角、背景和卡片阴影；保留三个 `.world-card`、`data-testid="world-grid"` 和“进入学习地图”文本，在共享白画布中形成三列等权开放场景。核算保留绿色主按钮，清算/监督仅灰色“内容建设中”。 |
| `frontend/src/components/MapTrack.tsx` | 只将地图正式指路小托从 `small` 调为 `medium`，保持路径、节点、标签和状态结构不变；截图复核净距不少于 24px。 |
| `frontend/src/components/PracticeSession.tsx` | 正确反馈后隐藏提交按钮，在原行动位置显示“即将进入下一题…”或末题“即将完成基础练习…”和轻量等待点；保留 650ms 自动推进、`onCompleted` 和错误状态“重新提交”。 |
| `frontend/tests/gate-shots.mjs` | 增加 Node `assert` 导入和正确反馈断言：无“检查答案”按钮、等待文字可见、第二题自动出现、错误状态有“重新提交”；新增 `15-practice-advancing.png`。 |
| `frontend/tests/page-test.mjs` | 增加可选 `PHASE3_PAGE_TEST_SCREENSHOT_DIR`，默认仍指向原 phase3 路径；本轮使用隔离临时目录运行，避免覆盖 phase3 历史截图。 |
| `frontend/src/vite-env.d.ts` | 增加 WebP 静态导入声明，仅服务于正式资产的 TypeScript 类型检查。 |

### 10.4 正确反馈修复证据

`13-practice-correct.png` 与 `15-practice-advancing.png` 显示正确选项的绿色状态、浅绿色反馈带、可读解析和“即将进入下一题…”；原行动位置不再存在禁用“检查答案”按钮。门槛脚本在正确反馈后检查按钮数量为 0，等待约 650ms 后等待第二题题干出现。`14-practice-wrong.png` 显示错误局部反馈、思考小托和可操作的“重新提交”按钮，错误重答路径未被改变。

### 10.5 新截图与验收材料

本轮只更新 `frontend/screenshots/phase3b-gate/`，没有覆盖 `frontend/screenshots/phase3/`。截图清单：

- 三世界：`01-worlds-1440.png`、`01-worlds-1920.png`、`02-worlds-accounting-detail.png`、`03-worlds-building-detail.png`；
- 地图：`04-map-1440.png`、`04-map-1920.png`、`05-map-node-states.png`、`06-map-remediation-1440.png`；
- 练习：`07-practice-empty-1440.png`、`07-practice-empty-1920.png`、`08-practice-submit-disabled.png`、`09-practice-focus.png`、`10-practice-selected.png`、`11-practice-submit-enabled.png`、`12-practice-submit-pressed.png`、`13-practice-correct.png`、`14-practice-wrong.png`、`15-practice-advancing.png`。

`frontend/screenshots/phase3b-gate/ACCEPTANCE.md` 已按“修改前问题 → 修改后证据 → 规范符合性 → 剩余限制”逐项重写，明确记录第一次驳回、本轮正式资产来源和停止边界。

### 10.6 测试、构建与字体复测

| 命令/检查 | 结果 |
|---|---|
| `npm run typecheck` | 通过 |
| `npm run test:pages` | 通过；使用 `PHASE3_PAGE_TEST_SCREENSHOT_DIR` 指向临时目录，临时输出已删除，`phase3/` 未被写入 |
| `node tests/gate-shots.mjs` | 通过；新增正确隐藏按钮、自动推进和错误重提断言通过，记录 2 次练习提交请求 |
| `npm run build` | 通过；1616 modules transformed，正式 WebP 进入 dist |
| `git diff --check` | 通过 |
| `dist/fonts/` | 6 个 WOFF2，原始发布字节 `3,161,012`；gzip 合计 `3,162,089`；严格小于 `10,000,000` |

本轮没有修改字体包或字体流水线。

### 10.7 提交链与工作树

本轮提交链为：

1. `fe968de` — `docs: lock phase 3b visual specification`（第一轮历史基线）；
2. `23c31fd` — `feat: build phase 3b visual gate`（第一轮门槛实现）；
3. `62fb1c9` — `docs: add phase 3b construction report`（第一轮报告）；
4. `dbf21a7` — `chore: add phase 3b illustration assets`（本轮交接资产、原始 PNG、处理脚本）；
5. `a7ee1b2` — `docs: handoff phase 3b gate revision`（本轮施工交接文档）；
6. `fix: revise phase 3b visual gate` — 本轮代码、门槛截图、验收表和本报告修订的独立提交，完成前写入。

最终提交后应确认产品仓库工作树干净，且变更仅位于本轮允许的前端组件、阶段 3B 样式、截图、测试与报告范围。

### 10.8 当前停止点

本轮已完成 3B-4 视觉闸门修订，等待主控和用户重新验收三张门槛页；不得据此自动扩展登录、知识卡、示范、异常案例、评分、结果、补学、记录、详情页或阶段 4。

**已完成 3B-4 视觉闸门修订，仍停在 3B-4，未启动 3B-5，未启动阶段 4。**

---

## 十一、阶段 3B-5｜全页面视觉扩展

> 执行基线：`5c34249 fix: revise phase 3b visual gate`
> 用户已明确确认阶段 3B-4 三张门槛页。本节只记录 3B-5；未启动 3B-6，未启动阶段 4。

### 11.1 修改范围

本轮按施工 Brief 的 13 组顺序完成：

1. 登录页：改为白/近白开放画布，左侧 45% 为欢迎姿态和岗位学习情境，右侧保留 440px 登录区；员工号、密码和账户安全说明保留。
2. 知识卡：去除总外框和卡套卡，以 30px/700 核心判断为主体，保留单一流程、轻提示和正式拿书姿态。
3. 正常示范：改为完整 3—5 步纵向时间线；完成、当前、未来分别使用浅绿、蓝、灰状态，动作与原因成对。
4. 异常案例：保持 1120px、36/64 双栏；左侧安静灰底事实/任务，右侧 420px 长文本输入；草稿状态弱化，正式提交为唯一绿色主行动。
5. 评分等待：移除巨型外框，使用正式 `SCORING_WAIT` 小托和蓝色不确定进度；明确答案已保存、不会重复评分、可安全返回地图。
6. 评分技术失败：与学习结论严格分离；红色只用于小状态标签；明确答案保留、重试原作答评分、不创建新记录。
7. 通过结果：使用正式 `CELEBRATE` 小托和少量彩纸；总分、门槛、结论同层；四维使用同色行条；返回地图为唯一主 CTA。
8. 未掌握结果：使用正式 `RESULT_SUPPORT` 小托和局部橙黄；关键遗漏置于四维之前；补学为主 CTA。
9. 定向补学：1040px 主区、220px 轻侧轨；一次只呈现一个补强目标；完整案例重试只在全部补学完成后成为主 CTA。
10. 训练记录：1120px 专业列表；计数融入副标题；轻量筛选；记录行约 108px、白底与 1px 分隔。
11. 记录详情：首屏先显示不可修改快照、提交时间、历史结论和路线当前状态；新增“历史未掌握、当前已通过”回归状态。
12. 用户菜单：256px、1px 浅灰边、16px 圆角、38px 头像；仅保留身份、脱敏员工号、训练记录和退出。
13. Xiaotuo 收口：继续复用 7 张正式 WebP 的欢迎、指路、拿书、思考、等待、支持和庆祝姿态；没有新增内联 SVG、原图或插画处理。

已确认的三世界入口、核算长地图和基础练习母版没有推倒重做。本轮只对共用样式兼容做必要修正，并在扩展截图脚本中复测这些基线页面。

### 11.2 修改文件

| 文件 | 3B-5 作用 |
|---|---|
| `frontend/src/pages/LoginPage.tsx` | 精简登录情境装饰，保留账户字段并增加账户安全说明。 |
| `frontend/src/pages/LearningPage.tsx` | 知识卡接入正式拿书姿态；正常示范渲染完成/当前/未来三态完整时间线。 |
| `frontend/src/components/ResultView.tsx` | 通过/未掌握使用不同正式姿态；重排结论、门槛、关键遗漏和四维证据；历史模式使用轻量结果摘要。 |
| `frontend/src/pages/RecordsPage.tsx` | 将训练次数融入副标题，保持专业列表语义。 |
| `frontend/src/pages/RecordDetailPage.tsx` | 并列展示不可修改快照、历史结论和路线当前状态。 |
| `frontend/src/styles/phase3b.css` | 3B-5 全页面桌面视觉扩展；未加入移动端断点。 |
| `frontend/tests/page-test.mjs` | 支持隔离截图目录、两档桌面画布和文件后缀；新增用户菜单与历史/当前状态分离断言。 |
| `frontend/screenshots/phase3b-expanded/` | 34 张独立截图和逐屏检查表，不覆盖 `phase3/` 与 `phase3b-gate/`。 |
| `frontend/PHASE3B-REPORT.md` | 本节施工、验证、截图与限制记录。 |

未修改 `backend/`、接口契约、API 客户端、路由、数据模型、字体包、插画生成原图或 `process_illustrations.py`。

### 11.3 截图与逐屏验收

独立目录：

```text
frontend/screenshots/phase3b-expanded/
```

逐屏检查表：

```text
frontend/screenshots/phase3b-expanded/ACCEPTANCE.md
```

共 34 张 PNG，即 17 个页面/关键状态分别提供 `1440 × 900` 与 `1920 × 1080`。覆盖：

- 登录、知识卡、正常示范、异常案例；
- 评分等待、评分技术失败；
- 通过、未掌握；
- 定向补学进行中、补学完成；
- 训练记录、用户菜单打开；
- 历史未掌握但路线当前已通过；
- 已确认三世界、长地图、基础练习和路线通过后地图的共用组件回归。

截图脚本通过 `PHASE3_PAGE_TEST_SCREENSHOT_DIR` 明确写入新目录；默认路径保持不变。本轮没有覆盖 `frontend/screenshots/phase3/` 或 `frontend/screenshots/phase3b-gate/`。

### 11.4 验证结果

- `npm run typecheck`：通过。
- `npm run test:pages`：通过；沙箱内子进程受 Windows `spawn EPERM` 限制，获准在沙箱外运行。
- 1440×900 扩展截图回归：通过。
- 1920×1080 扩展截图回归：通过。
- `npm run build`：通过，Vite 处理 1616 个模块。
- 生产构建字体：6 个 WOFF2，实际发布字节合计 `3,161,012`，严格小于 `10,000,000`。
- `git diff --check`：通过。
- 禁用机制扫描：前端页面未出现 XP、等级、连续学习、红心、排行榜、商城、独立问答或三条线快速切换。
- 敏感信息扫描：TSX 没有显示 Rubric、评分关键词、内部项目、模型名称或参数；`rubricVersion` 仅保留在既有提交请求中。
- 视觉机制扫描：最终阶段 3B 样式没有渐变、玻璃拟态、3px 容器边框或移动端断点；只保留 `prefers-reduced-motion` 无障碍媒体查询。
- 变更范围扫描：没有修改 `backend/`、`frontend/src/api/`、`frontend/src/App.tsx`、路由、类型、资产或插画处理脚本。

### 11.5 功能与契约保护

- 登录、四环节顺序、草稿自动保存、revision 冲突、离页保护、幂等提交、异步评分、评分重试、结果、补学、完整异常案例重试和训练记录路由语义未变。
- 前端没有新增通过、进度、解锁或评分推导。
- 没有显示答案、Rubric、硬性项内部明细、评分关键词、内部项目 ID、模型名称或参数。
- 技术评分失败继续复用同一正式作答，不清空答案、不创建新记录。
- 单个补学题完成不等于路线通过；完整异常案例重试仍由现有后端动作解锁。

### 11.6 已知限制

1. 当前知识卡内容契约没有原材料 URL，因此没有虚构蓝色“原材料”入口；未来只有在契约提供公开材料地址后才能按规范渲染。
2. 技术故障情景复用正式 `RESULT_SUPPORT` 资产表达中性支持，没有生成第八张小托资产；符合本轮不得修改插画生产资产的边界。
3. 3B-5 只完成页面视觉扩展和与本轮风险相称的验证；全量 3B-6 回归与阶段 4 均未启动。

### 11.7 提交链与停止状态

阶段 3B 当前提交链：

```text
fe968de docs: lock phase 3b visual specification
23c31fd feat: build phase 3b visual gate
62fb1c9 docs: add phase 3b construction report
dbf21a7 chore: add phase 3b illustration assets
a7ee1b2 docs: handoff phase 3b gate revision
5c34249 fix: revise phase 3b visual gate
<本轮提交> feat: extend phase 3b visual system
```

本轮提交完成后，由最终 `git log -1` 和主控回报记录精确哈希。产品仓库工作树状态在提交后复核。

**已完成阶段 3B-5，未启动 3B-6，未启动阶段 4。**
