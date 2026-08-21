// 关键页面视觉回归截图脚本
// 默认输出：Repository/.local/test-results/frontend-visual-gate/
// 画布：1440×900 与 1920×1080（仅桌面端）
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const root = process.cwd();
const screenshotDir = process.env.PHASE3_GATE_SCREENSHOT_DIR
  ? path.resolve(process.env.PHASE3_GATE_SCREENSHOT_DIR)
  : path.resolve(root, '..', '.local', 'test-results', 'frontend-visual-gate');
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const previewPort = 43174;
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
    } catch { /* preview starting */ }
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
      } catch { /* try next */ }
    }
  } catch { /* fall through */ }
  return undefined;
}

const user = { employeeNo: '10000002', displayName: '培训学员' };

const worlds = {
  mapVersion: '2026.08.1',
  worlds: [
    { line: 'CLEARING', name: '清算学习世界', description: '学习交收、资金与证券清算的核心流程。', availability: 'OPEN', passedRequiredRoutes: 0, publishedRequiredRoutes: 7, progressPercent: 0, status: 'NOT_STARTED' },
    { line: 'ACCOUNTING', name: '核算学习世界', description: '从原始业务资料出发，建立计算、账务处理与结果验证能力。', availability: 'OPEN', passedRequiredRoutes: 2, publishedRequiredRoutes: 6, progressPercent: 33, status: 'IN_PROGRESS' },
    { line: 'SUPERVISION', name: '监督学习世界', description: '学习投资监督、边界识别与风险报告。', availability: 'BUILDING', passedRequiredRoutes: 0, publishedRequiredRoutes: 0, progressPercent: 0, status: 'BUILDING' },
  ],
};

function mapNodes(currentState) {
  return [
    { nodeId: 'N1', nodeType: 'ROUTE', routeId: 'ACC-LIFE-INTRO-000', title: '认识托管产品', pathType: 'REQUIRED', position: 'CENTER', state: 'PASSED', locked: false, contentAvailability: 'PUBLISHED', enterable: true, completedSteps: 4, totalSteps: 4, prerequisiteNodeIds: [] },
    { nodeId: 'N2', nodeType: 'ROUTE', routeId: 'ACC-LIFE-ROLE-001', title: '站上核算岗', pathType: 'REQUIRED', position: 'LEFT', state: currentState, locked: false, contentAvailability: 'PUBLISHED', enterable: true, completedSteps: currentState === 'IN_PROGRESS' ? 2 : 4, totalSteps: 4, prerequisiteNodeIds: ['N1'] },
    { nodeId: 'N3', nodeType: 'ROUTE', routeId: 'ACC-LIFE-DATA-002', title: '看懂交易记录', pathType: 'REQUIRED', position: 'RIGHT', state: 'LOCKED', locked: true, contentAvailability: 'PUBLISHED', enterable: false, completedSteps: 0, totalSteps: 4, prerequisiteNodeIds: ['N2'] },
    { nodeId: 'N4', nodeType: 'STAGE_GATE', routeId: 'ACC-GATE-001', title: '阶段关卡 · 核算基础', pathType: 'REQUIRED', position: 'CENTER', state: 'LOCKED', locked: true, contentAvailability: 'PUBLISHED', enterable: false, completedSteps: 0, totalSteps: 4, prerequisiteNodeIds: ['N3'] },
    { nodeId: 'N5', nodeType: 'ROUTE', routeId: 'ACC-LIFE-ONBOARD-004', title: '接管一只新产品', pathType: 'REQUIRED', position: 'LEFT', state: 'LOCKED', locked: true, contentAvailability: 'BUILDING', enterable: false, completedSteps: 0, totalSteps: 4, prerequisiteNodeIds: ['N4'] },
  ];
}

function mapResponse(currentState) {
  return {
    line: 'ACCOUNTING',
    name: '核算学习世界',
    mapVersion: '2026.08.1',
    regions: [{
      regionId: 'R1',
      name: '核算基础与产品生命周期',
      description: '从接管一只产品到完成退出。',
      modules: [{ moduleId: 'M1', name: '岗位基础', nodes: mapNodes(currentState) }],
    }],
    recommendedNodeId: 'N2',
    progress: { passedRequiredRoutes: 1, publishedRequiredRoutes: 6, percent: 17 },
  };
}

