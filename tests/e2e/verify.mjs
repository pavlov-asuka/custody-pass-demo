/**
 * 托管智训营端到端验证（桌面视口 1440×900）
 * 运行：node tests/e2e/verify.mjs（VERIFY_BASE 可指向同源部署，如 http://localhost:8080）
 * 任何断言失败都会以非零退出码结束。
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const requireFromFrontend = createRequire(new URL('../../frontend/package.json', import.meta.url));
const { chromium } = requireFromFrontend('playwright');
const BASE = process.env.VERIFY_BASE ?? 'http://127.0.0.1:5173';
const SHOTS = new URL('../../.local/test-results/e2e/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
mkdirSync(SHOTS, { recursive: true });

const consoleErrors = [];
const requestFailures = [];
const failures = [];

function check(name, ok, extra = '') {
  if (ok) console.log(`  ✓ ${name}`);
  else {
    console.error(`  ✗ ${name}${extra ? ` —— ${extra}` : ''}`);
    failures.push(name);
  }
}

function watch(page, tag) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[${tag}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => consoleErrors.push(`[${tag}] pageerror: ${err.message}`));
  page.on('requestfailed', (req) => {
    if (!req.url().includes('favicon')) {
      requestFailures.push(`[${tag}] ${req.method()} ${req.url()} -> ${req.failure()?.errorText}`);
    }
  });
  page.on('response', (res) => {
    if (res.url().includes('/api/') && res.status() >= 500) {
      requestFailures.push(`[${tag}] ${res.status()} ${res.url()}`);
    }
  });
}

const DEMO_ANSWER = `首先，我会核对交收状态与指令要素，确认本次为部分交收后，按合同约定比例计算应交收数量与金额。
其次，分类记录差异：区分资金不足、券不足或对手方原因，登记差异台账并留存凭证。
第三，及时跟进异常：与对手方及清算机构沟通确认剩余部分的交收安排，明确补交收时间。
同时关注风险：部分交收可能影响后续资金与头寸安排，需要评估敞口并报告主管。
最后，将处理过程与结果完整记录在案，保证表达清晰、依据充分，便于复核与追踪。`;

async function shot(page, name) {
  await page.screenshot({ path: `${SHOTS}${name}.png` });
  console.log(`  📸 ${name}.png`);
}

async function runFlow(tag, viewport) {
  console.log(`\n=== ${tag} (${viewport.width}x${viewport.height}) @ ${BASE} ===`);
  const browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext({ viewport, locale: 'zh-CN' });
  const page = await context.newPage();
  watch(page, tag);

  // 1. 未登录访问首页 → 应回登录页
  await page.goto(`${BASE}/`);
  await page.waitForSelector('.login-panel', { timeout: 10000 });
  await shot(page, `${tag}-01-login`);

  // 2. 空输入校验
  await page.click('.login-submit');
  await page.waitForSelector('.form-error', { timeout: 5000 });
  check('空输入校验提示出现', true);

  // 3. 真实登录
  await page.fill('#employeeNo', '10000001');
  await page.fill('#password', 'Demo@1234');
  await page.click('.login-submit');
  await page.waitForSelector('.gpanel', { timeout: 15000 });
  await page.waitForTimeout(900);
  check('登录后进入学习地图（成长面板出现）', true);
  await shot(page, `${tag}-02-map`);

  // 3b. 成长面板元素
  check('等级徽章出现', await page.locator('.gpanel-badge').isVisible());
  check('XP 进度条出现', await page.locator('.gpanel-xpbar').isVisible());
  check('继续训练按钮出现', await page.locator('.gpanel-btn').isVisible());

  // 3c. 关卡节点状态
  const currentNodes = await page.locator('.rpath-current').count();
  const phNodes = await page.locator('.rpath-ph').count();
  check('关卡路径出现（含当前/筹备中节点）', currentNodes + phNodes > 0, `current=${currentNodes} ph=${phNodes}`);

  // 3d. 路线切换
  await page.locator('.map2-route').nth(1).click();
  await page.waitForTimeout(400);
  const switchedTitle = await page.locator('.map2-path-title').innerText();
  check('路线切换到估值核算', switchedTitle.includes('核算'), switchedTitle);
  await page.locator('.map2-route').nth(0).click();
  await page.waitForTimeout(400);
  await shot(page, `${tag}-03-map-path`);

  // 4. 通过案例条进入第一个案例
  await page.click('.map2-casebar-btn');
  await page.waitForSelector('.case-editor', { timeout: 10000 });
  await page.waitForTimeout(400);
  check('进入案例作答页', true);
  await shot(page, `${tag}-04-case`);

  // 5. 作答并提交 → 等待评分 → 结果页
  await page.fill('.case-editor', DEMO_ANSWER);
  await page.click('.case-submit');
  const overlay = page.locator('.review-overlay');
  if (await overlay.isVisible({ timeout: 800 }).catch(() => false)) {
    await shot(page, `${tag}-05-reviewing`);
    check('评分等待浮层出现', true);
  } else {
    check('评分等待浮层出现', false, '未捕捉到');
  }
  await page.waitForSelector('.result-hero', { timeout: 20000 });
  await page.waitForTimeout(1400);
  check('提交后进入四维结果页', true);
  await shot(page, `${tag}-06-result`);

  // 展开四维明细
  const dimHeads = page.locator('.dim-head');
  const dimCount = await dimHeads.count();
  for (let i = 0; i < dimCount; i += 1) {
    await dimHeads.nth(i).click();
  }
  await page.waitForTimeout(500);
  check('四维明细展开（4 个维度）', dimCount === 4, `dimCount=${dimCount}`);
  check('命中/遗漏点展示', (await page.locator('.dim-point').count()) > 0);
  await shot(page, `${tag}-07-result-detail`);

  // 6. 训练记录列表与详情
  await page.goto(`${BASE}/#/records`);
  await page.waitForSelector('.record-row, .state-block', { timeout: 10000 });
  await page.waitForTimeout(500);
  await shot(page, `${tag}-08-records`);
  const firstRow = page.locator('.record-row').first();
  if (await firstRow.isVisible().catch(() => false)) {
    await firstRow.click();
    await page.waitForSelector('.result-hero', { timeout: 10000 });
    check('记录详情可回看', true);
  } else {
    check('记录详情可回看', false, '无记录行');
  }

  // 7. 知识问答
  await page.goto(`${BASE}/#/knowledge`);
  await page.waitForSelector('.kb-ask-input', { timeout: 10000 });
  await page.fill('.kb-ask-input', '部分交收时应先核对哪些信息？');
  await page.click('.kb-ask-btn');
  await page.waitForSelector('.kb-a-answer, .kb-a-error', { timeout: 15000 });
  await page.waitForTimeout(400);
  check('知识问答返回结果', await page.locator('.kb-a-answer').isVisible().catch(() => false));
  await shot(page, `${tag}-09-knowledge`);

  // 8. 刷新后会话恢复（/api/auth/me）
  await page.reload();
  await page.waitForSelector('.kb-ask-input, .login-panel', { timeout: 10000 });
  const stillAuthed = await page.locator('.kb-ask-input').isVisible().catch(() => false);
  check('刷新后会话恢复，未回登录页', stillAuthed);

  // 9. 退出登录 → 服务端会话失效 + 不能再访问业务页
  await page.click('.user-chip');
  await page.click('.user-menu-item');
  await page.waitForSelector('.login-panel', { timeout: 10000 });
  const meStatus = await page.evaluate(async () => {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    return res.status;
  });
  check('退出后服务端会话已失效（/api/auth/me = 401）', meStatus === 401, `me=${meStatus}`);
  await page.goto(`${BASE}/#/`);
  await page.waitForTimeout(800);
  const bounced = await page.locator('.login-panel').isVisible().catch(() => false);
  check('退出后访问业务页被弹回登录页', bounced);
  await shot(page, `${tag}-10-after-logout`);

  await browser.close();
}

await runFlow('desktop', { width: 1440, height: 900 });

console.log('\n=== 控制台错误 ===');
console.log(consoleErrors.length ? consoleErrors.join('\n') : '（无）');
console.log('\n=== 请求失败 ===');
console.log(requestFailures.length ? requestFailures.join('\n') : '（无）');

if (failures.length > 0) {
  console.error(`\n${failures.length} 项断言失败：`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log('\n全部断言通过');
