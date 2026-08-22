import type { Dimension, Line, RouteState, StepType } from '../api/types';

export const stepLabels: Record<StepType, string> = {
  KNOWLEDGE_CARD: '知识卡',
  DEMONSTRATION: '正常示范',
  BASIC_PRACTICE: '基础练习',
  COMPREHENSIVE_PRACTICE: '综合实务',
};

export const dimensionLabels: Record<Dimension, string> = {
  CONCEPT: '概念理解',
  PROCESS: '处理步骤',
  RISK: '风险意识',
  EXPRESSION: '表达规范',
};

export const routeStateLabels: Record<RouteState, string> = {
  LOCKED: '尚未解锁',
  NOT_STARTED: '未开始',
  IN_PROGRESS: '学习中',
  LEARNED_NOT_MASTERED: '待补学',
  PASSED: '已通过',
};

export const lineLabels: Record<Line, string> = {
  CLEARING: '清算',
  ACCOUNTING: '核算',
  SUPERVISION: '监督',
};

/**
 * 公开层只显示业务含义；提交给服务端的 type / kind / id 仍使用契约原值。
 * 这些映射集中维护，避免把后台枚举直接露给学员。
 */
export const workItemTypeLabels: Record<string, string> = {
  FIELD_MAP: '资料对应',
  CALCULATION: '数值计算',
  LEDGER_ENTRY: '账务填写',
  RECONCILIATION: '勾稽核对',
  SHORT_TEXT: '业务结论',
  SINGLE_CHOICE: '单项选择',
  MULTIPLE_CHOICE: '多项选择',
  ORDERING: '处理顺序',
};

const clearingWorkItemTypeLabels: Record<string, string> = {
  ...workItemTypeLabels,
  LEDGER_ENTRY: '结果登记',
};

export const materialKindLabels: Record<string, string> = {
  INSTRUCTION: '任务说明',
  PARAMETER: '参数资料',
  CONFIRMATION: '确认资料',
  STATEMENT: '报表资料',
  REPORT: '报告资料',
  RECONCILIATION: '核对资料',
  TABLE: '业务表格',
  RECORD: '业务记录',
  SOURCE: '来源资料',
};

