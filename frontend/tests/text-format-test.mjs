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
function scanLearnerText(value, jsonPath, fileName, key = '') {
  if (typeof value === 'string') {
    if (visibleKeys.has(key) && !jsonPath.includes('.references')) {
      const displayed = format.publicBusinessText(value);
      if (displayed.includes('业务资料标识') || displayed.includes('业务字段')
        || /内部 closing shares|\bstatus\b|\bstate\b/.test(displayed)) {
        genericFindings.push(`${fileName}:${jsonPath} => ${displayed}`);
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

const routeDirectory = path.resolve(process.cwd(), '../content/routes/accounting');
for (const fileName of fs.readdirSync(routeDirectory).filter((name) => name.endsWith('.json'))) {
  const route = JSON.parse(fs.readFileSync(path.join(routeDirectory, fileName), 'utf8'));
  scanLearnerText(route, '$', fileName);
}
assert.deepEqual(genericFindings, [], `Learner-facing text collapsed to generic labels:\n${genericFindings.join('\n')}`);

console.log('Learner-facing text format tests passed.');
