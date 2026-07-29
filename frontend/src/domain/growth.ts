import type { CaseSummary, TrainingRecordSummary } from '../api/types';

/** 成长值规则：XP = 历次训练得分总和（全部来自真实训练记录） */
export const XP_PER_LEVEL = 100;

export interface CaseProgress {
  attempts: number;
  bestRate: number;
  bestScore: number;
  bestMax: number;
  lastAt: string;
}

export interface GrowthStats {
  totalTrainings: number;
  xp: number;
  level: number;
  levelTitle: string;
  xpInLevel: number;
  xpForNext: number;
  levelProgress: number;
  streakDays: number;
  todayCount: number;
  bestRate: number;
  perCase: Map<string, CaseProgress>;
}

const LEVEL_TITLES: Array<[number, string]> = [
  [9, '托管专家'],
  [7, '托管能手'],
  [5, '托管熟手'],
  [3, '托管进阶'],
  [1, '托管新手'],
];

export function levelTitle(level: number): string {
  for (const [min, title] of LEVEL_TITLES) {
    if (level >= min) return title;
  }
  return '托管新手';
}

function localDayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** 从真实训练记录推导成长数据：等级、连续训练天数、今日次数、最佳成绩 */
export function computeGrowth(records: TrainingRecordSummary[]): GrowthStats {
  const perCase = new Map<string, CaseProgress>();
  let xp = 0;
  let bestRate = 0;
  const daySet = new Set<string>();

  for (const r of records) {
    xp += r.totalScore;
    const rate = r.totalMaxScore > 0 ? r.totalScore / r.totalMaxScore : 0;
    if (rate > bestRate) bestRate = rate;
    const day = localDayKey(r.submittedAt);
    if (day) daySet.add(day);

    const prev = perCase.get(r.caseId);
    if (prev) {
      prev.attempts += 1;
      if (rate > prev.bestRate) {
        prev.bestRate = rate;
        prev.bestScore = r.totalScore;
        prev.bestMax = r.totalMaxScore;
      }
      if (r.submittedAt > prev.lastAt) prev.lastAt = r.submittedAt;
    } else {
      perCase.set(r.caseId, {
        attempts: 1,
        bestRate: rate,
        bestScore: r.totalScore,
        bestMax: r.totalMaxScore,
        lastAt: r.submittedAt,
      });
    }
  }

  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpInLevel = xp % XP_PER_LEVEL;

  // 连续训练天数：今天无记录则允许从昨天起算
  const today = new Date();
  const todayCount = daySet.has(localDayKey(today.toISOString())) ? countOfDay(records, today) : 0;
  let streakDays = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!daySet.has(localDayKey(cursor.toISOString()))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (daySet.has(localDayKey(cursor.toISOString()))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    totalTrainings: records.length,
    xp,
    level,
    levelTitle: levelTitle(level),
    xpInLevel,
    xpForNext: XP_PER_LEVEL,
    levelProgress: xpInLevel / XP_PER_LEVEL,
    streakDays,
    todayCount,
    bestRate,
    perCase,
  };
}

function countOfDay(records: TrainingRecordSummary[], day: Date): number {
  const key = localDayKey(day.toISOString());
  return records.filter((r) => localDayKey(r.submittedAt) === key).length;
}

/**
 * 推荐下一步训练的案例：
 * 优先未完成（无记录）的案例，全部练过则推荐最佳得分率最低的案例再练。
 */
export function recommendCase(
  cases: CaseSummary[],
  perCase: Map<string, CaseProgress>,
): CaseSummary | null {
  if (cases.length === 0) return null;
  const unplayed = cases.filter((c) => !perCase.has(c.id));
  if (unplayed.length > 0) return unplayed[0];
  let weakest = cases[0];
  let weakestRate = Number.POSITIVE_INFINITY;
  for (const c of cases) {
    const p = perCase.get(c.id);
    const rate = p ? p.bestRate : 0;
    if (rate < weakestRate) {
      weakestRate = rate;
      weakest = c;
    }
  }
  return weakest;
}