const fieldIdLabels: Record<string, string> = {
  // 清算共同基础的 workItemId 中，base 是路线名，不是业务字段“基数”。
  // 同时保留无 clr 前缀别名，兼容历史快照中的旧键。
  'clr-base-b-instruction-source': '指令资料来源',
  'base-instruction-source': '指令资料来源',
  'clr-base-b-confirmation-source': '确认资料来源',
  'base-confirmation-source': '确认资料来源',
  'clr-base-b-settlement-source': '交收结果资料来源',
  'base-settlement-source': '交收结果资料来源',
  'clr-base-b-quantity': '义务数量',
  'base-quantity': '义务数量',
  'clr-base-b-amount': '义务金额',
  'base-amount': '义务金额',
  'clr-base-b-result-ledger': '结果台账来源',
  'base-result-ledger': '结果台账来源',
  'clr-base-b-identity-check': '结果身份核对',
  'base-identity-check': '结果身份核对',
  'clr-base-b-quantity-diff': '数量差额',
  'base-quantity-diff': '数量差额',
  'clr-base-b-amount-diff': '金额差额',
  'base-amount-diff': '金额差额',
  'clr-base-b-reconciliation': '结果对账',
  'base-reconciliation': '结果对账',
  'clr-base-b-conclusion': '正常结果结论',
  'base-conclusion': '正常结果结论',
  'clr-ex-b-trade-source': '定位成交确认层',
  'clr-ex-b-clearing-layer': '定位清算结果层',
  'clr-ex-b-security-code-match': '核对四层证券代码',
  'clr-ex-b-buy-security-quantity': '汇总买入证券应收数量',
  'clr-ex-b-buy-cash-amount': '汇总买入资金应付金额',
  'clr-ex-b-sell-security-quantity': '汇总卖出证券应付数量',
  'clr-ex-b-sell-cash-amount': '汇总卖出资金应收金额',
  'clr-ex-b-obligation-ledger': '登记四项清算对象',
  'clr-ex-b-buy-security-diff': '核对买入证券差额',
  'clr-ex-b-buy-cash-diff': '核对买入资金差额',
  'clr-ex-b-sell-security-diff': '核对卖出证券差额',
  'clr-ex-b-sell-cash-diff': '核对卖出资金差额',
  'clr-ex-b-prep-status': '记录交收准备状态',
  'clr-ex-core-b-conclusion': '写出有依据结论',
  'clr-ex-b-core-source': '定位前置四项义务来源',
  'clr-ex-b-external-source': '定位外部交收结果来源',
  'clr-ex-b-security-closing': '复算交收后证券数量',
  'clr-ex-b-cash-closing': '复算交收后资金余额',
  'clr-ex-b-security-receive-diff': '复算收到证券差额',
  'clr-ex-b-security-deliver-diff': '复算交付证券差额',
  'clr-ex-b-cash-in-diff': '复算收到资金差额',
  'clr-ex-b-cash-out-diff': '复算支付资金差额',
  'clr-ex-b-securities-ledger': '登记内部证券双向结果',
  'clr-ex-b-cash-ledger': '登记内部资金双向结果',
  'clr-ex-b-obligation-result-match': '核对义务与外部结果',
  'clr-ex-b-securities-recon': '完成证券双向零差勾稽',
  'clr-ex-b-cash-recon': '完成资金双向零差勾稽',
  'clr-ex-b-close-status': '记录这笔业务正常封账',
  'clr-ex-funds-b-conclusion': '写出有依据封账结论',
  'clr-fund-close-b-source-map': '把关闭所需字段放回正确来源',
  'clr-fund-close-b-balance-calculation': '复算资金账户期末余额',
  'clr-fund-close-b-result-ledger': '登记正常日终关闭结果',
  'clr-fund-close-b-identity-reconciliation': '核对账户、日期和来源身份',
  'clr-fund-close-b-fund-account-difference': '核对资金账户差额',
  'clr-fund-close-b-internal-ledger-difference': '核对内部资金账差额',
  'clr-fund-close-b-ccbs-difference': '核对CCBS余额差额',
  'clr-fund-close-b-ccdc-dvp-difference': '核对CCDC DVP余额差额',
  'clr-fund-close-b-shanghai-dvp-difference': '核对上海清算DVP余额差额',
  'clr-fund-close-b-total-difference': '汇总全部余额差额',
  'clr-fund-close-b-close-gate': '确认来源状态和关闭前置',
  'clr-fund-close-b-conclusion': '写出有依据的正常关闭结论',
  'clr-fund-b-source-fields': '定位审核与结果来源',
  'clr-fund-b-approval-controls': '定位批准控制字段',
  'clr-fund-b-closing-cash': '复算期末现金',
  'clr-fund-b-amount-chain': '核对批准金额与执行金额差',
  'clr-fund-b-execution-ledger': '登记执行与资金账结果',
  'clr-fund-b-identity-recon': '勾稽审核身份与正常控制',
  'clr-fund-b-cash-recon': '核对现金余额差',
  'clr-fund-b-amount-recon': '核对执行金额与资金账金额差',
  'clr-fund-b-conclusion': '写出正常支付结论',
  'clr-ib-dvp-b-field-contract': '定位结算合同与承接金额',
  'clr-ib-dvp-b-field-accounts-method': '区分两类账户、结算方式与通道',
  'clr-ib-dvp-b-bond-balance': '复算债券账户期末面额',
  'clr-ib-dvp-b-cash-balance': '复算DVP资金账户期末余额',
  'clr-ib-dvp-b-delivery-workpaper': '完成DVP交割工作纸',
  'clr-ib-dvp-b-contract-result-match': '勾稽合同与外部DVP结果',
  'clr-ib-dvp-b-ledger-match': '勾稽账户变动与内部台账',
  'clr-ib-dvp-b-zero-difference': '确认合同、账户和台账零差',
  'clr-ib-dvp-b-close-result': '记录正常DVP与日终关闭结果',
  'clr-ib-dvp-b-conclusion': '写出有依据的交收关闭结论',
  'clr-ib-b-field-institution-system-account': '定位机构、系统和账户角色',
  'clr-ib-b-field-method-channel': '区分结算方式与通道',
  'clr-ib-b-face-value-check': '复算债券面额一致性',
  'clr-ib-b-settlement-amount-check': '复算结算金额一致性',
  'clr-ib-b-confirmation-workpaper': '完成结算确认工作纸',
  'clr-ib-b-identity-match': '勾稽业务身份与核心字段',
  'clr-ib-b-zero-difference': '确认两类输入差额为零',
  'clr-ib-b-approval-confirmation': '记录批准与结算确认',
  'clr-ib-b-conclusion': '写出有依据的结算确认结论',
  'payment-source': '支付凭证来源',
  'ending-payable': '期末应付余额',
  'debit-account': '借方科目',
  'credit-account': '贷方科目',
  'reconciliation-result': '勾稽结果',
  'report-type': '报告类型',
  'report-period': '报告期间',
  'template-source': '模板来源',
  'review-timing': '复核时点',
  'current-profit': '本期利润',
  'weighted-average-share-profit': '加权平均份额利润',
  'ending-nav': '期末单位净值',
  'nav-growth': '净值增长率',
  'benchmark-growth': '业绩比较基准收益率',
  'excess-performance': '超额收益',
  'performance-link': '业绩表现勾稽',
};

