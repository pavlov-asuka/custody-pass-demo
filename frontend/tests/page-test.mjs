import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const root = process.cwd();
const screenshotDir = process.env.PHASE3_PAGE_TEST_SCREENSHOT_DIR
  ? path.resolve(process.env.PHASE3_PAGE_TEST_SCREENSHOT_DIR)
  : path.resolve(root, '..', '.local', 'test-results', 'frontend-pages');
const viewportWidth = Number(process.env.PHASE3_PAGE_TEST_VIEWPORT_WIDTH || 1440);
const viewportHeight = Number(process.env.PHASE3_PAGE_TEST_VIEWPORT_HEIGHT || 1000);
const screenshotTag = process.env.PHASE3_PAGE_TEST_SCREENSHOT_TAG || '';
const screenshotName = (name) => screenshotTag
  ? name.replace(/\.png$/, `-${screenshotTag}.png`)
  : name;
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const previewPort = 43173;
const baseUrl = `http://127.0.0.1:${previewPort}`;
const formalRoute = JSON.parse(await readFile(path.resolve(root, '..', 'content', 'routes', 'accounting', 'ACC-LIFE-ROLE-001.json'), 'utf8'));

const server = spawn(process.execPath, [viteBin, 'preview', '--host', '127.0.0.1', '--port', String(previewPort), '--strictPort'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});