function clearingMapResponse() {
  const node = (nodeId, routeId, title, position, prerequisiteNodeIds) => ({
    nodeId,
    nodeType: 'ROUTE',
    routeId,
    title,
    pathType: 'REQUIRED',
    position,
    state: nodeId === 'CLR-N1' ? 'IN_PROGRESS' : 'LOCKED',
    locked: nodeId !== 'CLR-N1',
    contentAvailability: 'PUBLISHED',
    enterable: nodeId === 'CLR-N1',
    completedSteps: nodeId === 'CLR-N1' ? 2 : 0,
    totalSteps: 4,
    prerequisiteNodeIds,
  });
  return {
    line: 'CLEARING',
    name: '清算学习世界',
    mapVersion: '2026.08.11',
    regions: [{
      regionId: 'CLR-R1',
      name: '清算基础与业务分支',
      description: '从共同清算基础进入资金结算、场内清算和银行间清算。',
      modules: [
        { moduleId: 'CLR-M1', name: '共同清算基础', nodes: [node('CLR-N1', 'CLR-BASE-001', '清算对象、资料来源与结果勾稽', 'CENTER', [])] },
        { moduleId: 'CLR-M2', name: '资金结算', nodes: [
          node('CLR-N2', 'CLR-FUND-PAYMENT-001', '资金结算指令与付款/收款结果', 'LEFT', ['CLR-N1']),
          node('CLR-N3', 'CLR-FUND-CLOSE-002', '资金结算结果与日终关闭', 'LEFT', ['CLR-N2']),
        ] },
        { moduleId: 'CLR-M3', name: '场内清算', nodes: [
          node('CLR-N4', 'CLR-EX-CORE-001', '场内交易确认与证券/资金交收准备', 'CENTER', ['CLR-N1']),
          node('CLR-N5', 'CLR-EX-FUNDS-002', '场内证券/资金结果与正常封账', 'CENTER', ['CLR-N4']),
        ] },
        { moduleId: 'CLR-M4', name: '银行间清算', nodes: [
          node('CLR-N6', 'CLR-IB-INSTRUCTION-001', '银行间债券结算指令与结果确认', 'RIGHT', ['CLR-N1']),
          node('CLR-N7', 'CLR-IB-DVP-CLOSE-002', '银行间 DVP 交收、对账与日终关闭', 'RIGHT', ['CLR-N6']),
        ] },
      ],
    }],
    recommendedNodeId: 'CLR-N1',
    progress: { passedRequiredRoutes: 0, publishedRequiredRoutes: 7, percent: 0 },
  };
}

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
    { stepType: 'KNOWLEDGE_CARD', completed: true, accessible: true },
    { stepType: 'DEMONSTRATION', completed: true, accessible: true },
    { stepType: 'BASIC_PRACTICE', completed: false, accessible: true },
    { stepType: 'COMPREHENSIVE_PRACTICE', completed: false, accessible: true },
  ],
  nextStep: 'BASIC_PRACTICE',
  completedSteps: 2,
  totalSteps: 4,
};

const practiceContent = {
  questions: [
    {
      questionId: 'Q1',
      type: 'SINGLE_CHOICE',
      prompt: '系统任务执行后，下一步最合适的动作是什么？',
      options: [
        { optionId: 'A', text: '直接确认任务完成' },
        { optionId: 'B', text: '检查数据和业务结果' },
        { optionId: 'C', text: '等待下一批文件到达' },
        { optionId: 'D', text: '先提交综合实务答案' },
      ],
    },
    {
      questionId: 'Q2',
      type: 'SINGLE_CHOICE',
      prompt: '对账出现差异时，首先应该做什么？',
      options: [
        { optionId: 'A', text: '先核实数据接收状态' },
        { optionId: 'B', text: '直接调整估值结果' },
        { optionId: 'C', text: '跳过差异继续处理' },
      ],
    },
  ],
};