const fieldTokenLabels: Record<string, string> = {
  actual: '实际',
  advance: '预提',
  account: '账户',
  accrued: '应计',
  acquisition: '取得',
  amount: '金额',
  annual: '年度',
  announcement: '公告',
  application: '申购',
  apply: '申报',
  arrival: '到账',
  asset: '资产',
  average: '平均',
  available: '可用',
  balance: '余额',
  benchmark: '基准',
  beginning: '期初',
  bank: '银行',
  basket: '篮子',
  biz: '业务',
  business: '业务',
  buy: '买入',
  buyin: '买入',
  bond: '债券',
  broker: '券商',
  cash: '资金',
  carrying: '账面',
  case: '案例',
  change: '变动',
  clean: '净价',
  close: '平仓',
  commission: '佣金',
  confirm: '确认',
  confirmed: '已确认',
  contract: '合同',
  cost: '成本',
  created: '已创建',
  count: '条数',
  current: '本期',
  daily: '日',
  data: '资料',
  date: '日期',
  debit: '借方',
  disclosure: '披露',
  distribution: '分配',
  document: '凭证',
  ending: '期末',
  entry: '分录',
  excess: '超额',
  exercise: '行权',
  expense: '费用',
  external: '外部',
  face: '面值',
  fee: '费用',
  field: '字段',
  type: '类型',
  system: '系统',
  register: '登记',
  registered: '已登记',
  candidate: '候选',
  obligation: '义务',
  final: '最终',
  fixed: '固定',
  flow: '流量',
  fund: '基金',
  gross: '毛额',
  holding: '持仓',
  income: '收入',
  inflow: '流入',
  instruction: '指令',
  interest: '利息',
  internal: '内部',
  issue: '发行',
  ledger: '台账',
  liability: '负债',
  margin: '保证金',
  mapped: '已对应',
  market: '市场',
  matched: '一致',
  maturity: '到期',
  nav: '净值',
  net: '净额',
  number: '数量',
  payment: '支付',
  payable: '应付',
  period: '期间',
  performance: '业绩',
  portfolio: '组合',
  position: '持仓',
  price: '价格',
  profit: '利润',
  parsed: '已解析',
  quantity: '数量',
  rate: '利率',
  receive: '接收',
  received: '已接收',
  record: '记录',
  realized: '已实现',
  reconciliation: '勾稽',
  redemption: '赎回',
  reduce: '减少',
  report: '报告',
  reserve: '备付',
  review: '复核',
  role: '角色',
  row: '行',
  rows: '行数',
  security: '证券',
  sell: '卖出',
  settlement: '结算',
  share: '份额',
  source: '来源',
  statement: '对账单',
  status: '状态',
  subscription: '申购',
  template: '模板',
  timing: '时点',
  trade: '交易',
  trading: '交易',
  total: '合计',
  unit: '单位',
  update: '更新',
  valuation: '估值',
  version: '版本',
  weighted: '加权',
  withdrawal: '退出',
  workpaper: '工作纸',
  provider: '提供方',
  worker: '经办',
  reviewer: '复核',
  choice: '方式',
  movement: '变动',
  snapshot: '快照',
  calculated: '计算',
  formula: '公式',
  open: '期初',
  adjustment: '调整',
  answer: '答案',
  approved: '批准',
  archive: '归档',
  base: '基数',
  capital: '实收资本',
  card: '知识卡',
  chain: '链',
  chains: '链',
  check: '检查',
  clearing: '清算',
  code: '代码',
  comprehensive: '综合实务',
  confirmation: '确认',
  consideration: '申赎对价',
  content: '内容',
  creation: '创设',
  day: '当日',
  delivered: '已交付',
  delta: '差额',
  diff: '差额',
  difference: '差额',
  direction: '方向',
  dividend: '分红',
  downstream: '下游',
  entries: '分录',
  estimate: '估计',
  estimated: '估计',
  event: '事件',
  execution: '执行',
  expected: '预计',
  fof: 'FOF',
  id: '标识',
  initial: '初始',
  input: '输入',
  issued: '已发行',
  item: '项目',
  items: '项目',
  key: '标识',
  mappings: '对应关系',
  material: '资料',
  materials: '资料',
  minutes: '分钟',
  normal: '正常',
  note: '说明',
  object: '对象',
  ole: 'OLE',
  option: '选项',
  order: '顺序',
  pcf: 'PCF',
  per: '每',
  policy: '口径',
  post: '处理后',
  pre: '处理前',
  premium: '溢价',
  prepayment: '预付款',
  primary: '一级市场',
  product: '产品',
  question: '题目',
  recon: '勾稽',
  redeemed: '已赎回',
  reference: '参考',
  refund: '退回',
  reinvest: '再投资',
  required: '必需',
  route: '路线',
  same: '同一',
  secondary: '二级市场',
  securities: '证券',
  settled: '已结算',
  signed: '带方向',
  sub: '替代',
  submission: '提交',
  substitution: '现金替代',
  ta: 'TA',
  text: '文本',
  traded: '已交易',
  underlying: '底层',
  unsettled: '待结算',
  upstream: '上游',
  value: '价值',
  view: '视图',
  voucher: '凭证',
  work: '工作',
  opening: '期初',
  closing: '期末',
  receivable: '应收',
  remaining: '待结余额',
  result: '结果',
  return: '返还',
  state: '状态',
};

