import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const sourcePath = path.resolve(process.cwd(), 'src/utils/format.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const format = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);

assert.equal(format.publicUnitLabel('key'), '业务键');
assert.equal(format.publicUnitLabel('rate'), '费率');
assert.equal(format.publicUnitLabel('date'), '日期');
assert.equal(format.publicUnitLabel('CNY_10K'), '万元');
assert.equal(format.publicUnitLabel('CNY'), '元');
assert.equal(format.publicUnitLabel('share'), '份');
assert.equal(format.publicUnitLabel('share', 'CLEARING'), '股');
assert.equal(format.publicUnitLabel('unit'), '单位');
assert.equal(format.publicUnitLabel('unit', { line: 'CLEARING', label: '批次数量' }), '笔');
assert.equal(format.publicUnitLabel('unit', { line: 'CLEARING', label: '指令数量' }), '单位');
assert.equal(format.publicUnitLabel('batch', 'CLEARING'), '批');
assert.equal(format.publicUnitLabel('unit/batch', 'CLEARING'), '单位/批');
assert.equal(format.lineFromRouteId('SPV-CONTRACT-001'), 'SUPERVISION');
assert.equal(format.lineMapPath('SUPERVISION'), '/map/supervision');
assert.equal(format.publicBusinessText('2400 share / 12 batch / 110 unit/batch'), '2400 份 / 12 批 / 110 单位/批');
assert.equal(format.businessActionLabel('RETURN_TO_AP'), '退回申赎参与人');
assert.equal(format.businessActionLabel('IN_KIND'), '实物交付');
assert.equal(format.businessActionLabel('NON_DIRECT'), '非直联');
assert.equal(format.businessActionLabel('CCDC'), '中央国债登记结算有限责任公司');
assert.equal(format.businessActionLabel('SHCH'), '银行间市场清算所股份有限公司');
assert.equal(format.businessActionLabel('SETTLEMENT_PROCESSING_SYSTEM'), '结算处理系统');
assert.equal(format.businessActionLabel('DELIVER_SECURITIES'), '交付证券');
assert.equal(format.businessActionLabel('RECEIVING_SECURITIES_ACCOUNT'), '接收方证券账户');
assert.equal(format.businessActionLabel('PAYER_FUNDS_ACCOUNT'), '付款方资金账户');
assert.equal(format.businessActionLabel('CONFIRMED_FOR_SETTLEMENT'), '已确认待结算');
assert.equal(format.businessActionLabel('ACCOUNT_ROLES_COMPLETE'), '账户角色已齐全');
assert.equal(format.businessActionLabel('DVP_SETTLED'), 'DVP已完成交收');
assert.equal(format.businessActionLabel('EOD_CLOSED'), '日终已关闭');
assert.equal(format.optionValueLabel('CCDC / SETTLEMENT_PROCESSING_SYSTEM'), '中央国债登记结算有限责任公司 / 结算处理系统');
assert.equal(format.optionValueLabel('DVP / NON_DIRECT'), 'DVP / 非直联');
assert.equal(format.optionValueLabel('DVP_SETTLED / EOD_CLOSED'), 'DVP已完成交收 / 日终已关闭');
assert.equal(format.optionValueLabel('SETTLEMENT_OBLIGATION'), '清算义务对象');
assert.equal(format.optionValueLabel('INSTRUCTION_ACCEPTED'), '指令已受理');
assert.equal(format.optionValueLabel('READY_FOR_SETTLEMENT'), '已具备结算条件');
assert.equal(format.optionValueLabel('NORMAL_CLOSED'), '已正常关闭');
assert.equal(format.optionValueLabel('NOT_LOCKED'), '未锁定');
assert.equal(format.optionValueLabel('CASE_APPROVED_CHANNEL_A'), '批准渠道 A');
assert.equal(format.optionValueLabel('CASE_APPROVED_CHANNEL_B'), '批准渠道 B');
assert.equal(format.optionValueLabel('TRADE_SYSTEM'), '交易系统');
assert.equal(format.optionValueLabel('RECONCILIATION_REVIEWER'), '对账复核方');
assert.equal(format.optionValueLabel('BUYER_BOND_ACCOUNT_B'), '买方债券账户 B');
assert.equal(format.optionValueLabel('BUYER_DVP_FUNDS_ACCOUNT_B'), '买方 DVP 资金账户 B');
assert.equal(format.publicBusinessText('CLR-BASE-B-SETTLEMENT'), '清算业务编号 CLR-BASE-B-SETTLEMENT');
assert.equal(format.publicBusinessText('FUND-ACCT-A-101'), '资金账户编号 FUND-ACCT-A-101');
assert.equal(format.publicBusinessText('BASIS-B-20260822-184'), '业务依据编号 BASIS-B-20260822-184');
assert.equal(format.publicBusinessText('证券代码 EXB-SEC-01'), '证券代码 EXB-SEC-01');
assert.equal(format.publicBusinessText('债券代码 CGB-EDU-2026-B'), '债券代码 CGB-EDU-2026-B');
assert.equal(format.publicBusinessText('业务键BASE-A-20260818-017'), '业务键BASE-A-20260818-017');
assert.equal(format.publicBusinessText('证券 EXA-SEC-01'), '证券 EXA-SEC-01');
assert.equal(format.publicBusinessText('债券 CGB-EDU-2026-A'), '债券 CGB-EDU-2026-A');
assert.equal(format.publicBusinessText('账户 FUND-ACCT-A-101'), '账户 FUND-ACCT-A-101');
assert.equal(format.publicBusinessText('业务依据 BASIS-B-20260822-184'), '业务依据 BASIS-B-20260822-184');
assert.equal(format.publicBusinessText('external_closing_balance'), '外部期末余额');
assert.equal(format.publicBusinessText('SETTLEMENT_OBLIGATION / TASK_ACCEPTED / SETTLED'), '清算义务对象 / 任务已受理 / 已完成交收');
assert.equal(format.workItemTypeLabelForLine('LEDGER_ENTRY', 'CLEARING'), '结果登记');
assert.equal(format.workItemTypeLabelForLine('LEDGER_ENTRY', 'ACCOUNTING'), '账务填写');
assert.equal(format.fieldIdLabel('clr-base-b-instruction-source'), '指令资料来源');
assert.equal(format.fieldIdLabel('clr-base-b-confirmation-source'), '确认资料来源');
assert.equal(format.fieldIdLabel('clr-base-b-result-ledger'), '结果台账来源');
assert.equal(format.fieldIdLabel('base-instruction-source'), '指令资料来源');
assert.equal(format.fieldIdLabel('base-confirmation-source'), '确认资料来源');
assert.equal(format.fieldIdLabel('base-result-ledger'), '结果台账来源');

const dynamic = format.publicBusinessText(
  'recordCount/parsedRows/parseStatus=PASS；FOF01-B-CASH→actualCash；CASE-ED-B1-XBRL-01',
);
assert.match(dynamic, /记录条数\/已解析行数\/解析状态=校验通过/);
assert.match(dynamic, /资金资料标识.*实际到账资金/);
assert.match(dynamic, /XBRL资料标识 01|XBRL 资料标识 01/);
assert.doesNotMatch(dynamic, /recordCount|parsedRows|parseStatus|actualCash|业务状态/);

assert.equal(format.publicBusinessText('RETURN_TO_AP、IN_KIND、DEDUCT'), '退回申赎参与人、实物交付、扣减');

const routeTerms = format.publicBusinessText(
  'SHARES_POSTED；MAPPED；reserve现金链；reserveOpen；formulaDiff；TAShares；TAClosingShares；calculatedMarketValue；IRR',
);
assert.match(routeTerms, /份额已登记/);
assert.match(routeTerms, /来源已对应/);
assert.match(routeTerms, /备付金现金链/);
assert.match(routeTerms, /期初备付金/);
assert.match(routeTerms, /公式差额/);
assert.match(routeTerms, /TA 份额/);
assert.match(routeTerms, /TA 期末份额/);
assert.match(routeTerms, /计算市值/);
assert.match(routeTerms, /IRR/);
assert.doesNotMatch(routeTerms, /业务资料标识|业务字段|TAShares|reserveOpen|formulaDiff/);

const clearingTerms = format.publicBusinessText(
  'faceValue=185.7500 CNY_10K; settlementAmount=2487650.00 CNY; '
    + 'settlementInstitution=CCDC; settlementProcessingSystem=SETTLEMENT_PROCESSING_SYSTEM; '
    + 'direction=DELIVER_SECURITIES; accountRole=RECEIVING_SECURITIES_ACCOUNT; '
    + 'fundsRole=PAYER_FUNDS_ACCOUNT; channel=NON_DIRECT; status=CONFIRMED_FOR_SETTLEMENT',
);
assert.match(clearingTerms, /185\.7500 万元/);
assert.match(clearingTerms, /2487650\.00 元/);
assert.match(clearingTerms, /中央国债登记结算有限责任公司/);
assert.match(clearingTerms, /结算处理系统/);
assert.match(clearingTerms, /交付证券/);
assert.match(clearingTerms, /接收方证券账户/);
assert.match(clearingTerms, /付款方资金账户/);
assert.match(clearingTerms, /非直联/);
assert.match(clearingTerms, /已确认待结算/);
assert.doesNotMatch(clearingTerms, /业务资料标识|业务字段|CNY_10K|NON_DIRECT|SETTLEMENT_PROCESSING_SYSTEM|DELIVER_SECURITIES|RECEIVING_SECURITIES_ACCOUNT|PAYER_FUNDS_ACCOUNT/);

const mixedTerms = format.publicBusinessText(
  '内部 closing shares 读取或登记错误；archiveId/status/state 已与资料核对',
);
assert.equal(mixedTerms, '内部期末份额 读取或登记错误；归档标识/状态/状态 已与资料核对');
assert.doesNotMatch(mixedTerms, /closing shares|archiveId|\bstatus\b|\bstate\b/);

const visibleKeys = new Set([
  'title', 'summary', 'conclusion', 'items', 'facts', 'action', 'reason', 'prompt',
  'explanation', 'hints', 'label', 'source', 'formula', 'placeholder', 'description',
  'instruction', 'submissionNote', 'role', 'date', 'product', 'purpose', 'value', 'text',
]);
const genericFindings = [];
const unitFindings = [];
const unitPropertyFindings = [];
function scanLearnerText(value, jsonPath, fileName, key = '') {
  if (typeof value === 'string') {
    if (visibleKeys.has(key) && !jsonPath.includes('.references')) {
      const displayed = format.publicBusinessText(value);
      if (displayed.includes('业务资料标识') || displayed.includes('业务字段')
        || /内部 closing shares|\bstatus\b|\bstate\b|\b[a-z]+(?:_[a-z0-9]+)+\b/.test(displayed)) {
        genericFindings.push(`${fileName}:${jsonPath} => ${displayed}`);
      }
      if (/\b(?:share|shares|unit|units|batch|batches)\b/i.test(displayed)) {
        unitFindings.push(`${fileName}:${jsonPath} => ${displayed}`);
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanLearnerText(item, `${jsonPath}[${index}]`, fileName, key));
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([childKey, child]) => {
      scanLearnerText(child, `${jsonPath}.${childKey}`, fileName, childKey);
    });
  }
}

function scanUnitProperties(value, jsonPath, fileName, line) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanUnitProperties(item, `${jsonPath}[${index}]`, fileName, line));
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (typeof value.unit === 'string') {
    const displayed = format.publicUnitLabel(value.unit, {
      line,
      fieldId: typeof value.fieldId === 'string' ? value.fieldId : undefined,
      label: typeof value.label === 'string' ? value.label : undefined,
    });
    if (/\b(?:share|shares|unit|units|batch|batches)\b/i.test(displayed)) {
      unitPropertyFindings.push(`${fileName}:${jsonPath}.unit => ${displayed}`);
    }
  }
  Object.entries(value).forEach(([childKey, child]) => {
    scanUnitProperties(child, `${jsonPath}.${childKey}`, fileName, line);
  });
}

