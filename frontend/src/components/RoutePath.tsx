import { Check, Lock } from 'lucide-react';
import type { CaseLine, CaseSummary } from '../api/types';
import type { CaseProgress } from '../domain/growth';
import { RouteIcon } from './RouteIcon';

export interface PathNode {
  key: string;
  kind: 'case' | 'placeholder';
  caseItem?: CaseSummary;
  state: 'done' | 'current' | 'locked';
  progress?: CaseProgress;
  x: number;
  y: number;
}

/** 关卡节点位：S 形路径上的 4 个锚点（百分比坐标） */
const ANCHORS = [
  { x: 11, y: 84 },
  { x: 37, y: 58 },
  { x: 63, y: 40 },
  { x: 88, y: 13 },
];

/** S 形连接曲线（viewBox 720×440，与锚点对应） */
const PATH_D =
  'M 79 370 C 150 360 190 300 266 255 C 340 212 380 190 454 176 C 530 162 570 110 634 57';

interface RoutePathProps {
  line: CaseLine;
  color: string;
  cases: CaseSummary[];
  perCase: Map<string, CaseProgress>;
  selectedCaseId: string | null;
  onSelectCase: (caseId: string) => void;
}

export function buildNodes(
  cases: CaseSummary[],
  perCase: Map<string, CaseProgress>,
): PathNode[] {
  const nodes: PathNode[] = [];
  // 解锁规则：路线内第一个未完成案例为「当前」，其后未完成案例待解锁
  let currentAssigned = false;
  cases.forEach((c, i) => {
    const progress = perCase.get(c.id);
    let state: PathNode['state'];
    if (progress) state = 'done';
    else if (!currentAssigned) {
      state = 'current';
      currentAssigned = true;
    } else state = 'locked';
    const anchor = ANCHORS[Math.min(i, ANCHORS.length - 1)];
    nodes.push({ key: c.id, kind: 'case', caseItem: c, state, progress, ...anchor });
  });
  // 补足筹备中占位节点（明确演示属性）
  for (let i = nodes.length; i < ANCHORS.length; i += 1) {
    nodes.push({ key: `ph-${i}`, kind: 'placeholder', state: 'locked', ...ANCHORS[i] });
  }
  return nodes;
}

export function RoutePath({ line, color, cases, perCase, selectedCaseId, onSelectCase }: RoutePathProps) {
  const nodes = buildNodes(cases, perCase);
  const doneCount = nodes.filter((n) => n.state === 'done').length;
  const totalSlots = nodes.length - 1;
  const progressPct = totalSlots > 0 ? (doneCount / totalSlots) * 100 : 0;
  const hasCurrent = nodes.some((n) => n.state === 'current');

  return (
    <div className="rpath" style={{ ['--route-color' as string]: color }}>
      <svg className="rpath-svg" viewBox="0 0 720 440" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`rpath-grad-${line}`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity="0.95" />
            <stop offset="100%" stopColor={color} stopOpacity="0.55" />
          </linearGradient>
        </defs>
        {/* 未到达段：虚线 */}
        <path d={PATH_D} fill="none" stroke="#c9dcf5" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
        {/* 已通关段：实线路线色 */}
        {progressPct > 0 && (
          <path
            d={PATH_D}
            fill="none"
            stroke={`url(#rpath-grad-${line})`}
            strokeWidth="4.5"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${progressPct} 100`}
            className="rpath-progress"
          />
        )}
      </svg>

      {nodes.map((node, idx) => {
        const selected = node.caseItem && node.caseItem.id === selectedCaseId;
        return (
          <div
            key={node.key}
            className={`rpath-node rpath-${node.state}${selected ? ' selected' : ''}${node.kind === 'placeholder' ? ' rpath-ph' : ''}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            {node.kind === 'case' ? (
              <button
                type="button"
                className="rpath-dot"
                onClick={() => node.state !== 'locked' && node.caseItem && onSelectCase(node.caseItem.id)}
                disabled={node.state === 'locked'}
                aria-label={`关卡 ${idx + 1}：${node.caseItem?.title}`}
              >
                {node.state === 'done' && <Check size={22} strokeWidth={3} />}
                {node.state === 'current' && <RouteIcon line={line} size={22} />}
                {node.state === 'locked' && <Lock size={18} />}
                {node.state === 'current' && <span className="rpath-pulse" aria-hidden="true" />}
              </button>
            ) : (
              <span className="rpath-dot" aria-hidden="true">
                <Lock size={16} />
              </span>
            )}

            <span className="rpath-label">
              {node.kind === 'case' ? (
                <>
                  <span className="rpath-label-no num">关卡 {idx + 1}</span>
                  <span className="rpath-label-title">{node.caseItem?.title}</span>
                  {node.state === 'done' && node.progress && (
                    <span className="rpath-label-best num">
                      最佳 {Math.round(node.progress.bestRate * 100)}%
                    </span>
                  )}
                  {node.state === 'current' && <span className="rpath-label-cta">可训练</span>}
                  {node.state === 'locked' && <span className="rpath-label-lock">完成前置关卡后解锁</span>}
                </>
              ) : (
                <>
                  <span className="rpath-label-no">关卡 {idx + 1}</span>
                  <span className="rpath-label-lock">筹备中 · 敬请期待</span>
                </>
              )}
            </span>
          </div>
        );
      })}

      {!hasCurrent && cases.length > 0 && (
        <div className="rpath-complete">
          <Check size={14} strokeWidth={3} />
          本路线案例已全部通关，可任选关卡再练冲击更高分
        </div>
      )}
    </div>
  );
}
