import type { CaseDimension, CaseLine } from '../api/types';

export interface LineMeta {
  key: CaseLine;
  name: string;
  short: string;
  tagline: string;
  description: string;
  color: string;
  soft: string;
}

export const LINE_META: Record<CaseLine, LineMeta> = {
  CLEARING: {
    key: 'CLEARING',
    name: '清算交收',
    short: '清算',
    tagline: '指令、资金与交收跟踪',
    description: '从指令审核到资金清算与交收跟踪，练习在部分交收等异常场景中的处置顺序与风险判断。',
    color: 'var(--route-clearing)',
    soft: 'var(--route-clearing-soft)',
  },
  ACCOUNTING: {
    key: 'ACCOUNTING',
    name: '估值核算',
    short: '核算',
    tagline: '日终核算与净值核对',
    description: '围绕日终估值、净值计算与差异排查，练习核算处理的完整流程与依据表达。',
    color: 'var(--route-accounting)',
    soft: 'var(--route-accounting-soft)',
  },
  SUPERVISION: {
    key: 'SUPERVISION',
    name: '投资监督',
    short: '监督',
    tagline: '投资范围与异常识别',
    description: '识别投资范围、比例限制与监督异常，练习在关键风险点上的识别与处置表达。',
    color: 'var(--route-supervision)',
    soft: 'var(--route-supervision-soft)',
  },
};

export const LINE_ORDER: CaseLine[] = ['CLEARING', 'ACCOUNTING', 'SUPERVISION'];

export function lineName(line: string): string {
  return (LINE_META as Record<string, LineMeta>)[line]?.name ?? line;
}

export interface DimensionMeta {
  key: CaseDimension;
  name: string;
  hint: string;
  color: string;
}

export const DIMENSION_META: Record<CaseDimension, DimensionMeta> = {
  CONCEPT: { key: 'CONCEPT', name: '概念理解', hint: '业务概念与术语是否准确', color: 'var(--dim-concept)' },
  PROCESS: { key: 'PROCESS', name: '流程操作', hint: '处置步骤与顺序是否完整', color: 'var(--dim-process)' },
  RISK: { key: 'RISK', name: '风险意识', hint: '关键风险点是否被识别', color: 'var(--dim-risk)' },
  EXPRESSION: { key: 'EXPRESSION', name: '表达规范', hint: '表述是否清晰、有条理', color: 'var(--dim-expression)' },
};

export function reviewerModeLabel(mode: string): string {
  switch (mode) {
    case 'MOCK_RULES':
      return '演示评卷';
    case 'OPENAI_COMPATIBLE':
      return '智能评卷';
    case 'FIN_X_SCOPE':
      return '智能评卷';
    default:
      return '智能评卷';
  }
}

export function answerModeLabel(mode: string): string {
  switch (mode) {
    case 'MOCK':
      return '演示问答';
    case 'OPENAI_COMPATIBLE':
      return '智能问答';
    case 'FIN_X_SCOPE':
      return '智能问答';
    default:
      return '智能问答';
  }
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function difficultyLabel(difficulty: string): string {
  const map: Record<string, string> = {
    BEGINNER: '入门',
    EASY: '入门',
    INTERMEDIATE: '进阶',
    MEDIUM: '进阶',
    ADVANCED: '进阶',
    HARD: '挑战',
  };
  return map[difficulty.toUpperCase()] ?? difficulty;
}
