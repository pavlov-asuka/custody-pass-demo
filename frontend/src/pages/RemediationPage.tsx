import { ArrowLeft, ArrowRight, BookOpenCheck, Check, Target } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  answerRemediation,
  getRemediation,
  unlockComprehensivePracticeRetry,
} from '../api/client';
import type {
  RemediationFeedback,
  RemediationPlan,
} from '../api/types';
import { AppShell } from '../components/AppShell';
import { Mascot } from '../components/Mascot';
import { PracticeQuestion } from '../components/PracticeQuestion';
import { ErrorState, LoadingState } from '../components/States';
import { stepLabels } from '../utils/format';
import { requestId } from '../utils/ids';

export function RemediationPage() {
  const { attemptId = '' } = useParams();
  const id = Number(attemptId);
  const navigate = useNavigate();
  const [plan, setPlan] = useState<RemediationPlan | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [feedback, setFeedback] = useState<RemediationFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const value = await getRemediation(id);
      setPlan(value);
      const firstIncomplete = value.targets.findIndex((target) => !target.completed);
      setActiveIndex(firstIncomplete >= 0 ? firstIncomplete : Math.max(0, value.targets.length - 1));
    } catch (reason) {
      setError(reason as Error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
    document.title = '定向补学 · 托管智训营';
  }, [load]);

  const target = useMemo(() => plan?.targets[activeIndex] ?? null, [activeIndex, plan]);

  async function submit(answer: string[]) {
    if (!target) return;
    setError(null);
    try {
      const value = await answerRemediation(
        id,
        target.targetId,
        answer,
        requestId('remediation'),
      );
      setFeedback(value);
      if (value.targetCompleted) {
        const latest = await getRemediation(id);
        setPlan(latest);
        window.setTimeout(() => {
          const next = latest.targets.findIndex((item, index) => index > activeIndex && !item.completed);
          if (next >= 0) {
            setActiveIndex(next);
            setFeedback(null);
          }
        }, 650);
      }
    } catch (reason) {
      setError(reason as Error);
    }
  }

  async function completePracticeRetry() {
    if (!plan) return;
    setUnlocking(true);
    setError(null);
    try {
      const result = await unlockComprehensivePracticeRetry(id);
      navigate(`/learn/${result.routeId}?step=COMPREHENSIVE_PRACTICE`, { replace: true });
    } catch (reason) {
      setError(reason as Error);
    } finally {
      setUnlocking(false);
    }
  }

  return (
    <AppShell
      backLabel="返回评分结果"
      onBack={() => navigate(`/attempts/${id}`)}
      context="定向补学"
    >
      <div className="remediation-page page-enter">
        {loading && <LoadingState label="正在读取补学目标…" />}
        {error && <ErrorState error={error} onRetry={() => void load()} compact={Boolean(plan)} />}
        {plan && (
          <>
            <header className="remediation-header">
              <div>
                <span className="eyebrow">针对本次作答 · 补学目标</span>
                <h1>完成补学目标，再提交综合实务</h1>
                <p>每个目标对应本次作答中的一个字段、计算或勾稽缺口。全部完成后可重新提交综合实务，补学本身不直接通过路线。</p>
              </div>
              <Mascot pose="RESULT_SUPPORT" size="medium" message="先处理当前目标，再回到综合实务。" />
            </header>

            <div className="remediation-layout">
              <aside className="remediation-nav">
                <div className="remediation-nav__progress">
                  <span>{plan.completedTargets} / {plan.totalTargets}</span>
                  <div className="progress-track">
                    <span style={{ width: `${plan.totalTargets ? (plan.completedTargets / plan.totalTargets) * 100 : 0}%` }} />
                  </div>
                </div>
                {plan.targets.map((item, index) => (
                  <button
                    key={item.targetId}
                    type="button"
                    className={index === activeIndex ? 'is-active' : ''}
                    onClick={() => {
                      setActiveIndex(index);
                      setFeedback(null);
                    }}
                  >
                    <span className={item.completed ? 'is-done' : ''}>
                      {item.completed ? <Check size={17} /> : index + 1}
                    </span>
                    <div><strong>{item.title}</strong><small>{item.completed ? '已核对' : '待补学'}</small></div>
                  </button>
                ))}
              </aside>

              <section className="remediation-card">
                {target && (
                  <>
                    <div className="remediation-card__heading">
                      <span className="eyebrow">定向补学 {activeIndex + 1} / {plan.totalTargets}</span>
                      <h2>{target.title}</h2>
                    </div>
                    <div className="why-remediation">
                      <Target size={23} />
                      <div><strong>本次作答缺口</strong><p>{target.reason}</p></div>
                    </div>
                    <div className="linked-knowledge">
                      <BookOpenCheck size={23} />
                      <div>
                        <strong>回看相关内容</strong>
                        <p>{stepLabels[target.materialStep]}中的相关要点</p>
                      </div>
                    </div>
                    {target.completed && !feedback ? (
                      <div className="completed-target">
                        <span><Check /></span>
                        <div><strong>这个补学目标已完成</strong><p>可重新查看内容或再次作答。</p></div>
                      </div>
                    ) : (
                      <PracticeQuestion
                        question={target.practice}
                        feedback={feedback}
                        onSubmit={submit}
                      />
                    )}
                  </>
                )}
              </section>
            </div>

            <div className="remediation-footer">
              <button
                className="button button--ghost"
                type="button"
                onClick={() => navigate(`/attempts/${id}`)}
              >
                <ArrowLeft size={18} /> 返回评分结果
              </button>
              {plan.completed && (
                <button
                  className="button button--primary"
                  type="button"
                  onClick={() => void completePracticeRetry()}
                  disabled={unlocking}
                >
                  {unlocking ? '正在准备综合实务…' : '重新完成综合实务'} <ArrowRight size={18} />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
