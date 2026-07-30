import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const root = process.cwd();
const screenshotDir = process.env.PHASE3_PAGE_TEST_SCREENSHOT_DIR
  ? path.resolve(process.env.PHASE3_PAGE_TEST_SCREENSHOT_DIR)
  : path.join(root, 'screenshots', 'phase3');
const viewportWidth = Number(process.env.PHASE3_PAGE_TEST_VIEWPORT_WIDTH || 1440);
const viewportHeight = Number(process.env.PHASE3_PAGE_TEST_VIEWPORT_HEIGHT || 1000);
const screenshotTag = process.env.PHASE3_PAGE_TEST_SCREENSHOT_TAG || '';
const screenshotName = (name) => screenshotTag
  ? name.replace(/\.png$/, `-${screenshotTag}.png`)
  : name;
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const previewPort = 43173;
const baseUrl = `http://127.0.0.1:${previewPort}`;

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
  contentVersion: '1.0.0',
  rubricVersion: '1.0.0',
  line: 'ACCOUNTING',
  title: '站上核算岗',
  summary: '理解核算岗的责任、人机边界和异常闭环。',
  estimatedMinutes: 20,
  state: 'IN_PROGRESS',
  enterable: true,
  steps: [
    { stepType: 'KNOWLEDGE_CARD', completed: false, accessible: true },
    { stepType: 'DEMONSTRATION', completed: true, accessible: true },
    { stepType: 'BASIC_PRACTICE', completed: true, accessible: true },
    { stepType: 'EXCEPTION_CASE', completed: false, accessible: true },
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
    contentVersion: '1.0.0',
    rubricVersion: '1.0.0',
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
    answerSnapshot: '我会先确认事实和数据状态，再检查账务与估值结果，按权限协调复核并持续反馈留痕。',
    historicalConclusion: conclusion,
    currentRouteState: passed ? 'PASSED' : 'LEARNED_NOT_MASTERED',
    remediationSummary: passed ? undefined : {
      planId: 9,
      attemptId: id,
      active: true,
      completedTargets: 0,
      totalTargets: 2,
      completed: false,
      challengeUnlocked: false,
    },
    allowedActions: passed ? ['RETURN_TO_MAP', 'REVIEW_ROUTE'] : ['START_REMEDIATION'],
  };
}

const stepContent = {
  KNOWLEDGE_CARD: {
    cards: [
      { cardId: 'K1', type: 'FLOW', title: '为什么需要核算岗', conclusion: '核算岗把业务事实转化为可核对的账务和估值结果。', items: ['业务事实', '核算处理', '账务结果', '复核反馈'] },
      { cardId: 'K2', type: 'KEY_POINT', title: '系统完成不等于业务完成', conclusion: '系统状态只是证据之一，仍要核验结果。', items: ['核验数据', '检查结果', '解释差异'] },
    ],
  },
  DEMONSTRATION: {
    scenario: { role: '组合核算人员', product: '案例产品 B', date: '7月9日', facts: ['系统任务已执行', '对账结果存在差异'] },
    steps: [
      { order: 1, action: '检查估值和对账结果', reason: '执行成功不代表业务结果正确' },
      { order: 2, action: '核实数据接收状态', reason: '先把事实与未知情况分开' },
      { order: 3, action: '协调处理并持续反馈', reason: '异常需要形成闭环' },
    ],
    summary: '检查结果 → 核实事实 → 协调处理 → 反馈留痕',
  },
  BASIC_PRACTICE: {
    questions: [
      { questionId: 'Q1', type: 'SINGLE_CHOICE', prompt: '系统任务执行后，下一步最合适的动作是什么？', options: [{ optionId: 'A', text: '直接确认完成' }, { optionId: 'B', text: '检查数据和业务结果' }] },
    ],
  },
  EXCEPTION_CASE: {
    scenario: {
      role: '案例产品 B 的组合核算人员',
      date: '7月9日 16:30',
      facts: ['支付指令已经执行', '估值表余额没有变化', '系统任务显示执行成功'],
    },
    tasks: ['说明自己承担什么责任', '说明首先核实哪些事实', '说明怎样协调、复核和反馈'],
    writingPrompts: ['事实', '核查', '措施', '责任人', '反馈'],
  },
};