const optionValueLabels: Record<string, string> = {
  ACCOUNTING_ONLY: '仅核算',
  ACCOUNT_ROLES_COMPLETE: '账户角色已齐全',
  ACTIVE: '有效',
  AFTER_DISCLOSURE_DATE: '披露日期之后',
  ALL_ZERO_AND_REVIEW_CONFIRMED: '差额均为零且复核已确认',
  APPROVED_SNAPSHOT: '批准的来源快照',
  APPROVED: '已批准',
  APPROVED_FOR_CONFIRMATION: '已批准进入确认',
  BALANCED: '已平衡',
  BALANCE_SHEET: '资产负债表',
  BANK_STATEMENT: '银行对账单',
  BEFORE_DISCLOSURE_DATE: '披露日期之前',
  BROKEN: '顺序已打乱',
  BROKER_CASH_STATEMENT: '券商资金对账单',
  BROKER_SECURITIES_STATEMENT: '券商证券对账单',
  BUILDING: '建设中',
  BUY: '买入',
  CALCULATED: '已计算',
  CALCULATION: '数值计算',
  CANCELLED: '已撤销',
  CATEGORIES: '资料分类',
  CASE_APPROVED_CHANNEL_A: '批准渠道 A',
  CASE_APPROVED_CHANNEL_B: '批准渠道 B',
  CLEARING: '清算',
  CONFIRMED: '已确认',
  CUSTODIAN_INFO_MATCHED: '托管人信息一致',
  CCDC: '中央国债登记结算有限责任公司',
  DATA_READY: '资料已就绪',
  DATA_RECEIVED: '资料已接收',
  DEFER: '暂缓',
  DELIVER: '交付',
  FIELD_MAP: '资料对应',
  HISTORICAL_DEFAULT: '历史默认值',
  INCOME_STATEMENT: '利润表',
  KEY_POINT: '关键要点',
  MATERIAL_ABSTRACTION: '材料抽象',
  MATCHED: '已勾稽一致',
  NAV_RESULT: '净值结果',
  NO: '否',
  NORMAL_ARCHIVED: '正常归档',
  NORMAL: '正常',
  NOT_LOCKED: '未锁定',
  NUMBER: '数值',
  NO_REGULATORY_EVENT: '无监管事项',
  NO_SPECIAL_STATEMENT: '无特别说明',
  NO_WARNING: '无风险提示',
  NOT_READY: '尚未就绪',
  NOT_ARCHIVED: '未归档',
  PENDING: '待复核',
  PERFORMANCE_TEXT_MATCHED: '业绩文字一致',
  PRIOR_PERIOD: '前期',
  QUARTERLY: '季度',
  READY: '已就绪',
  REVIEWED: '已复核',
  SELL: '卖出',
  SEMI_ANNUAL: '半年度',
  SELECT: '选择',
  SENT: '已发送',
  TEXT: '文字',
  SPECIAL_STATEMENT: '有特别说明',
  UNMATCHED: '未勾稽一致',
  VALID: '有效',
  WARNING_PRESENT: '存在风险提示',
  YES: '是',
  ZERO_ALL: '全部为零',
  BROKER_DATA_PROVIDER: '券商数据提供方',
  CCBS: 'CCBS',
  ACCOUNTING_WORKER: '核算经办',
  VALUATION_REVIEWER: '估值复核',
  CUSTODY_REVIEWER: '托管复核',
  CASH_SUBSTITUTE: '现金替代',
  ACTUAL_COST: '实际成本',
  ADDITIONAL_PAYMENT_FROM_AP: '申赎参与人补款',
  BALANCE: '余额',
  SETTLEMENT_OBLIGATION: '清算义务对象',
  SECURITY: '证券',
  RECEIVE: '接收',
  DELIVERING_SECURITIES_ACCOUNT: '交付方证券账户',
  PAYER_FUNDS_ACCOUNT: '付款方资金账户',
  RECEIVER_FUNDS_ACCOUNT: '收款方资金账户',
  CARRY_FORWARD: '结转',
  CASH_IN: '资金流入',
  CONSIDERATION: '申赎对价',
  DEDUCT: '扣减',
  DELIVER_SECURITIES: '交付证券',
  DELIVERING_PARTICIPANT: '交付方参与人',
  ESTIMATE_ADJUSTMENT: '估计金额调整',
  INCREASE: '增加',
  IN_KIND: '实物交付',
  IDENTITY_MATCHED: '身份已匹配',
  LINK: '关联',
  PASS: '校验通过',
  POST: '登记',
  READ: '读取',
  RECEIPT: '到账',
  RETURN_TO_AP: '退回申赎参与人',
  SECURITIES_IN: '证券转入',
  STATE: '业务状态',
  TRANSFER: '转移',
  ACCOUNTED: '已入账',
  RECEIVED: '资料已收到',
  PARSED: '资料已读入',
  MAPPED: '来源已对应',
  COMPLETE: '资料已齐全',
  INSTRUCTION_ACCEPTED: '指令已受理',
  INSTRUCTION_MATCHED: '指令已匹配',
  TASK_ACCEPTED: '任务已受理',
  CONFIRMED_FOR_SETTLEMENT: '已确认待结算',
  READY_FOR_SETTLEMENT: '已具备结算条件',
  SETTLED: '已完成交收',
  EXECUTED: '已执行',
  POSTED: '已登记',
  REGISTERED: '已登记',
  RECONCILED: '已对账',
  NORMAL_CLOSED: '已正常关闭',
  PENDING_RECONCILIATION: '待完成对账',
  BALANCE_READY: '余额已核对',
  UNIQUE_EXECUTION: '唯一执行记录',
  NOT_PREVIOUSLY_EXECUTED: '此前未执行',
  DEFERRED_TO_NEXT_ROUTE: '转入后续路线',
  COUNTERPARTY_MATCHED: '对手方已匹配',
  SHARES_POSTED: '份额已登记',
  NAV_CONFIRMED: '净值已确认',
  HOLDING_RECONCILED: '持仓已对账',
  RESULT_RECONCILED: '结果已对账',
  NORMAL_CLOSE: '正常封账',
  CLOSE_NORMAL: '可正常封账',
  RECONCILED_NORMAL_CLOSE: '已对账并正常封账',
  RECONCILED_FOR_CONFIRMATION: '已勾稽，可进入确认',
  RECEIVING_PARTICIPANT: '接收方参与人',
  RECEIVING_SECURITIES_ACCOUNT: '接收方证券账户',
  RECONCILIATION_REVIEWER: '对账复核方',
  SETTLEMENT_PROCESSING_SYSTEM: '结算处理系统',
  TRADE_SYSTEM: '交易系统',
  SHCH: '银行间市场清算所股份有限公司',
  SSE: '上海证券交易所',
  SZSE: '深圳证券交易所',
  SUBSTITUTION_SETTLED: '现金替代已结算',
  SECURITIES_SETTLED: '证券已交收',
  DVP_AND_NON_DIRECT_SEPARATE: '已区分DVP方式与非直联通道',
  DVP_SETTLED: 'DVP已完成交收',
  EOD_CLOSED: '日终已关闭',
  NO_CASH_SUBSTITUTION: '不使用现金替代',
  MUST_CASH_SUBSTITUTION: '必须现金替代',
  ALLOWED_CASH_SUBSTITUTION: '允许现金替代',
  ROUND: '四舍五入',
  HK_SJSMX2: '港股通结算明细数据',
  SZHK_TZXX: '深港通权益通知数据',
  SYNTHETIC_EDUCATIONAL: '合成教学资料',
  YIELD: '收益指标',
  QFII: 'QFII',
  RQFII: 'RQFII',
  CNY: '元',
  CNY_10K: '万元',
  NON_DIRECT: '非直联',
  SECURITIES_AND_FUNDS_ACCOUNTS: '证券与资金账户',
  BUYER_BOND_ACCOUNT_B: '买方债券账户 B',
  BUYER_DVP_FUNDS_ACCOUNT_B: '买方 DVP 资金账户 B',
};

