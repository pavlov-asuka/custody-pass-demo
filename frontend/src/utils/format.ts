import type { Dimension, Line, RouteState, StepType } from '../api/types';

export const stepLabels: Record<StepType, string> = {
  KNOWLEDGE_CARD: '知识卡',
  DEMONSTRATION: '正常示范',
  BASIC_PRACTICE: '基础练习',
  EXCEPTION_CASE: '异常案例',
};

export const dimensionLabels: Record<Dimension, string> = {
  CONCEPT: '概念理解',
  PROCESS: '处理步骤',
  RISK: '风险意识',
  EXPRESSION: '表达规范',
};

export const routeStateLabels: Record<RouteState, string> = {
  LOCKED: '尚未解锁',
  NOT_STARTED: '未开始',
  IN_PROGRESS: '学习中',
  LEARNED_NOT_MASTERED: '待补学',
  PASSED: '已通过',
};

export const lineLabels: Record<Line, string> = {
  CLEARING: '清算',
  ACCOUNTING: '核算',
  SUPERVISION: '监督',
};

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}
export function maskEmployeeNo(value: string): string {
  if (value.length <= 2) return value;
  return `${'*'.repeat(Math.max(4, value.length - 2))}${value.slice(-2)}`;
}