for (const routeDirectoryName of ['accounting', 'clearing']) {
  const routeDirectory = path.resolve(process.cwd(), `../content/routes/${routeDirectoryName}`);
  for (const fileName of fs.readdirSync(routeDirectory).filter((name) => name.endsWith('.json'))) {
    const route = JSON.parse(fs.readFileSync(path.join(routeDirectory, fileName), 'utf8'));
    scanLearnerText(route, '$', fileName);
    scanUnitProperties(route, '$', fileName, route.line);
    if (routeDirectoryName === 'clearing') {
      for (const item of route.steps?.COMPREHENSIVE_PRACTICE?.workItems ?? []) {
        const displayed = format.fieldIdLabel(item.workItemId);
        assert.doesNotMatch(displayed, /基数|资料编号|当前数据项|[a-z]/, `${fileName}:${item.workItemId} leaked an internal field label: ${displayed}`);
      }
    }
  }
}
assert.deepEqual(genericFindings, [], `Learner-facing text collapsed to generic labels:\n${genericFindings.join('\n')}`);
assert.deepEqual(unitFindings, [], `Learner-facing text exposed English units:\n${unitFindings.join('\n')}`);
assert.deepEqual(unitPropertyFindings, [], `Unit properties exposed English units:\n${unitPropertyFindings.join('\n')}`);

console.log('Learner-facing text format tests passed.');