const optionTokenLabels: Record<string, string> = {
  ap: '申赎参与人',
  accounting: '核算',
  accepted: '已受理',
  account: '账户',
  approval: '审批',
  approved: '已批准',
  actual: '实际',
  add: '增加',
  adjustment: '调整',
  amount: '金额',
  all: '全部',
  announcement: '公告',
  application: '申购',
  apply: '申报',
  arrival: '到账',
  asset: '资产',
  available: '可用',
  balance: '余额',
  balanced: '已平衡',
  bank: '银行',
  base: '基准',
  basis: '依据',
  basket: '篮子',
  before: '之前',
  beginning: '期初',
  bonus: '红利',
  bond: '债券',
  book: '账面',
  broken: '打乱',
  broker: '券商',
  buy: '买入',
  buyin: '买入',
  cash: '资金',
  cancel: '撤销',
  carrying: '账面',
  changed: '已变更',
  change: '变动',
  clean: '净价',
  close: '平仓',
  closed: '已关闭',
  commission: '佣金',
  complete: '已完成',
  consideration: '申赎对价',
  confirm: '确认',
  confirmed: '已确认',
  contract: '合约',
  cost: '成本',
  credit: '贷方',
  current: '当前',
  daily: '日',
  data: '资料',
  date: '日期',
  debit: '借方',
  deduct: '扣减',
  deduction: '扣减',
  difference: '差额',
  delivery: '交付',
  delivering: '交付方',
  direct: '直接',
  disclosure: '披露',
  dividend: '分红',
  draft: '草稿',
  effective: '生效',
  ending: '期末',
  event: '事件',
  excluded: '已排除',
  execution: '执行',
  exercise: '行权',
  expense: '费用',
  external: '外部',
  face: '面值',
  fee: '费用',
  final: '最终',
  fixed: '固定',
  flow: '流量',
  fund: '基金',
  generate: '生成',
  gross: '毛额',
  holding: '持仓',
  identity: '身份',
  income: '收入',
  in: '转入',
  increase: '增加',
  inflow: '流入',
  instruction: '指令',
  interest: '利息',
  internal: '内部',
  invalid: '无效',
  issue: '发行',
  key: '标识',
  core: '核心',
  obligation: '义务',
  kind: '实物',
  latest: '最新',
  ledger: '台账',
  liability: '负债',
  lock: '锁定',
  long: '多头',
  margin: '保证金',
  market: '市场',
  match: '匹配',
  matched: '一致',
  maturity: '到期',
  migration: '迁移',
  mismatch: '不一致',
  mixed: '混合',
  monthly: '月度',
  nav: '净值',
  net: '净额',
  netted: '已相抵',
  next: '下一',
  no: '无',
  normal: '正常',
  nonzero: '非零',
  not: '未',
  old: '旧版',
  one: '单一',
  open: '开放',
  option: '选项',
  order: '顺序',
  original: '原始',
  other: '其他',
  parameter: '参数',
  parse: '解析',
  parsed: '已解析',
  payment: '支付',
  pending: '待处理',
  performance: '业绩',
  period: '期间',
  portfolio: '组合',
  position: '持仓',
  price: '价格',
  principal: '本金',
  prior: '前期',
  positive: '正向',
  publish: '发布',
  quantity: '数量',
  rate: '利率',
  ready: '就绪',
  receive: '接收',
  receiver: '收款方',
  receiving: '接收方',
  received: '已接收',
  receipt: '到账',
  record: '记录',
  reconcile: '勾稽',
  reconciliation: '对账',
  reconciled: '已勾稽',
  redemption: '赎回',
  reduce: '减少',
  reference: '参考',
  release: '释放',
  remind: '提醒',
  report: '报告',
  reserve: '备付',
  restricted: '受限',
  result: '结果',
  return: '返还',
  review: '复核',
  role: '岗位',
  same: '一致',
  sell: '卖出',
  security: '证券',
  settlement: '结算',
  share: '份额',
  shadow: '影子',
  short: '空头',
  source: '来源',
  special: '特殊',
  statement: '对账单',
  system: '系统',
  task: '任务',
  participant: '参与人',
  payer: '付款方',
  status: '状态',
  stock: '股票',
  stop: '停止',
  subscription: '申购',
  target: '目标',
  tax: '税',
  terminal: '终止',
  trade: '交易',
  trading: '交易',
  total: '合计',
  transfer: '转移',
  unchanged: '未变更',
  unbalanced: '未平衡',
  undetermined: '未确定',
  unsupported: '不支持',
  type: '类型',
  unit: '单位',
  update: '更新',
  use: '使用',
  valuation: '估值',
  voucher: '凭证',
  warning: '提示',
  weighted: '加权',
  workpaper: '工作纸',
  zero: '零',
  provider: '提供方',
  worker: '经办',
  reviewer: '复核',
  choice: '方式',
  movement: '变动',
  snapshot: '快照',
  case: '案例',
  format: '格式',
  edu: '教学',
  prev: '上一版本',
  ann: '公告',
  custodian: '托管人',
  bulletin: '公告',
  benchmark: '业绩基准',
  equ: '权益',
  allowed: '允许',
  must: '必须',
  substitution: '现金替代',
  ca: '公司行为',
  schedule: '调度',
  confirmation: '确认',
};

const optionTokenIgnore = new Set(['a', 'b', 'c', 'd', 'and', 'as', 'at', 'by', 'from', 'of', 'on', 'or', 'only', 'the', 'to', 'via', 'with']);