const worlds = {
  mapVersion: '2026.07.1',
  worlds: [
    { line: 'CLEARING', name: '清算学习世界', description: '学习交收、资金与证券清算的核心流程。', availability: 'BUILDING', passedRequiredRoutes: 0, publishedRequiredRoutes: 0, progressPercent: 0, status: 'BUILDING' },
    { line: 'ACCOUNTING', name: '核算学习世界', description: '从岗位责任出发，建立核算、估值、复核与异常闭环能力。', availability: 'OPEN', passedRequiredRoutes: 0, publishedRequiredRoutes: 1, progressPercent: 0, status: 'IN_PROGRESS' },
    { line: 'SUPERVISION', name: '监督学习世界', description: '学习投资监督、边界识别与风险报告。', availability: 'BUILDING', passedRequiredRoutes: 0, publishedRequiredRoutes: 0, progressPercent: 0, status: 'BUILDING' },
  ],
};

const mapResponse = {
  line: 'ACCOUNTING',
  name: '核算学习世界',
  mapVersion: '2026.07.1',
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
    contentVersion: '1.0.0',
    answer: '',
    revision: 0,
    updatedAt: null,
  };
  let mapPassed = false;
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
    if (pathname === '/api/lines/ACCOUNTING/map') {
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
        return json({ routeId: routeOverview.routeId, state: 'IN_PROGRESS', completedSteps: 3, totalSteps: 4, nextStep: 'EXCEPTION_CASE' });
      }
      return json({ routeId: routeOverview.routeId, contentVersion: '1.0.0', stepType, content: stepContent[stepType], completed: false });
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
          answer: '另一端已保存：先核对到账数据，再复核差异并反馈留痕。',
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
      assert.equal(body.contentVersion, '1.0.0');
      assert.equal(body.rubricVersion, '1.0.0');
      assert.ok(body.clientRequestId);
      return json({ attemptId: 41, routeId: routeOverview.routeId, processingStatus: 'SCORING', submittedAt: '2026-07-29T07:00:00Z', contentVersion: '1.0.0', rubricVersion: '1.0.0', allowedActions: ['POLL'] });
    }
    if (pathname === '/api/attempts/41') return json({ attemptId: 41, routeId: routeOverview.routeId, processingStatus: 'SCORING', submittedAt: '2026-07-29T07:00:00Z', contentVersion: '1.0.0', rubricVersion: '1.0.0', allowedActions: ['POLL'] });
    if (pathname === '/api/attempts/42' || pathname === '/api/training-records/42') return json(attempt(42, 'PASSED'));
    if (pathname === '/api/attempts/43') return json(attempt(43, 'LEARNED_NOT_MASTERED'));
    if (pathname === '/api/training-records/43') {
      return json({ ...attempt(43, 'LEARNED_NOT_MASTERED'), currentRouteState: 'PASSED' });
    }
    if (pathname === '/api/attempts/44') return json({ attemptId: 44, routeId: routeOverview.routeId, processingStatus: 'FAILED', technicalErrorCode: 'SCORING_TECHNICAL_FAILURE', submittedAt: '2026-07-29T07:00:00Z', contentVersion: '1.0.0', rubricVersion: '1.0.0', allowedActions: ['RETRY_SCORING'] });
    if (pathname === '/api/attempts/44/retry-scoring' && request.method() === 'POST') {
      assert.equal(request.headers()['x-test-csrf'], 'test-token');
      return json({ attemptId: 44, routeId: routeOverview.routeId, processingStatus: 'SCORING', submittedAt: '2026-07-29T07:00:00Z', contentVersion: '1.0.0', rubricVersion: '1.0.0', allowedActions: ['POLL'] });
    }
    if (pathname === '/api/attempts/43/remediation' || pathname === '/api/attempts/45/remediation') {
      const completed = pathname.includes('/45/');
      return json({
        planId: 9, attemptId: completed ? 45 : 43, active: true,
        completedTargets: completed ? 2 : 0,
        totalTargets: 2,
        completed,
        challengeUnlocked: completed,
        targets: [
          { targetId: 'T1', title: '先核实业务事实', reason: '本次作答对数据状态的核实还不够清楚。', materialStep: 'KNOWLEDGE_CARD', materialItemId: 'K1', questionId: 'Q1', completed, practice: stepContent.BASIC_PRACTICE.questions[0] },
          { targetId: 'T2', title: '形成反馈闭环', reason: '需要补充复核后的反馈和留痕。', materialStep: 'DEMONSTRATION', materialItemId: 'D1', questionId: 'Q1', completed, practice: stepContent.BASIC_PRACTICE.questions[0] },
        ],
      });
    }
    if (pathname === '/api/attempts/45/challenge' && request.method() === 'POST') {
      assert.equal(request.headers()['x-test-csrf'], 'test-token');
      return json({ routeId: routeOverview.routeId, stepType: 'EXCEPTION_CASE', challengeUnlocked: true });
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
  await page.getByRole('heading', { name: '登录学习账号' }).waitFor();
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
  assert.equal(await page.getByText('内容建设中', { exact: true }).count(), 2);
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('02-worlds.png')) });

  await page.getByRole('button', { name: /进入学习地图/ }).click();
  await page.getByTestId('learning-map').waitFor();
  assert.equal(await page.locator('.map-node').count(), 2);
  assert.equal(await page.locator('.map-node:enabled').count(), 1);
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('03-accounting-map.png')) });

  await page.getByRole('button', { name: /站上核算岗/ }).click();
  await page.getByRole('heading', { name: '为什么需要核算岗' }).waitFor();
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('04-knowledge-card.png')) });

  await page.getByRole('button', { name: /正常示范/ }).click();
  await page.getByRole('heading', { name: '7月9日 · 案例产品 B' }).waitFor();
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('05-demonstration.png')) });

  await page.getByRole('button', { name: /基础练习/ }).click();
  await page.getByRole('heading', { name: '系统任务执行后，下一步最合适的动作是什么？' }).waitFor();
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('06-basic-practice.png')) });

  await page.getByRole('button', { name: /异常案例/ }).click();
  await page.getByLabel('你的处理方案').waitFor();
  await page.getByLabel('你的处理方案').fill('这是一段尚未保存的离页保护测试。');
  await page.getByRole('button', { name: /正常示范/ }).click();
  await page.getByRole('heading', { name: '草稿还没有保存完成' }).waitFor();
  await page.getByRole('button', { name: '留在这里' }).click();
  assert.ok(page.url().includes('step=EXCEPTION_CASE'), 'Unsaved answer should trigger and respect the leave guard.');
  await page.waitForTimeout(1200);

  forceDraftConflict = true;
  await page.getByLabel('你的处理方案').fill('触发 revision 冲突的本地编辑。');
  await page.getByRole('heading', { name: '发现另一份更新过的草稿' }).waitFor();
  await page.getByRole('button', { name: '使用云端草稿' }).click();
  assert.match(await page.getByLabel('你的处理方案').inputValue(), /另一端已保存/);

  await page.getByLabel('你的处理方案').fill('先核实事实，再检查账务与估值结果，按权限协调复核并反馈留痕。');
  await page.waitForTimeout(1200);
  assert.ok(draftSaveCount >= 1, 'Draft auto-save should issue a revisioned PUT request.');
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('07-exception-case.png')) });

  await page.getByRole('button', { name: /提交答案/ }).click();
  await page.getByRole('heading', { name: '生成本次正式评分记录？' }).waitFor();
  await page.getByRole('button', { name: '确认提交' }).click();
  await page.getByTestId('scoring-wait').waitFor();
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('08-scoring-wait.png')) });

  await navigateTo('/attempts/44');
  await page.getByRole('heading', { name: '答案还在，重新启动评分即可' }).waitFor();
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
  assert.equal(await page.getByText('已学习，还需要补强', { exact: true }).count(), 1);
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('12-result-remediation.png')) });

  await page.getByRole('button', { name: /开始定向补学/ }).click();
  await page.getByRole('heading', { name: '把遗漏补上，再完整挑战一次' }).waitFor();
  assert.equal(await page.locator('.remediation-nav > button').count(), 2);
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('13-remediation.png')) });

  await navigateTo('/attempts/45/remediation');
  await page.getByRole('button', { name: /重新挑战完整异常案例/ }).waitFor();
  await settle();
  await page.screenshot({ path: path.join(screenshotDir, screenshotName('14-remediation-complete.png')) });
  await page.getByRole('button', { name: /重新挑战完整异常案例/ }).click();
  await page.getByLabel('你的处理方案').waitFor();
  assert.ok(page.url().includes('step=EXCEPTION_CASE'), 'Completed remediation should return directly to the full exception case.');

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
  assert.equal(await page.getByText('不可修改的历史记录', { exact: true }).count(), 1);
  assert.equal(await page.getByText('历史结论：本次未掌握', { exact: true }).count(), 1);
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