let serverOutput = '';
server.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Vite preview did not start.\n${serverOutput}`);
}

async function findInstalledChromium() {
  const browserRoot = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  try {
    const entries = (await readdir(browserRoot))
      .filter((name) => /^chromium-\d+$/.test(name))
      .sort()
      .reverse();
    for (const entry of entries) {
      const executable = path.join(browserRoot, entry, 'chrome-win64', 'chrome.exe');
      try {
        await access(executable);
        return executable;
      } catch {
        // Try the next locally installed browser revision.
      }
    }
  } catch {
    // Playwright will report its normal browser-install guidance.
  }
  return undefined;
}

const user = { employeeNo: '10000002', displayName: '培训学员' };
const routeOverview = {
  routeId: 'ACC-LIFE-ROLE-001',
  contentVersion: '2.0.0',
  rubricVersion: '2.0.0',
  line: 'ACCOUNTING',
  title: '站上核算岗',
  summary: '从业务资料出发，完成费用核算、账务处理和结果勾稽。',
  estimatedMinutes: 20,
  state: 'IN_PROGRESS',
  enterable: true,
  steps: [
    { stepType: 'KNOWLEDGE_CARD', completed: false, accessible: true },
    { stepType: 'DEMONSTRATION', completed: true, accessible: true },
    { stepType: 'BASIC_PRACTICE', completed: true, accessible: true },
    { stepType: 'COMPREHENSIVE_PRACTICE', completed: false, accessible: true },
  ],
  nextStep: 'KNOWLEDGE_CARD',
  completedSteps: 2,
  totalSteps: 4,
};

const dimensions = [
  { dimension: 'CONCEPT', score: 22, maxScore: 25, items: [{ matched: true, evidence: '能够区分系统状态与业务结果。' }] },
  { dimension: 'PROCESS', score: 27, maxScore: 30, items: [{ matched: true, evidence: '处理步骤具有清晰先后顺序。' }] },
  { dimension: 'RISK', score: 21, maxScore: 25, items: [{ matched: true, evidence: '能够识别复核与升级的必要性。' }] },
  { dimension: 'EXPRESSION', score: 17, maxScore: 20, items: [{ matched: true, evidence: '表达完整且便于执行。' }] },
];

function attempt(id, conclusion = 'PASSED') {
  const passed = conclusion === 'PASSED';
  return {
    attemptId: id,
    routeId: 'ACC-LIFE-ROLE-001',
    processingStatus: 'COMPLETED',
    submittedAt: '2026-07-29T07:00:00Z',
    contentVersion: '2.0.0',
    rubricVersion: '2.0.0',
    result: {
      totalScore: passed ? 87 : 68,
      passScore: 75,
      conclusion,
      scoreThresholdMet: passed,
      allMandatoryRequirementsMet: passed,
      dimensions: passed
        ? dimensions
        : dimensions.map((item, index) => ({
          ...item,
          score: Math.max(8, item.score - (index + 2)),
          items: [{ matched: index === 0, evidence: index === 0 ? item.items[0].evidence : '本次作答在这一维度仍可补充。' }],
        })),
    },
    answerSnapshot: { responses: { 'payment-source': 'BANK-STATEMENT', 'ending-payable': 800, 'debit-account': '应付托管费', 'credit-account': '银行存款', 'reconciliation-result': 'BALANCED', 'result-note': '当日支付托管费1400元，期末应付托管费800元，资金、台账和估值结果勾稽一致。' } },
    historicalConclusion: conclusion,
    currentRouteState: passed ? 'PASSED' : 'LEARNED_NOT_MASTERED',
    remediationSummary: passed ? undefined : {
      planId: 9,
      attemptId: id,
      active: true,
      completedTargets: 0,
      totalTargets: 2,
      completed: false,
      practiceRetryUnlocked: false,
    },
    allowedActions: passed ? ['RETURN_TO_MAP', 'REVIEW_ROUTE'] : ['START_REMEDIATION'],
  };
}

const stepContent = formalRoute.steps;
const workItemTitles = Object.fromEntries(
  formalRoute.steps.COMPREHENSIVE_PRACTICE.workItems.map((item) => [item.workItemId, item.title]),
);

const worlds = {
  mapVersion: '2026.08.1',
  worlds: [
    { line: 'CLEARING', name: '清算学习世界', description: '学习交收、资金与证券清算的核心流程。', availability: 'OPEN', passedRequiredRoutes: 0, publishedRequiredRoutes: 7, progressPercent: 0, status: 'NOT_STARTED' },
    { line: 'ACCOUNTING', name: '核算学习世界', description: '从原始业务资料出发，建立计算、账务处理与结果验证能力。', availability: 'OPEN', passedRequiredRoutes: 0, publishedRequiredRoutes: 1, progressPercent: 0, status: 'IN_PROGRESS' },
    { line: 'SUPERVISION', name: '监督学习世界', description: '学习投资监督、边界识别与风险报告。', availability: 'BUILDING', passedRequiredRoutes: 0, publishedRequiredRoutes: 0, progressPercent: 0, status: 'BUILDING' },
  ],
};

const mapResponse = {
  line: 'ACCOUNTING',
  name: '核算学习世界',
  mapVersion: '2026.08.1',
  regions: [{
    regionId: 'R1',
    name: '核算基础与产品生命周期',
    description: '从接管一只产品到完成退出。',
    modules: [{
      moduleId: 'M1',
      name: '岗位基础',
      nodes: [
        { nodeId: 'N1', nodeType: 'ROUTE', routeId: 'ACC-LIFE-ROLE-001', title: '站上核算岗', pathType: 'REQUIRED', position: 'CENTER', state: 'IN_PROGRESS', locked: false, contentAvailability: 'PUBLISHED', enterable: true, completedSteps: 2, totalSteps: 4, prerequisiteNodeIds: [] },
        { nodeId: 'N2', nodeType: 'ROUTE', routeId: 'ACC-LIFE-ONBOARD-002', title: '接管一只新产品', pathType: 'REQUIRED', position: 'LEFT', state: 'LOCKED', locked: true, contentAvailability: 'BUILDING', enterable: false, completedSteps: 0, totalSteps: 4, prerequisiteNodeIds: ['N1'] },
      ],
    }],
  }],
  recommendedNodeId: 'N1',
  progress: { passedRequiredRoutes: 0, publishedRequiredRoutes: 1, percent: 0 },
};

const clearingMapResponse = {
  line: 'CLEARING',
  name: '清算学习世界',
  mapVersion: '2026.08.11',
  regions: [{
    regionId: 'CLR-R1',
    name: '清算基础与业务分支',
    description: '从共同清算基础进入资金结算、场内清算和银行间清算。',
    modules: [
      {
        moduleId: 'CLR-M1',
        name: '共同清算基础',
        nodes: [
          { nodeId: 'CLR-N1', nodeType: 'ROUTE', routeId: 'CLR-BASE-001', title: '清算对象、资料来源与结果勾稽', pathType: 'REQUIRED', position: 'CENTER', state: 'IN_PROGRESS', locked: false, contentAvailability: 'PUBLISHED', enterable: true, completedSteps: 2, totalSteps: 4, prerequisiteNodeIds: [] },
        ],
      },
      {
        moduleId: 'CLR-M2',
        name: '资金结算',
        nodes: [
          { nodeId: 'CLR-N2', nodeType: 'ROUTE', routeId: 'CLR-FUND-PAYMENT-001', title: '资金结算指令与付款/收款结果', pathType: 'REQUIRED', position: 'LEFT', state: 'LOCKED', locked: true, contentAvailability: 'PUBLISHED', enterable: false, completedSteps: 0, totalSteps: 4, prerequisiteNodeIds: ['CLR-N1'] },
          { nodeId: 'CLR-N3', nodeType: 'ROUTE', routeId: 'CLR-FUND-CLOSE-002', title: '资金结算结果与日终关闭', pathType: 'REQUIRED', position: 'LEFT', state: 'LOCKED', locked: true, contentAvailability: 'PUBLISHED', enterable: false, completedSteps: 0, totalSteps: 4, prerequisiteNodeIds: ['CLR-N2'] },
        ],
      },
      {
        moduleId: 'CLR-M3',
        name: '场内清算',
        nodes: [
          { nodeId: 'CLR-N4', nodeType: 'ROUTE', routeId: 'CLR-EX-CORE-001', title: '场内交易确认与证券/资金交收准备', pathType: 'REQUIRED', position: 'CENTER', state: 'LOCKED', locked: true, contentAvailability: 'PUBLISHED', enterable: false, completedSteps: 0, totalSteps: 4, prerequisiteNodeIds: ['CLR-N1'] },
          { nodeId: 'CLR-N5', nodeType: 'ROUTE', routeId: 'CLR-EX-FUNDS-002', title: '场内证券/资金结果与正常封账', pathType: 'REQUIRED', position: 'CENTER', state: 'LOCKED', locked: true, contentAvailability: 'PUBLISHED', enterable: false, completedSteps: 0, totalSteps: 4, prerequisiteNodeIds: ['CLR-N4'] },
        ],
      },
      {
        moduleId: 'CLR-M4',
        name: '银行间清算',
        nodes: [
          { nodeId: 'CLR-N6', nodeType: 'ROUTE', routeId: 'CLR-IB-INSTRUCTION-001', title: '银行间债券结算指令与结果确认', pathType: 'REQUIRED', position: 'RIGHT', state: 'LOCKED', locked: true, contentAvailability: 'PUBLISHED', enterable: false, completedSteps: 0, totalSteps: 4, prerequisiteNodeIds: ['CLR-N1'] },
          { nodeId: 'CLR-N7', nodeType: 'ROUTE', routeId: 'CLR-IB-DVP-CLOSE-002', title: '银行间 DVP 交收、对账与日终关闭', pathType: 'REQUIRED', position: 'RIGHT', state: 'LOCKED', locked: true, contentAvailability: 'PUBLISHED', enterable: false, completedSteps: 0, totalSteps: 4, prerequisiteNodeIds: ['CLR-N6'] },
        ],
      },
    ],
  }],
  recommendedNodeId: 'CLR-N1',
  progress: { passedRequiredRoutes: 0, publishedRequiredRoutes: 7, percent: 0 },
};

async function run() {
  await mkdir(screenshotDir, { recursive: true });
  await waitForServer();

  const executablePath = await findInstalledChromium();
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({
    viewport: { width: viewportWidth, height: viewportHeight },
    deviceScaleFactor: 1,
  });
  let loggedIn = false;
  let draftSaveCount = 0;
  let forceDraftConflict = false;
  let draft = {
    routeId: routeOverview.routeId,
    contentVersion: '2.0.0',
    answer: { responses: {} },
    revision: 0,
    updatedAt: null,
  };
  let mapPassed = false;
  const mapRequests = [];
  const settle = () => page.waitForTimeout(450);
  const navigateTo = (pathname) => page.evaluate((target) => {
    window.history.pushState(null, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, pathname);

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const json = (body, status = 200) => route.fulfill({
      status,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(body),
    });

    if (pathname === '/api/auth/csrf') return json({ token: 'test-token', headerName: 'X-TEST-CSRF' });
    if (pathname === '/api/auth/me') return loggedIn ? json(user) : json({ code: 'UNAUTHORIZED', message: '未登录' }, 401);
    if (pathname === '/api/auth/login') { loggedIn = true; return json(user); }
    if (pathname === '/api/auth/logout') { loggedIn = false; return route.fulfill({ status: 204 }); }
    if (!loggedIn) return json({ code: 'UNAUTHORIZED', message: '未登录' }, 401);
    if (pathname === '/api/worlds') return json(worlds);
    if (pathname === '/api/lines/CLEARING/map') {
      mapRequests.push(pathname);
      return json(clearingMapResponse);
    }
    if (pathname === '/api/lines/ACCOUNTING/map') {
      mapRequests.push(pathname);
      if (!mapPassed) return json(mapResponse);
      const passedMap = structuredClone(mapResponse);
      passedMap.progress = { passedRequiredRoutes: 1, publishedRequiredRoutes: 1, percent: 100 };
      passedMap.recommendedNodeId = 'N1';
      passedMap.regions[0].modules[0].nodes[0] = {
        ...passedMap.regions[0].modules[0].nodes[0],
        state: 'PASSED',
        completedSteps: 4,
      };
      passedMap.regions[0].modules[0].nodes[1] = {
        ...passedMap.regions[0].modules[0].nodes[1],
        state: 'NOT_STARTED',
        locked: false,
        enterable: false,
      };
      return json(passedMap);
    }
    if (pathname === '/api/routes/ACC-LIFE-ROLE-001') return json(routeOverview);
    if (pathname.startsWith('/api/routes/ACC-LIFE-ROLE-001/steps/')) {
      const stepType = pathname.split('/').at(-1);
      if (stepType === 'complete') {
        return json({ routeId: routeOverview.routeId, state: 'IN_PROGRESS', completedSteps: 3, totalSteps: 4, nextStep: 'COMPREHENSIVE_PRACTICE' });
      }
      return json({ routeId: routeOverview.routeId, contentVersion: '2.0.0', stepType, content: stepContent[stepType], completed: false });
    }
    if (pathname === '/api/routes/ACC-LIFE-ROLE-001/draft' && request.method() === 'GET') {
      return json(draft);
    }
    if (pathname === '/api/routes/ACC-LIFE-ROLE-001/draft' && request.method() === 'PUT') {
      assert.equal(request.headers()['x-test-csrf'], 'test-token');
      const body = request.postDataJSON();
      assert.equal(typeof body.expectedRevision, 'number');
      if (forceDraftConflict) {
        forceDraftConflict = false;
        draft = {
          ...draft,
          answer: { responses: { 'payment-source': 'BANK-STATEMENT' } },
          revision: draft.revision + 1,
          updatedAt: '2026-07-29T07:00:00Z',
        };
        return json({ code: 'DRAFT_CONFLICT', message: '草稿已在另一端更新' }, 409);
      }
      assert.equal(body.expectedRevision, draft.revision);
      draftSaveCount += 1;
      draft = {
        ...draft,
        answer: body.answer,
        revision: draft.revision + 1,
        updatedAt: '2026-07-29T07:00:00Z',
      };
      return json(draft);
    }
    if (pathname === '/api/routes/ACC-LIFE-ROLE-001/attempts' && request.method() === 'POST') {
      assert.equal(request.headers()['x-test-csrf'], 'test-token');
      const body = request.postDataJSON();
      assert.equal(body.contentVersion, '2.0.0');
      assert.equal(body.rubricVersion, '2.0.0');
      assert.ok(body.clientRequestId);
      return json({ attemptId: 41, routeId: routeOverview.routeId, processingStatus: 'SCORING', submittedAt: '2026-07-29T07:00:00Z', contentVersion: '2.0.0', rubricVersion: '2.0.0', allowedActions: ['POLL'] });
    }
    if (pathname === '/api/attempts/41') return json({ attemptId: 41, routeId: routeOverview.routeId, processingStatus: 'SCORING', submittedAt: '2026-07-29T07:00:00Z', contentVersion: '2.0.0', rubricVersion: '2.0.0', allowedActions: ['POLL'] });
    if (pathname === '/api/attempts/42' || pathname === '/api/training-records/42') return json(attempt(42, 'PASSED'));
    if (pathname === '/api/attempts/43') return json(attempt(43, 'LEARNED_NOT_MASTERED'));
    if (pathname === '/api/training-records/43') {
      return json({ ...attempt(43, 'LEARNED_NOT_MASTERED'), currentRouteState: 'PASSED' });
    }
    if (pathname === '/api/attempts/44') return json({ attemptId: 44, routeId: routeOverview.routeId, processingStatus: 'FAILED', technicalErrorCode: 'SCORING_TECHNICAL_FAILURE', submittedAt: '2026-07-29T07:00:00Z', contentVersion: '2.0.0', rubricVersion: '2.0.0', allowedActions: ['RETRY_SCORING'] });
    if (pathname === '/api/attempts/44/retry-scoring' && request.method() === 'POST') {
      assert.equal(request.headers()['x-test-csrf'], 'test-token');
      return json({ attemptId: 44, routeId: routeOverview.routeId, processingStatus: 'SCORING', submittedAt: '2026-07-29T07:00:00Z', contentVersion: '2.0.0', rubricVersion: '2.0.0', allowedActions: ['POLL'] });
    }
    if (pathname === '/api/attempts/43/remediation' || pathname === '/api/attempts/45/remediation') {
      const completed = pathname.includes('/45/');
      return json({
        planId: 9, attemptId: completed ? 45 : 43, active: true,
        completedTargets: completed ? 2 : 0,
        totalTargets: 2,
        completed,
        practiceRetryUnlocked: completed,
        targets: [
          { targetId: 'T1', title: '先核实业务事实', reason: '本次作答对数据状态的核实还不够清楚。', materialStep: 'KNOWLEDGE_CARD', materialItemId: 'K1', questionId: 'Q1', completed, practice: stepContent.BASIC_PRACTICE.questions[0] },
          { targetId: 'T2', title: '形成反馈闭环', reason: '需要补充复核后的反馈和留痕。', materialStep: 'DEMONSTRATION', materialItemId: 'D1', questionId: 'Q1', completed, practice: stepContent.BASIC_PRACTICE.questions[0] },
        ],
      });
    }
    if (pathname === '/api/attempts/45/comprehensive-practice-retry' && request.method() === 'POST') {
      assert.equal(request.headers()['x-test-csrf'], 'test-token');
      return json({ routeId: routeOverview.routeId, stepType: 'COMPREHENSIVE_PRACTICE', practiceRetryUnlocked: true });
    }
    if (pathname === '/api/training-records') {
      const items = [
        { attemptId: 42, routeId: routeOverview.routeId, path: '核算条线 / 核算基础与产品生命周期 / 岗位基础 / 站上核算岗', routeTitle: '站上核算岗', processingStatus: 'COMPLETED', conclusion: 'PASSED', submittedAt: '2026-07-29T07:00:00Z', totalScore: 87, dimensionSummary: dimensions.map(({ dimension, score, maxScore }) => ({ dimension, score, maxScore })) },
        { attemptId: 43, routeId: routeOverview.routeId, path: '核算条线 / 核算基础与产品生命周期 / 岗位基础 / 站上核算岗', routeTitle: '站上核算岗', processingStatus: 'COMPLETED', conclusion: 'LEARNED_NOT_MASTERED', submittedAt: '2026-07-28T07:00:00Z', totalScore: 68, dimensionSummary: dimensions.map(({ dimension, score, maxScore }) => ({ dimension, score: score - 4, maxScore })) },
      ];
      return json({ items, page: 0, size: 10, totalElements: 2, totalPages: 1 });
    }
    return json({ code: 'NOT_FOUND', message: `No test route for ${request.method()} ${pathname}` }, 404);
  });

  await page.goto(baseUrl);
  await page.getByRole('heading', { name: '登录岗位学习账号' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.fonts.check('400 16px "Nunito"')), true);
  assert.equal(await page.evaluate(() => document.fonts.check('400 16px "Noto Sans SC"')), true);
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('01-login.png')) });
  await page.getByLabel('员工号').fill('10000002');
  await page.getByLabel('密码').fill('Demo@1234');
  await page.getByRole('button', { name: /进入学习世界/ }).click();

  await page.getByTestId('world-grid').waitFor();
  assert.equal(await page.locator('.world-card').count(), 3);
  assert.equal(await page.locator('.world-card', { hasText: '清算学习世界' }).locator('button', { hasText: '进入学习地图' }).count(), 1);
  assert.equal(await page.locator('.world-card', { hasText: '监督学习世界' }).locator('button', { hasText: '进入学习地图' }).count(), 0);
  assert.equal(await page.getByText('0 / 7 条必修路线', { exact: true }).count(), 1);
  assert.equal(await page.getByText('内容建设中', { exact: true }).count(), 2);
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('02-worlds.png')) });

  await page.locator('.world-card', { hasText: '清算学习世界' }).getByRole('button', { name: /进入学习地图/ }).click();
  await page.getByTestId('learning-map').first().waitFor();
  assert.ok(page.url().endsWith('/map/clearing'), '清算入口应进入清算地图。');
  assert.equal(await page.locator('.map-node').count(), 7);
  assert.equal(await page.locator('.map-node:enabled').count(), 1);
  assert.equal(await page.locator('button.map-node[aria-label*="清算对象、资料来源与结果勾稽"]:enabled').count(), 1);
  assert.equal(await page.locator('button.map-node[aria-label*="资金结算指令与付款/收款结果"]:disabled').count(), 1);
  assert.ok(mapRequests.includes('/api/lines/CLEARING/map'), '清算地图必须请求 CLEARING 条线。');

  await navigateTo('/map/supervision');
  await page.getByText('监督内容建设中', { exact: true }).waitFor();
  assert.ok(!mapRequests.includes('/api/lines/SUPERVISION/map'), '监督建设中不得请求地图。');
  await navigateTo('/map/not-a-line');
  await page.getByText('学习地图不可用', { exact: true }).waitFor();

  await navigateTo('/worlds');
  await page.getByTestId('world-grid').waitFor();
  await page.locator('.world-card', { hasText: '核算学习世界' }).getByRole('button', { name: /进入学习地图/ }).click();
  await page.getByTestId('learning-map').waitFor();
  assert.equal(await page.locator('.map-node').count(), 2);
  assert.equal(await page.locator('.map-node:enabled').count(), 1);
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('03-accounting-map.png')) });

  await page.getByRole('button', { name: /站上核算岗/ }).click();
  await page.getByRole('heading', { name: formalRoute.steps.KNOWLEDGE_CARD.cards[0].title }).waitFor();
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('04-knowledge-card.png')) });

  await page.getByRole('button', { name: /正常示范/ }).click();
  await page.getByRole('heading', { name: `${formalRoute.steps.DEMONSTRATION.scenario.date} · ${formalRoute.steps.DEMONSTRATION.scenario.product}` }).waitFor();
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('05-demonstration.png')) });

  await page.getByRole('button', { name: /基础练习/ }).click();
  await page.getByRole('heading', { name: formalRoute.steps.BASIC_PRACTICE.questions[0].prompt }).waitFor();
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('06-basic-practice.png')) });

  await page.getByRole('button', { name: /综合实务/ }).click();
  await page.getByRole('heading', { name: '完成核算工作底稿' }).waitFor();
  await page.getByLabel(workItemTitles['payment-source']).selectOption('BANK-STATEMENT');
  await page.getByRole('button', { name: /正常示范/ }).click();
  await page.getByRole('heading', { name: '当前草稿尚未保存' }).waitFor();
  await page.getByRole('button', { name: '留在这里' }).click();
  assert.ok(page.url().includes('step=COMPREHENSIVE_PRACTICE'), 'Unsaved answer should trigger and respect the leave guard.');
  await page.waitForTimeout(1200);

  forceDraftConflict = true;
  await page.getByLabel(workItemTitles['ending-payable']).fill('800');
  await page.getByRole('heading', { name: '发现另一份更新过的草稿' }).waitFor();
  await page.getByRole('button', { name: '使用云端草稿' }).click();
  assert.equal(await page.getByLabel(workItemTitles['payment-source']).inputValue(), 'BANK-STATEMENT');

  await page.getByLabel(workItemTitles['ending-payable']).fill('800');
  await page.getByLabel(workItemTitles['debit-account']).fill('应付托管费');
  await page.getByLabel(workItemTitles['credit-account']).fill('银行存款');
  await page.getByLabel(workItemTitles['reconciliation-result']).selectOption('BALANCED');
  await page.getByLabel(workItemTitles['result-note']).fill('当日支付托管费1400元，期末应付托管费800元，资金、台账和估值结果勾稽一致。');
  await page.waitForTimeout(1200);
  assert.ok(draftSaveCount >= 1, 'Draft auto-save should issue a revisioned PUT request.');
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('07-comprehensive-practice.png')) });

  await page.getByRole('button', { name: /提交综合实务/ }).click();
  await page.getByRole('heading', { name: '提交这份综合实务？' }).waitFor();
  await page.getByRole('button', { name: '确认提交' }).click();
  await page.getByTestId('scoring-wait').waitFor();
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('08-scoring-wait.png')) });

  await navigateTo('/attempts/44');
  await page.getByRole('heading', { name: '评分未完成，可重试原作答' }).waitFor();
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('09-scoring-failed.png')) });
  await page.getByRole('button', { name: '重试原作答评分' }).click();
  await page.getByTestId('scoring-wait').waitFor();

  await navigateTo('/attempts/42');
  await page.getByTestId('result-view').waitFor();
  assert.equal(await page.getByText('路线已通过', { exact: true }).count(), 1);
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('10-result-passed.png')) });

  mapPassed = true;
  await navigateTo('/map/accounting');
  await page.getByTestId('learning-map').waitFor();
  assert.equal(await page.getByText('已通过 · 4/4', { exact: true }).count(), 1);
  assert.equal(await page.getByText('内容建设中 · 0/4', { exact: true }).count(), 1);
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('11-map-after-pass.png')) });
  mapPassed = false;

  await navigateTo('/attempts/43');
  await page.getByTestId('result-view').waitFor();
  assert.equal(await page.getByText('本次作答需要补学', { exact: true }).count(), 1);
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('12-result-remediation.png')) });

  await page.getByRole('button', { name: /开始定向补学/ }).click();
  await page.getByRole('heading', { name: '完成补学目标，再提交综合实务' }).waitFor();
  assert.equal(await page.locator('.remediation-nav > button').count(), 2);
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('13-remediation.png')) });

  await navigateTo('/attempts/45/remediation');
  await page.getByRole('button', { name: /重新完成综合实务/ }).waitFor();
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('14-remediation-complete.png')) });
  await page.getByRole('button', { name: /重新完成综合实务/ }).click();
  await page.getByRole('heading', { name: '完成核算工作底稿' }).waitFor();
  assert.ok(page.url().includes('step=COMPREHENSIVE_PRACTICE'), 'Completed remediation should return directly to comprehensive practice.');

  await navigateTo('/records');
  await page.getByTestId('records-list').waitFor();
  assert.equal(await page.locator('.record-row').count(), 2);
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('15-records.png')) });

  await page.locator('.user-menu__trigger').click();
  await page.locator('.user-menu__panel').waitFor();
  assert.equal(await page.getByRole('button', { name: '我的训练记录' }).count(), 1);
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('16-user-menu-open.png')) });
  await page.keyboard.press('Escape');

  await navigateTo('/records/43');
  await page.getByTestId('result-view').waitFor();
  assert.equal(await page.getByText('历史记录（不可修改）', { exact: true }).count(), 1);
  assert.equal(await page.getByText('历史结论：需补学', { exact: true }).count(), 1);
  assert.equal(await page.getByText('路线当前：已通过', { exact: true }).count(), 1);
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('17-record-detail-history-not-mastered-current-passed.png')) });

  await browser.close();
  console.log(`Page tests passed. Screenshots: ${screenshotDir}`);
}

try {
  await run();
} finally {
  server.kill();
}