function optionTokenLabel(token: string): string | null {
  const lower = token.toLowerCase();
  if (optionTokenIgnore.has(lower) || /^\d+$/.test(lower) || /^b\d+$/.test(lower)) return null;
  if (/^(?:etf|fof|acc)\d+$/.test(lower)) return lower.replace(/\d+$/, '').toUpperCase();
  if (lower === 'cbf') return '券结基金';
  if (lower === 'ed') return '估值披露';
  if (lower === 'fi') return '固定收益';
  if (lower === 'fut' || lower === 'futr') return '期货';
  if (lower === 'life') return '核算基础';
  if (lower === 'mf') return '货币基金';
  if (lower === 'stock' || lower === 'stk') return '股票';
  if (lower === 'etf' || lower === 'fof') return lower.toUpperCase();
  if (lower === 'pcf' || lower === 'ta' || lower === 'dvp' || lower === 'xbrl') return lower.toUpperCase();
  if (lower === 'cny') return '人民币';
  if (lower === 'hkd') return '港币';
  if (lower === 'usd') return '美元';
  if (lower === 'pboc') return '人民银行';
  const singular = lower.endsWith('ies')
    ? `${lower.slice(0, -3)}y`
    : lower.endsWith('s')
      ? lower.slice(0, -1)
      : lower;
  return optionTokenLabels[lower] ?? optionTokenLabels[singular] ?? null;
}

const inlineTechnicalLabels: Record<string, string> = {
  identity_match: '身份一致',
  hk_tzxx: '港股权益通知数据',
  actualCash: '实际到账资金',
  accountRole: '账户角色',
  approvedRate: '批准费率',
  approvedShares: '批准份额',
  sourceId: '来源标识',
  sourceVersion: '来源版本',
  sourceSnapshot: '来源快照',
  availableAt: '资料可用时间',
  approvedNAV: '批准净值',
  confirmedAmount: '确认金额',
  confirmedShares: '确认份额',
  openingShares: '期初份额',
  closingShares: '期末份额',
  parsedRows: '已解析行数',
  mappedRows: '已对应行数',
  recordCount: '记录条数',
  parseStatus: '解析状态',
  mappingStatus: '资料对应结果',
  valuationResult: '估值结果',
  marketValue: '市值',
  holdingDiff: '持仓差额',
  valuationDiff: '估值差额',
  cashDiff: '资金差额',
  shareDiff: '份额差额',
  sharesDiff: '份额差额',
  returnDiff: '返还差额',
  deliveryChoice: '交付方式',
  reserveMovement: '备付金变动',
  reserveClose: '期末备付金',
  postingCount: '入账次数',
  gross: '成交毛额',
  commission: '佣金',
  settlement: '交收金额',
  TAShares: 'TA 份额',
  TAClosingShares: 'TA 期末份额',
  taShares: 'TA 份额',
  taClosingShares: 'TA 期末份额',
  internalClosingShares: '内部期末份额',
  reserveOpen: '期初备付金',
  settlementInstitution: '结算机构',
  settlementProcessingSystem: '结算处理系统',
  formulaDiff: '公式差额',
  fundsRole: '资金账户角色',
  reserveFormulaDiff: '备付金公式差额',
  calculatedMarketValue: '计算市值',
  comprehensiveB: '综合实务 B',
  oleObject1: 'OLE 对象',
  oleObject7: 'OLE 对象',
};

const publicAbbreviations = new Set(['NAV', 'TA', 'DVP', 'PCF', 'EIR', 'IRR', 'XBRL', 'ETF', 'FOF']);

const publicFileFormats = new Set(['PDF', 'PPT', 'PPTX', 'DOC', 'DOCX', 'XLSX', 'XML', 'OMML', 'OLE']);

function camelTechnicalLabel(token: string): string | null {
  if (inlineTechnicalLabels[token]) return inlineTechnicalLabels[token];
  const parts = token.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().split('-');
  const labels = parts.map((part) => {
    if (part === 'nav') return '净值';
    const singular = part.endsWith('s') ? part.slice(0, -1) : part;
    return fieldTokenLabels[part] ?? fieldTokenLabels[singular] ?? null;
  });
  return labels.every((label) => Boolean(label)) ? labels.join('') : null;
}

function snakeTechnicalLabel(token: string): string | null {
  const labels = token.toLowerCase().split('_').map((part) => {
    const singular = part.endsWith('s') ? part.slice(0, -1) : part;
    return fieldTokenLabels[part] ?? fieldTokenLabels[singular] ?? null;
  });
  return labels.every((label) => Boolean(label)) ? labels.join('') : null;
}

function codedIdentifierLabel(code: string): string {
  if (code === 'T-1') return 'T-1';
  if (code === 'FOF-02') return 'FOF 申购路线';
  if (/^CLR-/i.test(code)) return `清算业务编号 ${code}`;
  if (/^TASK-/i.test(code)) return `清算任务号 ${code}`;
  if (/^(?:FUND|PAY|REC)-ACCT-/i.test(code)) return `资金账户编号 ${code}`;
  if (/^BASIS-/i.test(code)) return `业务依据编号 ${code}`;
  if (/^(?:BASE|FUND|IB)-/i.test(code)) return `清算业务键 ${code}`;
  if (/^(?:CP|OUR)-INST-/i.test(code)) return `结算指令编号 ${code}`;
  if (/^(?:EXA|EXB)-SEC-/i.test(code)) return `证券对象编号 ${code}`;
  if (/^(?:EXA|EXB)-TRD-/i.test(code)) return `交易记录编号 ${code}`;
  if (/^(?:EX|EXA|EXB)-/i.test(code)) return `清算业务键 ${code}`;
  if (/^SETTLE-CONTRACT-/i.test(code)) return `结算合同号 ${code}`;
  if (/^CGB-/i.test(code)) return `债券代码 ${code}`;
  if (/^[PSIT]\d+(?:-[PSIT]\d+)?$/i.test(code)) return `资料位置 ${code}`;
  const materialLocators = code.match(/[AB]-[PIT]\d+/g);
  if (materialLocators?.length) return `材料位置 ${materialLocators.join(' 至 ')}`;
  const tokens = code.split('-').filter(Boolean);
  const labels = tokens.map(optionTokenLabel).filter((label): label is string => Boolean(label));
  const unique = labels.filter((label, index) => labels.indexOf(label) === index);
  const suffix = [...tokens].reverse().find((token) => /^\d+$/.test(token))
    ?? tokens[0]?.match(/\d+$/)?.[0];
  const variant = tokens.find((token) => /^[A-D]$/.test(token));
  if (!unique.length) return `资料编号 ${code}`;
  const base = `${unique.join(' · ')}资料标识`;
  return suffix ? `${base} ${variant ? `${variant}-` : ''}${suffix}` : base;
}