async function run() {
  await mkdir(screenshotDir, { recursive: true });
  await waitForServer();
  const executablePath = await findInstalledChromium();
  const browser = await chromium.launch({ headless: true, executablePath });

  let loggedIn = false;
  let mapScenario = 'IN_PROGRESS';
  let practiceAnswerLog = [];

  const shot = (page, name) => page.screenshot({
    path: path.join(screenshotDir, name),
  });

  async function newPage(viewport) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
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
       if (pathname === '/api/lines/CLEARING/map') return json(clearingMapResponse());
       if (pathname === '/api/lines/ACCOUNTING/map') return json(mapResponse(mapScenario));
      if (pathname === '/api/routes/ACC-LIFE-ROLE-001') return json(routeOverview);
      if (pathname === '/api/routes/ACC-LIFE-ROLE-001/steps/BASIC_PRACTICE') {
        return json({ routeId: routeOverview.routeId, contentVersion: '2.0.0', stepType: 'BASIC_PRACTICE', content: practiceContent, completed: false });
      }
      if (pathname.startsWith('/api/routes/ACC-LIFE-ROLE-001/basic-practice/')) {
        const questionId = pathname.split('/').at(-2);
        const body = request.postDataJSON();
        practiceAnswerLog.push(body);
        const expected = questionId === 'Q2' ? 'A' : 'B';
        const correct = body.answer.includes(expected);
        return json({
          questionId,
          correct,
          correctOnce: correct,
          explanation: correct
            ? '执行成功只代表系统状态，仍需核验数据完整性和业务结果。'
            : '系统任务“执行成功”只是系统状态，不能直接当作业务完成的依据。',
          hint: correct ? undefined : '先分清系统状态和业务结果。',
          practiceCompleted: false,
          progress: { routeId: routeOverview.routeId, state: 'IN_PROGRESS', completedSteps: 2, totalSteps: 4, nextStep: 'BASIC_PRACTICE' },
        });
      }
      if (pathname === '/api/routes/ACC-LIFE-ROLE-001/steps/complete') {
        return json({ routeId: routeOverview.routeId, state: 'IN_PROGRESS', completedSteps: 3, totalSteps: 4, nextStep: 'COMPREHENSIVE_PRACTICE' });
      }
      return json({ code: 'NOT_FOUND', message: `No mock for ${request.method()} ${pathname}` }, 404);
    });
    return page;
  }

  async function login(page) {
    await page.goto(baseUrl);
    const loginHeading = page.getByRole('heading', { name: '登录岗位学习账号' });
    const worldGrid = page.getByTestId('world-grid');
    // 脚本内后续页面共享已登录会话，直接进入三世界
    await Promise.race([
      loginHeading.waitFor({ timeout: 15000 }),
      worldGrid.waitFor({ timeout: 15000 }),
    ]);
    if (await loginHeading.isVisible().catch(() => false)) {
      await page.getByLabel('员工号').fill('10000002');
      await page.getByLabel('密码').fill('Demo@1234');
      await page.getByRole('button', { name: /进入学习世界/ }).click();
    }
    await worldGrid.waitFor();
  }

  const settle = (page, ms = 600) => page.waitForTimeout(ms);

  // ============ 1. 三世界入口 ============
  for (const [width, height, tag] of [[1440, 900, '1440'], [1920, 1080, '1920']]) {
    const page = await newPage({ width, height });
    await login(page);
    await settle(page);
    await shot(page, `01-worlds-${tag}.png`);
    if (tag === '1440') {
       await page.locator('.world-card', { hasText: '核算学习世界' }).screenshot({
        path: path.join(screenshotDir, '02-worlds-accounting-detail.png'),
      });
       await page.locator('.world-card', { hasText: '监督学习世界' }).screenshot({
        path: path.join(screenshotDir, '03-worlds-building-detail.png'),
      });
    }
    await page.close();
  }

  // ============ 2.1 清算七节点地图 ============
  {
    const page = await newPage({ width: 1440, height: 900 });
    await login(page);
    await page.goto(`${baseUrl}/map/clearing`);
    await page.getByTestId('learning-map').first().waitFor();
    assert.equal(await page.locator('.map-node').count(), 7);
    assert.equal(await page.locator('.map-node:enabled').count(), 1);
    assert.equal(await page.locator('button.map-node[aria-label*="清算对象、资料来源与结果勾稽"]:enabled').count(), 1);
    assert.equal(await page.locator('button.map-node[aria-label*="资金结算指令与付款/收款结果"]:disabled').count(), 1);
    await settle(page, 900);
    await shot(page, '04-clearing-map-1440.png');
    await page.close();
  }

  // ============ 2. 核算连续长地图 ============
  for (const [width, height, tag] of [[1440, 900, '1440'], [1920, 1080, '1920']]) {
    const page = await newPage({ width, height });
    await login(page);
    await page.goto(`${baseUrl}/map/accounting`);
    await page.getByTestId('learning-map').waitFor();
    await settle(page, 900);
    await shot(page, `04-map-${tag}.png`);
    await page.close();
  }

  // 节点状态细节（未掌握为当前节点）+ 小托指路
  {
    mapScenario = 'LEARNED_NOT_MASTERED';
    const page = await newPage({ width: 1440, height: 900 });
    await login(page);
    await page.goto(`${baseUrl}/map/accounting`);
    await page.getByTestId('learning-map').waitFor();
    await settle(page, 900);
    await page.locator('.map-track').screenshot({
      path: path.join(screenshotDir, '05-map-node-states.png'),
    });
    await shot(page, '06-map-remediation-1440.png');
    await page.close();
    mapScenario = 'IN_PROGRESS';
  }

  // ============ 3. 基础练习母版 ============
  for (const [width, height, tag] of [[1440, 900, '1440'], [1920, 1080, '1920']]) {
    const page = await newPage({ width, height });
    await login(page);
    await page.goto(`${baseUrl}/learn/ACC-LIFE-ROLE-001?step=BASIC_PRACTICE`);
    await page.getByRole('heading', { name: '系统任务执行后，下一步最合适的动作是什么？' }).waitFor();
    await settle(page);
    await shot(page, `07-practice-empty-${tag}.png`);
    await page.close();
  }

  {
    const page = await newPage({ width: 1440, height: 900 });
    await login(page);
    await page.goto(`${baseUrl}/learn/ACC-LIFE-ROLE-001?step=BASIC_PRACTICE`);
    await page.getByRole('heading', { name: '系统任务执行后，下一步最合适的动作是什么？' }).waitFor();
    await settle(page);

    // 主按钮禁用（未选择）
    await page.locator('.practice-actionbar').screenshot({
      path: path.join(screenshotDir, '08-practice-submit-disabled.png'),
    });

    // 键盘焦点（Tab 至首个选项：品牌、菜单、返回、四环节后到达选项）
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press('Tab');
    }
    await settle(page, 300);
    await shot(page, '09-practice-focus.png');

    // 已选择
    await page.locator('.practice-option', { hasText: '检查数据和业务结果' }).click();
    await settle(page, 300);
    await shot(page, '10-practice-selected.png');

    // 主按钮可用
    await page.locator('.practice-actionbar').screenshot({
      path: path.join(screenshotDir, '11-practice-submit-enabled.png'),
    });

    // 主按钮按下（按压深度位移；等待过渡完成；整页截图以保持 :active 状态）
    const submit = page.getByRole('button', { name: '检查答案' });
    const box = await submit.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(200);
      await shot(page, '12-practice-submit-pressed.png');
      await page.mouse.up();
    }

    // 正确反馈：自动推进保留，但原提交按钮必须立即消失。
    await page.waitForTimeout(260);
    assert.equal(await page.getByRole('button', { name: '检查答案' }).count(), 0);
    assert.equal(await page.getByText('已答对，正在载入下一题…', { exact: true }).count(), 1);
    await shot(page, '13-practice-correct.png');
    await page.locator('.practice-actionbar').screenshot({
      path: path.join(screenshotDir, '15-practice-advancing.png'),
    });

    // 第二题应在原有 650ms 延迟后自动出现。
    await page.getByRole('heading', { name: '对账出现差异时，首先应该做什么？' }).waitFor();
    await settle(page);
    await page.locator('.practice-option', { hasText: '直接调整估值结果' }).click();
    await page.getByRole('button', { name: '检查答案' }).click();
    await page.waitForTimeout(320);
    assert.equal(await page.getByRole('button', { name: '重新提交' }).count(), 1);
    await shot(page, '14-practice-wrong.png');

    await page.close();
  }

  console.log(`Gate screenshots saved: ${screenshotDir}`);
  console.log(`Practice answer requests: ${practiceAnswerLog.length}`);
  await browser.close();
}

try {
  await run();
} finally {
  server.kill();
}
