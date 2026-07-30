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