function upperTechnicalLabel(token: string): string {
  if (publicAbbreviations.has(token) || publicFileFormats.has(token)) return token;
  const numberedAbbreviation = [...publicAbbreviations].find((item) => token.startsWith(item) && /^\d+$/.test(token.slice(item.length)));
  if (numberedAbbreviation) return token;
  if (/^[PSIT]\d+(?:R\d+)?$/.test(token)) return `资料位置 ${token}`;
  if (optionValueLabels[token]) return optionValueLabels[token];
  const parts = token.split('_').filter(Boolean);
  const labels = parts.map(optionTokenLabel).filter((label): label is string => Boolean(label));
  const unique = labels.filter((label, index) => labels.indexOf(label) === index);
  if (unique.length) return unique.join(' · ');
  return '资料编号';
}

export interface PublicTextContext {
  line?: Line | null;
  fieldId?: string;
  label?: string;
}

function hasExistingIdentifierContext(prefix: string): boolean {
  const recent = prefix.slice(-80).replace(/\s+/g, '');
  return /(?:清算业务(?:键|编号)?|业务(?:键|编号|依据(?:编号)?)|(?:资金)?账户(?:标识|编号)?|证券(?:代码|对象编号|编号)?|债券(?:代码|编号)?|结算合同(?:键|号)?)[：:为是、，,；;（）()【】\[\]\/]*$/u.test(recent);
}

/** Translate embedded implementation labels without changing submitted values. */
export function publicBusinessText(input: string | number, context?: PublicTextContext | null): string {
  if (typeof input === 'number') return String(input);
  const securityQuantityLabel = context?.line === 'CLEARING'
    || /证券|股票|债券/u.test(context?.label ?? '')
    ? '股'
    : '份';
  let value = input.replace(
    /\b(?:[A-Z][A-Z0-9]*-){1,}[A-Z0-9-]+\b/g,
    (code, offset: number, source: string) => {
      const prefix = source.slice(0, offset);
      if (hasExistingIdentifierContext(prefix)) return code;
      if (/证券代码\s*$/u.test(prefix) && /^(?:EXA|EXB)-SEC-/i.test(code)) return code;
      if (/债券代码\s*$/u.test(prefix) && /^CGB-/i.test(code)) return code;
      return codedIdentifierLabel(code);
    },
  );
  for (const [token, label] of Object.entries(inlineTechnicalLabels)) {
    value = value.replace(new RegExp(`\\b${token}(?=\\d|\\b)`, 'g'), label);
  }
  value = value.replace(/\b[a-z]+(?:[A-Z][A-Za-z0-9]*)+\b/g, (token) => camelTechnicalLabel(token) ?? '字段');
  value = value.replace(/\b[a-z]+(?:_[a-z0-9]+)+\b/g, (token) => snakeTechnicalLabel(token) ?? token);
  value = value
    .replace(/hk_jsmx/gi, '港股通结算明细数据')
    .replace(/approved valuation/gi, '批准估值')
    .replace(/TA closing shares/gi, 'TA 期末份额')
    .replace(/内部 closing shares/gi, '内部期末份额')
    .replace(/internal closing shares/gi, '内部期末份额')
    .replace(/reserve movement/gi, '备付金变动')
    .replace(/reserve close/gi, '期末备付金')
    .replace(/\breserve(?=[\u3400-\u9fff]|\b)/gi, '备付金')
    .replace(/market value/gi, '市值')
    .replace(/source snapshot/gi, '来源快照')
    .replace(/delivery choice/gi, '交付方式')
    .replace(/posting count/gi, '入账次数')
    .replace(/cash diff/gi, '资金差额')
    .replace(/holding diff/gi, '持仓差额')
    .replace(/valuation diff/gi, '估值差额')
    .replace(/shares diff/gi, '份额差额')
    .replace(/return diff/gi, '返还差额')
    .replace(/\bunit\s*\/\s*batch\b/gi, '单位/批')
    .replace(/\bshares?\b/gi, securityQuantityLabel)
    .replace(/\bbatch(?:es)?\b/gi, '批')
    .replace(/\bunit\b/gi, '单位')
    .replace(/\bstatus\b/gi, '状态')
    .replace(/\bstate\b/gi, '状态')
    .replace(/业务字段/g, '资料字段')
    .replace(/\bR\d+\b(?!-)/g, '当前处理步骤');
  // 保留已转成自然说明的清算业务键内部连字符，不把键的片段再次拆成“资料编号”。
  return value.replace(/(?<![A-Z0-9-])[A-Z][A-Z0-9_]{2,}(?![A-Z0-9-])/g, upperTechnicalLabel);
}

const unitLabels: Record<string, string> = {
  CNY: '元',
  CNY_10K: '万元',
  key: '业务键',
  rate: '费率',
  date: '日期',
  share: '份',
  unit: '单位',
  batch: '批',
  'unit/batch': '单位/批',
};

