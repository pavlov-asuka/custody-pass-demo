/**
 * 阶段 4 纵向闭环浏览器验收（桌面视口 1440×900）
 * 目标：真实前端 + 真实同源 HTTP + 真实隔离 H2，完成
 * 综合实务未掌握 → 定向补学 → 重新完成并通过 → 解锁 → 双历史快照。
 *
 * 运行：VERIFY_BASE=http://127.0.0.1:18081 node tests/e2e/phase4-vertical.mjs
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const requireFromFrontend = createRequire(new URL('../../frontend/package.json', import.meta.url));
const { chromium } = requireFromFrontend('playwright');

const BASE = process.env.VERIFY_BASE ?? 'http://127.0.0.1:18081';
const EMPLOYEE_NO = process.env.PHASE4_EMPLOYEE_NO ?? '10000002';
const PASSWORD = process.env.PHASE4_PASSWORD ?? 'Demo@1234';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SHOTS = path.join(ROOT, '.local', 'test-results', 'phase4-e2e');
const EVIDENCE_PATH = path.join(ROOT, '.local', 'test-results', 'phase4-e2e-evidence.json');
mkdirSync(SHOTS, { recursive: true });

const FAILING_ANSWER = {
  paymentSource: 'PAYMENT-INSTRUCTION', endingPayable: 0, debitAccount: '银行存款',
  creditAccount: '应付托管费', reconciliation: 'UNBALANCED', note: '已处理。',
};
const PASSING_ANSWER = {
  paymentSource: 'BANK-STATEMENT', endingPayable: 800, debitAccount: '应付托管费',
  creditAccount: '银行存款', reconciliation: 'BALANCED',
  note: '当日支付托管费1400元，期末应付托管费800元，资金、台账和估值结果勾稽一致。',
};

const consoleErrors = [];
const requestFailures = [];
const failures = [];
const evidence = {
  baseUrl: BASE,
  viewport: { width: 1440, height: 900 },
  employeeNo: EMPLOYEE_NO,
  steps: [],
};

function check(name, ok, extra = '') {
  if (ok) {
    console.log(`  ✓ ${name}`);
    evidence.steps.push({ name, ok: true, extra });
  } else {
    console.error(`  ✗ ${name}${extra ? ` —— ${extra}` : ''}`);
    failures.push(name);
    evidence.steps.push({ name, ok: false, extra });
  }
}

async function waitForPageEnterSettled(page) {
  await page.waitForFunction(() => {
    const nodes = [...document.querySelectorAll('.page-enter')];
    if (nodes.length === 0) return true;
    return nodes.every((el) => getComputedStyle(el).opacity === '1');
  }, null, { timeout: 5000 });

  await page.evaluate(async () => {
    const nodes = [...document.querySelectorAll('.page-enter')];
    await Promise.all(nodes.map(async (el) => {
      const animations = typeof el.getAnimations === 'function'
        ? el.getAnimations({ subtree: false })
        : [];
      await Promise.all(
        animations
          .filter((animation) => {
            const iterations = animation.effect?.getComputedTiming?.()?.iterations;
            return iterations !== Infinity && Number.isFinite(iterations ?? 1);
          })
          .map((animation) => animation.finished.catch(() => undefined)),
      );
    }));
  });

  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  }));
}

async function shot(page, name) {
  await waitForPageEnterSettled(page);
  const settle = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.page-enter')];
    return {
      count: nodes.length,
      opacities: nodes.map((el) => getComputedStyle(el).opacity),
      allOpaque: nodes.every((el) => getComputedStyle(el).opacity === '1'),
    };
  });
  check(
    `截图前 page-enter 已显现(${name})`,
    settle.count === 0 || settle.allOpaque,
    `count=${settle.count} opacities=${JSON.stringify(settle.opacities)}`,
  );
  evidence.shots = evidence.shots || [];
  evidence.shots.push({ name, ...settle });

  const file = path.join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  📸 ${name}.png`);
  return file;
}

function watch(page) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => {
    if (!req.url().includes('favicon')) {
      requestFailures.push(`${req.method()} ${req.url()} -> ${req.failure()?.errorText}`);
    }
  });
  page.on('response', (res) => {
    if (res.url().includes('/api/') && res.status() >= 500) {
      requestFailures.push(`${res.status()} ${res.url()}`);
    }
  });
}

async function clickPrimaryByText(page, text, options = {}) {
  const button = page.locator('button.button--primary, button.b3-btn--primary').filter({ hasText: text }).first();
  await button.waitFor({ state: 'visible', timeout: options.timeout ?? 15000 });
  await button.click();
}

async function answerChoiceByKeys(page, keys) {
  for (const key of keys) {
    const option = page.locator('.practice-option, .choice-list button').filter({
      has: page.locator('.practice-option__key, .choice-list__key', { hasText: key }),
    }).first();
    await option.click();
  }
  const submit = page.locator(
    'button.practice-actionbar__submit, .practice-question button.button--primary, .practice-question button.b3-btn--primary',
  ).filter({ hasText: /检查答案|重新提交|提交/ }).first();
  await submit.click();
}

async function answerCurrentPractice(page) {
  const prompt = ((await page.locator('.practice-body__prompt, .practice-question h2').first().textContent()) || '').trim();
  if (await page.locator('.practice-ordering, .ordering-list').count()) {
    const submit = page.locator(
      'button.practice-actionbar__submit, .practice-question button.button--primary, .practice-question button.b3-btn--primary',
    ).first();
    await submit.click();
    return 'ORDERING';
  }
  if (prompt.includes('哪些做法') || prompt.includes('符合核算岗')) {
    await answerChoiceByKeys(page, ['B']);
    return 'MULTIPLE';
  }
  await answerChoiceByKeys(page, ['B']);
  return 'SINGLE';
}

async function waitFeedbackCorrect(page) {
  await page.waitForFunction(() => {
    const nodes = [...document.querySelectorAll('.practice-actionbar__feedback, .feedback')];
    return nodes.some((node) => /判断正确|正确/.test(node.textContent || ''));
  }, null, { timeout: 10000 });
}

async function completeKnowledge(page) {
  for (let i = 0; i < 6; i += 1) {
    const complete = page.locator('button.button--primary').filter({ hasText: '完成知识卡' });
    if (await complete.count()) {
      await complete.first().click();
      return;
    }
    await page.locator('button.button--primary').filter({ hasText: '下一张' }).first().click();
    await page.waitForTimeout(200);
  }
  throw new Error('未能完成知识卡');
}

async function completeDemonstration(page) {
  for (let i = 0; i < 10; i += 1) {
    const complete = page.locator('button.button--primary').filter({ hasText: '完成示范' });
    if (await complete.count()) {
      await complete.first().click();
      return;
    }
    await page.locator('button.button--primary').filter({ hasText: '展开下一步' }).first().click();
    await page.waitForTimeout(200);
  }
  throw new Error('未能完成正常示范');
}

async function completeBasicPractice(page) {
  for (let question = 0; question < 3; question += 1) {
    await page.waitForSelector('.practice-session, .practice-body', { timeout: 15000 });
    await answerCurrentPractice(page);
    await waitFeedbackCorrect(page);
    if (question < 2) {
      await page.waitForFunction((current) => {
        const label = document.querySelector('.practice-session__count')?.textContent || '';
        return label.includes(`第 ${current + 2} /`);
      }, question, { timeout: 10000 });
    }
  }
  await page.waitForSelector('.comprehensive-practice', { timeout: 20000 });
}

async function submitComprehensivePractice(page, answer) {
  await page.waitForSelector('.comprehensive-practice', { timeout: 15000 });
  await page.getByLabel('确认实际支付来源').selectOption(answer.paymentSource);
  await page.getByLabel('计算期末应付余额').fill(String(answer.endingPayable));
  await page.getByLabel('填写借方科目').fill(answer.debitAccount);
  await page.getByLabel('填写贷方科目').fill(answer.creditAccount);
  await page.getByLabel('完成结果勾稽').selectOption(answer.reconciliation);
  await page.getByLabel('记录核算结论').fill(answer.note);
  await page.waitForTimeout(1100);
  await page.locator('button.button--primary').filter({ hasText: '提交综合实务' }).click();
  await page.locator('.modal button.button--primary').filter({ hasText: '确认提交' }).click();
  await page.waitForURL(/\/attempts\/\d+/, { timeout: 20000 });
  const attemptId = Number(page.url().match(/\/attempts\/(\d+)/)?.[1] || 0);
  await page.waitForSelector('[data-testid="result-view"]', { timeout: 30000 });
  return attemptId;
}

async function completeAllRemediation(page) {
  await page.waitForSelector('.remediation-page', { timeout: 15000 });
  const progressText = (await page.locator('.remediation-nav__progress span').first().textContent()) || '';
  const total = Number(progressText.split('/')[1]?.trim() || '0');
  check('补学计划目标数 > 0', total > 0, progressText);
  evidence.remediationTotalTargets = total;

  for (let i = 0; i < total; i += 1) {
    await page.waitForSelector('.remediation-card .practice-question, .completed-target', { timeout: 15000 });
    if (await page.locator('.completed-target').count()) {
      const nextIncomplete = page.locator('.remediation-nav button').filter({ hasText: '待补学' }).first();
      if (await nextIncomplete.count()) await nextIncomplete.click();
      continue;
    }
    await answerCurrentPractice(page);
    await waitFeedbackCorrect(page);
    await page.waitForTimeout(800);
  }

  await page.waitForSelector('button.button--primary:has-text("重新完成综合实务")', { timeout: 20000 });
  check('全部补学完成后出现重新完成按钮', true);
  await clickPrimaryByText(page, '重新完成综合实务');
  await page.waitForURL(/\/learn\/ACC-LIFE-ROLE-001/, { timeout: 15000 });
  await page.waitForSelector('.comprehensive-practice', { timeout: 15000 });
}

async function goToAccountingMap(page) {
  await page.locator('button.brand').click();
  await page.waitForSelector('[data-testid="world-grid"]', { timeout: 15000 });
  await page.locator('.world-card', { hasText: '核算' }).locator('button', { hasText: '进入学习地图' }).click();
  await page.waitForSelector('[data-testid="learning-map"]', { timeout: 15000 });
}

async function openRecords(page) {
  await page.locator('.user-menu__trigger').click();
  await page.locator('.user-menu__panel button').filter({ hasText: '我的训练记录' }).click();
  await page.waitForSelector('[data-testid="records-list"]', { timeout: 15000 });
}

async function run() {
  console.log(`\n=== phase4-vertical @ ${BASE} (1440x900) ===`);
  const browser = await chromium.launch({ channel: 'chrome' }).catch(async () => chromium.launch());
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN',
  });
  const page = await context.newPage();
  watch(page);

  await page.goto(`${BASE}/`);
  await page.waitForSelector('.login-panel', { timeout: 20000 });
  await shot(page, '01-login');

  const worldsStatus = await page.request.get(`${BASE}/api/worlds`);
  check('未登录不能访问受保护资源 /api/worlds', worldsStatus.status() === 401, `status=${worldsStatus.status()}`);

  await page.fill('input[name="employeeNo"]', EMPLOYEE_NO);
  await page.fill('input[name="password"]', PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForSelector('[data-testid="world-grid"]', { timeout: 20000 });
  await shot(page, '02-worlds');

  const worldCards = page.locator('.world-card');
  check('三世界入口数量为 3', (await worldCards.count()) === 3, `count=${await worldCards.count()}`);
  check('清算显示内容建设中', await page.locator('.world-card', { hasText: '清算' }).locator('.building-tag').count() > 0);
  check('监督显示内容建设中', await page.locator('.world-card', { hasText: '监督' }).locator('.building-tag').count() > 0);
  await page.locator('.world-card', { hasText: '核算' }).locator('button', { hasText: '进入学习地图' }).click();
  await page.waitForSelector('[data-testid="learning-map"]', { timeout: 15000 });
  await shot(page, '03-map-before');

  const lockedLabel = page.locator('.map-track__node', { hasText: '接管一只新产品' });
  check('下一路线初始锁定/建设中可见', await lockedLabel.count() > 0);
  await page.locator('button.map-node[aria-label*="站上核算岗"]:not([disabled])').first().click();
  await page.waitForURL(/\/learn\/ACC-LIFE-ROLE-001/, { timeout: 15000 });
  await page.waitForSelector('.knowledge-card, .lesson-card', { timeout: 15000 });
  await shot(page, '04-knowledge');

  await completeKnowledge(page);
  await page.waitForSelector('.demonstration, .demo-timeline', { timeout: 15000 });
  await shot(page, '05-demonstration');
  await completeDemonstration(page);
  await page.waitForSelector('.practice-session', { timeout: 15000 });
  await shot(page, '06-basic-practice');
  await completeBasicPractice(page);
  await shot(page, '07-comprehensive-practice-before-fail');

  const firstAttemptId = await submitComprehensivePractice(page, FAILING_ANSWER);
  evidence.firstAttemptId = firstAttemptId;
  check('第一次正式作答已生成 attempt', firstAttemptId > 0, `attemptId=${firstAttemptId}`);
  const failTitle = (await page.locator('[data-testid="result-view"] h1').textContent()) || '';
  check('第一次结果为未掌握/需补强', /补强|还需要|定向补学/.test(failTitle), failTitle);
  const failActions = (await page.locator('.result-actions').innerText()) || '';
  check('第一次结果提供开始定向补学', failActions.includes('开始定向补学'), failActions);
  await shot(page, '08-result-not-mastered');

  const mapAfterFailApi = await page.evaluate(async () => {
    const response = await fetch('/api/lines/ACCOUNTING/map', { credentials: 'include' });
    return response.json();
  });
  const nextAfterFailApi = mapAfterFailApi.regions?.[0]?.modules?.[0]?.nodes?.[1];
  check('第一次未掌握后下一路线仍锁定', nextAfterFailApi?.locked === true,
    JSON.stringify({ locked: nextAfterFailApi?.locked, state: nextAfterFailApi?.state }));
  await goToAccountingMap(page);
  await shot(page, '09-map-after-fail');

  await openRecords(page);
  await page.locator('.record-row__open').first().click();
  await page.waitForSelector('.record-detail-header, [data-testid="result-view"]', { timeout: 15000 });
  const continueRemediation = page.locator('button.button--primary').filter({ hasText: /继续本次补学|开始定向补学/ });
  await continueRemediation.first().click();
  await page.waitForSelector('.remediation-page', { timeout: 15000 });
  await shot(page, '10-remediation-start');
  await completeAllRemediation(page);
  await shot(page, '11-comprehensive-practice-after-remediation');

  const mapProbe = await page.evaluate(async () => {
    const response = await fetch('/api/lines/ACCOUNTING/map', { credentials: 'include' });
    return response.json();
  });
  const firstNode = mapProbe.regions?.[0]?.modules?.[0]?.nodes?.[0];
  check('补学完成后路线仍为待补学/未掌握', firstNode?.state === 'LEARNED_NOT_MASTERED', firstNode?.state);

  const secondAttemptId = await submitComprehensivePractice(page, PASSING_ANSWER);
  evidence.secondAttemptId = secondAttemptId;
  check('第二次正式作答生成新 attempt', secondAttemptId > 0 && secondAttemptId !== firstAttemptId,
    `first=${firstAttemptId} second=${secondAttemptId}`);
  const passTitle = (await page.locator('[data-testid="result-view"] h1').textContent()) || '';
  check('第二次结果为已通过', passTitle.includes('已通过'), passTitle);
  await shot(page, '12-result-passed');

  await page.locator('button.button--primary').filter({ hasText: '返回地图继续学习' }).click();
  await page.waitForSelector('[data-testid="learning-map"]', { timeout: 15000 });
  const passedNodeText = (await page.locator('.map-track__node', { hasText: '站上核算岗' }).innerText()) || '';
  const nextAfterPassText = (await page.locator('.map-track__node', { hasText: '接管一只新产品' }).innerText()) || '';
  check('地图显示首路线已通过', passedNodeText.includes('已通过'), passedNodeText);
  check('下一路线已由后端解锁展示', /未开始|内容建设中/.test(nextAfterPassText) && !nextAfterPassText.includes('尚未解锁'), nextAfterPassText);
  await shot(page, '13-map-after-pass');

  const mapAfter = await page.evaluate(async () => {
    const response = await fetch('/api/lines/ACCOUNTING/map', { credentials: 'include' });
    return response.json();
  });
  const nodes = mapAfter.regions?.[0]?.modules?.[0]?.nodes || [];
  check('API 首节点 PASSED', nodes[0]?.state === 'PASSED', nodes[0]?.state);
  check('API 下一节点解锁且不可进入', nodes[1]?.locked === false && nodes[1]?.enterable === false,
    JSON.stringify({ locked: nodes[1]?.locked, enterable: nodes[1]?.enterable, state: nodes[1]?.state }));

  await openRecords(page);
  await shot(page, '14-records');
  const recordRows = page.locator('.record-row');
  check('训练记录至少两条', (await recordRows.count()) >= 2, `count=${await recordRows.count()}`);

  await page.locator('select').nth(1).selectOption('LEARNED_NOT_MASTERED');
  await page.waitForTimeout(500);
  check('未掌握筛选可见记录', (await page.locator('.record-row').count()) >= 1);
  await page.locator('.record-row__open').first().click();
  await page.waitForSelector('.record-detail-header', { timeout: 15000 });
  const detailText = (await page.locator('.record-detail-page').innerText()) || '';
  check('历史详情保留未掌握结论', detailText.includes('本次未掌握'), detailText.slice(0, 120));
  check('历史详情同时显示路线当前已通过', detailText.includes('路线当前：已通过') || detailText.includes('已通过'), detailText.slice(0, 160));
  await shot(page, '15-record-detail-not-mastered');

  await page.locator('button.text-button').filter({ hasText: '返回训练记录' }).click();
  await page.waitForSelector('[data-testid="records-list"]', { timeout: 15000 });
  await page.locator('select').nth(1).selectOption('PASSED');
  await page.waitForTimeout(500);
  await page.locator('.record-row__open').first().click();
  await page.waitForSelector('.record-detail-header', { timeout: 15000 });
  const passDetail = (await page.locator('.record-detail-page').innerText()) || '';
  check('通过历史记录保留已通过结论', passDetail.includes('本次已通过'), passDetail.slice(0, 120));
  await shot(page, '16-record-detail-passed');

  const apiHistory = await page.evaluate(async (ids) => {
    const first = await fetch(`/api/training-records/${ids.first}`, { credentials: 'include' }).then((r) => r.json());
    const second = await fetch(`/api/training-records/${ids.second}`, { credentials: 'include' }).then((r) => r.json());
    return {
      first: {
        historicalConclusion: first.historicalConclusion,
        currentRouteState: first.currentRouteState,
        answerSnapshot: first.answerSnapshot,
      },
      second: {
        historicalConclusion: second.historicalConclusion,
        currentRouteState: second.currentRouteState,
      },
    };
  }, { first: firstAttemptId, second: secondAttemptId });
  check('API 第一条历史仍为未掌握', apiHistory.first.historicalConclusion === 'LEARNED_NOT_MASTERED');
  check('API 第一条历史当前状态为已通过', apiHistory.first.currentRouteState === 'PASSED');
  check(
    'API 第一条答案快照未变',
    JSON.stringify(apiHistory.first.answerSnapshot) === JSON.stringify({
      responses: {
        'payment-source': FAILING_ANSWER.paymentSource,
        'ending-payable': FAILING_ANSWER.endingPayable,
        'debit-account': FAILING_ANSWER.debitAccount,
        'credit-account': FAILING_ANSWER.creditAccount,
        'reconciliation-result': FAILING_ANSWER.reconciliation,
        'result-note': FAILING_ANSWER.note,
      },
    }),
  );
  check('API 第二条历史为已通过', apiHistory.second.historicalConclusion === 'PASSED');
  evidence.history = apiHistory;

  await browser.close();
}

try {
  await run();
} catch (error) {
  console.error(error);
  failures.push(`uncaught:${error.message}`);
  evidence.uncaught = String(error);
}

writeFileSync(EVIDENCE_PATH, JSON.stringify(evidence, null, 2), 'utf8');
console.log(`\n证据文件：${EVIDENCE_PATH}`);
console.log('\n=== 控制台错误 ===');
const unexpectedConsole = consoleErrors.filter((line) => !/401|favicon/i.test(line));
console.log(consoleErrors.length ? consoleErrors.join('\n') : '（无）');
console.log('\n=== 请求失败 ===');
console.log(requestFailures.length ? requestFailures.join('\n') : '（无）');

if (failures.length > 0 || unexpectedConsole.length > 0 || requestFailures.length > 0) {
  console.error(`\n阶段 4 浏览器纵向闭环失败：${failures.length} 项断言 / ${unexpectedConsole.length} 控制台错误 / ${requestFailures.length} 请求失败`);
  for (const item of failures) console.error(` - ${item}`);
  process.exit(1);
}

console.log('\n阶段 4 浏览器纵向闭环全部断言通过');
