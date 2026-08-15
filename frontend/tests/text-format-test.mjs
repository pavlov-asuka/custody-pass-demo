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
assert.equal(format.businessActionLabel('RETURN_TO_AP'), '退回申赎参与人');
assert.equal(format.businessActionLabel('IN_KIND'), '实物交付');

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
