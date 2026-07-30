import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => readFile(path.join(root, file), 'utf8');
const [tokens, global, phase3b, sourceFiles] = await Promise.all([
  read('src/styles/tokens.css'),
  read('src/styles/global.css'),
  read('src/styles/phase3b.css'),
  Promise.all([
    'src/components/AppShell.tsx',
    'src/components/PracticeQuestion.tsx',
    'src/components/PracticeSession.tsx',
    'src/components/ResultView.tsx',
    'src/components/RouteStepper.tsx',
    'src/pages/LearningPage.tsx',
    'src/pages/AttemptPage.tsx',
    'src/pages/RemediationPage.tsx',
    'src/pages/RecordsPage.tsx',
    'src/pages/RecordDetailPage.tsx',
  ].map(read)),
]);

const css = `${tokens}\n${global}\n${phase3b}`;
const source = sourceFiles.join('\n');

assert.doesNotMatch(css, /\b(?:linear|radial|conic)-gradient\s*\(/i, '阶段 3B 禁止渐变。');
assert.doesNotMatch(css, /\bbackdrop-filter\s*:/i, '阶段 3B 禁止玻璃拟态。');
assert.doesNotMatch(css, /\bfilter\s*:\s*drop-shadow\s*\(/i, '阶段 3B 禁止插画外发光。');
assert.doesNotMatch(css, /\bfont-weight\s*:\s*(?:800|900)\b/, '常规界面不得继续使用 800/900 字重。');
assert.doesNotMatch(global, /\bborder(?:-(?:top|right|bottom|left))?\s*:\s*[3-9]px\s+solid\b/, 'global.css 不得保留 3px 以上实体容器边框。');
assert.match(global, /:focus-visible[\s\S]*?outline:\s*3px\s+solid/, '键盘焦点 3px 外轮廓必须保留。');
assert.doesNotMatch(css, /@media\s*\([^)]*(?:max-width|min-width)/i, '阶段 3B 只交付桌面端，不引入响应式断点。');

const retiredTokens = [
  'green', 'green-dark', 'green-soft', 'blue', 'blue-dark', 'blue-soft',
  'navy', 'ink', 'muted', 'line', 'paper', 'canvas', 'yellow', 'yellow-soft',
  'orange', 'orange-soft', 'red', 'red-soft', 'locked', 'outline',
  'radius-sm', 'radius-md', 'radius-lg', 'shadow-green', 'shadow-blue',
  'shadow-neutral',
];
for (const token of retiredTokens) {
  assert.doesNotMatch(css, new RegExp(`var\\(--${token}\\)`), `旧令牌 --${token} 仍被引用。`);
  assert.doesNotMatch(tokens, new RegExp(`--${token}\\s*:`), `旧令牌 --${token} 仍被定义。`);
}

const reachableGroups = {
  '四环节结构': ['route-stepper', 'lesson-card', 'knowledge-card__conclusion', 'demo-timeline'],
  '补学练习复用': ['practice-question', 'choice-list', 'ordering-list', 'feedback'],
  '异常案例与冲突': ['exception-case', 'answer-editor', 'modal', 'conflict-preview'],
  '评分与结果': ['scoring-wait', 'scoring-failed', 'result-view', 'dimension'],
  '记录与历史': ['record-filters', 'record-row', 'record-detail-header'],
};
for (const [group, classes] of Object.entries(reachableGroups)) {
  for (const className of classes) {
    assert.match(source, new RegExp(`\\b${className.replaceAll('-', '\\-')}\\b`), `${group} 的 .${className} 未在组件中找到。`);
    assert.match(css, new RegExp(`\\.${className.replaceAll('-', '\\-')}\\b`), `${group} 的 .${className} 缺少样式。`);
  }
}

console.log('Style audit passed: reachable groups=5; legacy tokens=0; forbidden visual mechanisms=0.');
