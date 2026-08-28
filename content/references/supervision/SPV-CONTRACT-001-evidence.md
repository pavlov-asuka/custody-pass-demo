# SPV-CONTRACT-001 原材料—教学证据映射

- evidenceId: SPV-EVID-CONTRACT-001
- version: 1.0.0
- provenance: SYNTHETIC_EDUCATIONAL
- scope: ONLY_THIS_CASE
- 本索引只服务“合同条款与监督规则可实现性”。教学键、合同版本、日期和数值均为 SYNTHETIC_EDUCATIONAL / ONLY_THIS_CASE，不代表生产合同、规则编码、系统状态或权限。
- 原材料保持只读。本索引只保留已审计文本对象定位，不纳入图片、截图、图像元数据、绝对路径或真实身份信息。

## 1. 原材料定位

| sourceId | 已审计定位 | 本路线使用 |
| --- | --- | --- |
| M01 | §2.2 P40-P43、§2.3、§4.2.1 P191-P206、§4.2.2 P221-P223 | 条款身份、规则类型、分子/分母关系、比例下限和参数读取顺序 |
| M11 | §2.2、§4.2、§4.2.1、§4.2.2 | 独立核对合同条款、规则关系和比例参数的材料抽象 |
| M09 | p.8 / 第36—37条 | 仅作托管人监督基金管理人投资运作的职责边界，不提供本案阈值或生产参数 |

上述定位是文本对象定位。M09 不用于补造本案例字段；M01/M11 也不支持本路线之外的生产权限、系统编码或异常处置推断。

## 2. 可追溯字段与关系

| evidenceRef | 来源定位 | 可核对关系 | 内容承载 |
| --- | --- | --- | --- |
| SPV-EVID-CONTRACT-IDENTITY | M01 §2.2、§2.3；M11 §2.2 | 合同审阅先锁定教学键、合同版本和规则类型 | KC-01、示范步骤 1、Q1、综合 spv-contract-b-source-map |
| SPV-EVID-CONTRACT-RATIO | M01 §4.2.1；M11 §4.2 | B0100001 = B0100002 / B0100003；本案例 CS_BLXX = 5% | KC-02、示范步骤 2—3、Q2、综合 spv-contract-b-ratio |
| SPV-EVID-CONTRACT-RELATION | M01 §4.2.1—§4.2.2；M11 §4.2 | B0100001 < CS_BLXX；比例结果回到条款关系 | KC-03、示范步骤 4—5、Q4、综合 spv-contract-b-cross-source |
| SPV-EVID-CUSTODY-BOUNDARY | M09 p.8 / 第36—37条 | 托管监督职责只作为边界背景，不推断系统权限或规则编码 | KC-01、KC-03、综合短结论边界 |

## 3. 两套同构正常案例

| 案例 | 教学键 / 合同版本 | 日期 | 分子/分母与比例 | 本案例关系 |
| --- | --- | --- | --- | --- |
| Demo A | EDU-SPV-A-001 / EDU-CONTRACT-A-2026-06 | 审阅 2026-06-01；数据 2026-06-15 | B0100002=4、B0100003=100；4/100=0.0400（4%） | 0.0400 < 0.0500，CS_BLXX=5% |
| Comprehensive B | EDU-SPV-B-002 / EDU-CONTRACT-B-2026-07 | 审阅 2026-07-03；数据 2026-07-18 | B0100002=3、B0100003=100；3/100=0.0300（3%） | 0.0300 < 0.0500，CS_BLXX=5% |

A/B 共享条款页→参数页→Decimal 复算→规则参数工作纸→跨来源勾稽的结构，但使用不同教学键、合同版本、日期和分子数值。两组只用于本案例，均标记 SYNTHETIC_EDUCATIONAL / ONLY_THIS_CASE。

## 4. 综合 B 原子工作项映射

| workItem | 来源字段 | 材料定位 | Rubric / 补学 |
| --- | --- | --- | --- |
| spv-contract-b-source-map | 条款页 teaching_key、contract_version、rule_type、numerator_code、denominator_code；参数页 numerator_value、denominator_value、lower_bound_value | M01 §2.2、§2.3；M11 §2.2 | B_CLAUSE_AND_PARAM_MATCH；SPV-CONTRACT-SOURCES；Q1 |
| spv-contract-b-ratio | 参数页 numerator_value、denominator_value、ratio_scale | M01 §4.2.1；M11 §4.2 | 3/100=0.0300；SPV-CONTRACT-RATIO；Q2 |
| spv-contract-b-parameter-entry | 两页 contract_version、rule_type、numerator_code、denominator_code、lower_bound_code/value | M01 §2.2、§4.2.1；M11 §2.2、§4.2 | 参数工作纸字段集合；SPV-CONTRACT-PARAMETERS；Q3 |
| spv-contract-b-cross-source | 两页版本、类型、编码、分子/分母、下限字段 | M01 §4.2.1；M11 §4.2 | B_RATIO_BELOW_CASE_BOUND_AND_SOURCES_MATCH；SPV-CONTRACT-RECONCILIATION；Q4 |
| spv-contract-b-conclusion | 两页身份、字段、数值、关系和案例标记 | M01 §2.2、§2.3、§4.2.1；M11 §2.2、§4.2；M09 p.8 / 第36—37条 | 来源、公式、比例、下限和边界短结论；SPV-CONTRACT-CONCLUSION；Q5 |

每个 workItem 均在私有 JSON 中同时绑定 source、reference、rule、Rubric criterion/mandatory 和 remediation；公开 route 不呈现这些私有映射。

## 5. 公式与边界

- 本路线只使用 B0100001 = B0100002 / B0100003、B0100001 < CS_BLXX 和 CS_BLXX = 5%。
- Demo A：4 / 100 = 0.0400，显示 4%；Comprehensive B：3 / 100 = 0.0300，显示 3%。比例以四位小数保存，数值用 Decimal 复算。
- CS_BLXX=5% 是本案例母规则参数页的教学值，不是通用法规阈值；结论必须带上合同版本和两份来源。
- M09 只证明托管监督职责边界；不从其定位推断真实主体、生产权限、系统状态或额外规则。
- 不覆盖真实合同主体、真实产品/账户/人员、其他指标或阈值、技术失败、异常处置、提示函发送补救、图片和原材料绝对路径；这些内容继续 BUILDING/DEFER。