export function publicUnitLabel(
  unit: string,
  context?: Line | PublicTextContext | null,
): string {
  const contextValue = typeof context === 'string' ? { line: context } : context;
  const normalized = unit.trim().toLowerCase();
  if (normalized === 'share') {
    return contextValue?.line === 'CLEARING'
      || /证券|股票|债券/u.test(contextValue?.label ?? '')
      ? '股'
      : '份';
  }
  if (normalized === 'unit' && contextValue?.line === 'CLEARING'
    && /业务|交易|批次|记录|凭证/u.test(contextValue.label ?? '')) {
    return '笔';
  }
  return unitLabels[unit] ?? unitLabels[normalized] ?? publicBusinessText(unit, contextValue);
}

export function businessActionLabel(direction: string): string {
  return optionValueLabels[direction] ?? publicBusinessText(direction);
}

export function workItemTypeLabel(type: string): string {
  return workItemTypeLabels[type] ?? '结果填写';
}

export function lineMapPath(line?: Line | null): string {
  return line ? `/map/${line.toLowerCase()}` : '/worlds';
}

export function lineFromRouteId(routeId?: string | null): Line | null {
  if (routeId?.startsWith('CLR-')) return 'CLEARING';
  if (routeId?.startsWith('ACC-')) return 'ACCOUNTING';
  return null;
}

export function workItemTypeLabelForLine(type: string, line?: Line | null): string {
  return line === 'CLEARING'
    ? (clearingWorkItemTypeLabels[type] ?? '结果填写')
    : workItemTypeLabel(type);
}

export function practiceLedgerLabels(line?: Line | null): {
  direction: string;
  source: string;
  input: string;
} {
  return line === 'CLEARING'
    ? { direction: '处理方向', source: '结果字段', input: '登记结果' }
    : { direction: '方向', source: '资料行', input: '补全科目' };
}

export function practiceFeedbackLabel(type: string, line?: Line | null, correct = false): string {
  const label = workItemTypeLabelForLine(type, line);
  return correct ? `${label}完成` : `请核对${label}`;
}

export function comprehensivePracticeCopy(line?: Line | null): {
  title: string;
  description: string;
} {
  return line === 'CLEARING'
    ? {
      title: '完成清算结果工作纸',
      description: '读取指令、确认和交收资料，登记结果，再用对账来源核对数量、金额与状态。',
    }
    : {
      title: '完成核算工作底稿',
      description: '读取资料、完成计算与账务处理，再用第二来源核对结果。',
    };
}

export function materialKindLabel(kind: string): string {
  return materialKindLabels[kind] ?? '业务资料';
}

/** Convert a private field id to a stable, non-technical display label. */
export function fieldIdLabel(fieldId: string, index?: number): string {
  if (fieldIdLabels[fieldId]) return fieldIdLabels[fieldId];
  const tokens = fieldId
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .split(/[-_\s]+/)
    .filter(Boolean);
  const labels = tokens
    .filter((token) => !/^r\d+$/.test(token) && !/^\d+$/.test(token) && token !== 'b' && token !== 'id' && token !== 'key')
    .map((token) => fieldTokenLabels[token])
    .filter((label): label is string => Boolean(label));
  if (labels.length) return labels.join('');
  return index === undefined ? '当前数据项' : `第 ${index + 1} 项数据`;
}

/** Keep answer values readable without exposing enum-style option ids. */
export function optionValueLabel(value: string, fieldId?: string, index?: number): string {
  const trimmed = value.trim();
  const normalized = trimmed.replace(/-/g, '_');
  if (optionValueLabels[trimmed]) return optionValueLabels[trimmed];
  if (optionValueLabels[normalized]) return optionValueLabels[normalized];
  if (/^\d{4}Q[1-4]$/i.test(normalized)) {
    const year = normalized.slice(0, 4);
    const quarter = normalized.slice(-1);
    return `${year}年第${quarter}季度`;
  }
  if (/^\d{4}H[12]$/i.test(normalized)) {
    return `${normalized.slice(0, 4)}年${normalized.toUpperCase().endsWith('H1') ? '上半年' : '下半年'}`;
  }
  const datedCode = normalized.match(/^([A-Z_]+)_(\d{4})_(\d{2})_(\d{2})$/i);
  if (datedCode) {
    const prefix = datedCode[1].split('_').map(optionTokenLabel).filter((label): label is string => Boolean(label));
    if (prefix.length) return `${prefix.join(' · ')} ${datedCode[2]}-${datedCode[3]}-${datedCode[4]}`;
  }
  if (!/^[A-Z][A-Z0-9_-]*$/.test(trimmed)) return publicBusinessText(trimmed);
  if (/^[A-Z]$/.test(trimmed)) return `第 ${trimmed.charCodeAt(0) - 64} 项`;
  const tokens = normalized.split('_').filter(Boolean);
  const labels = tokens
    .map(optionTokenLabel)
    .filter((label): label is string => Boolean(label));
  if (labels.length) {
    const uniqueLabels = labels.filter((label, tokenIndex) => labels.indexOf(label) === tokenIndex);
    const hasRelation = tokens.some((token) => ['TO', 'FROM'].includes(token.toUpperCase()));
    return uniqueLabels.join(hasRelation ? ' → ' : ' · ');
  }
  if (fieldId) return `已记录：${fieldIdLabel(fieldId, index)}`;
  return index === undefined ? '已记录状态' : `已记录状态（第 ${index + 1} 项）`;
}

/** Choice buttons use a short ordinal label; the submitted option id is unchanged. */
export function optionDisplayLabel(_optionId: string, index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : `选项 ${index + 1}`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}
export function maskEmployeeNo(value: string): string {
  if (value.length <= 2) return value;
  return `${'*'.repeat(Math.max(4, value.length - 2))}${value.slice(-2)}`;
}
