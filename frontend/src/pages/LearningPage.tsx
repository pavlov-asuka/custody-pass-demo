import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CircleAlert,
  Clock3,
  FileCheck2,
  Lightbulb,
  Save,
  Send,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  useBlocker,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  ApiError,
  completeStep,
  getDraft,
  getRoute,
  getStep,
  saveDraft,
  submitAttempt,
} from '../api/client';
import type {
  DemonstrationContent,
  DraftResponse,
  ExceptionCaseContent,
  KnowledgeContent,
  RouteOverview,
  StepResponse,
  StepType,
} from '../api/types';
import { AppShell } from '../components/AppShell';
import { Mascot } from '../components/Mascot';
import { PracticeSession } from '../components/PracticeSession';
import { RouteStepper } from '../components/RouteStepper';
import { ErrorState, LoadingState } from '../components/States';
import { pendingAttemptKey, requestId } from '../utils/ids';

const stepOrder: StepType[] = [
  'KNOWLEDGE_CARD',
  'DEMONSTRATION',
  'BASIC_PRACTICE',
  'EXCEPTION_CASE',
];

interface DraftConflict {
  server: DraftResponse;
  localAnswer: string;
}

function KnowledgeCardStep({
  data,
  busy,
  onComplete,
}: {
  data: StepResponse<'KNOWLEDGE_CARD'>;
  busy: boolean;
  onComplete: () => Promise<void>;
}) {
  const content = data.content as KnowledgeContent;
  const [index, setIndex] = useState(0);
  const card = content.cards[index];
  const last = index === content.cards.length - 1;

  useEffect(() => setIndex(0), [data.contentVersion]);

  return (
    <section className="lesson-card knowledge-card">
      <div className="lesson-card__topline">
        <span className="eyebrow">知识卡 {index + 1} / {content.cards.length}</span>
        <span className="lesson-type"><BookOpen size={18} /> 一个核心判断</span>
      </div>
      <h2>{card.title}</h2>
      <div className="knowledge-card__conclusion">{card.conclusion}</div>
      <div className={`knowledge-visual knowledge-visual--${card.type.toLowerCase()}`}>
        {card.items.map((item, itemIndex) => (
          <div key={item} className="knowledge-visual__item">
            <span>{itemIndex + 1}</span>
            <strong>{item}</strong>
            {itemIndex < card.items.length - 1 && <ArrowRight size={19} />}
          </div>
        ))}
      </div>
      <div className="lesson-insight">
        <Lightbulb size={24} />
        <div><strong>记住这一点</strong><span>{card.conclusion}</span></div>
      </div>
      <div className="lesson-inline-actions">
        <button
          className="button button--ghost"
          type="button"
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          disabled={index === 0}
        >
          <ArrowLeft size={18} /> 上一张
        </button>
        <button
          className="button button--primary"
          type="button"
          disabled={busy}
          onClick={() => (last ? onComplete() : setIndex((value) => value + 1))}
        >
          {busy ? '正在保存…' : last ? '完成知识卡' : '下一张'}
          <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}

function DemonstrationStep({
  data,
  busy,
  onComplete,
}: {
  data: StepResponse<'DEMONSTRATION'>;
  busy: boolean;
  onComplete: () => Promise<void>;
}) {
  const content = data.content as DemonstrationContent;
  const [visible, setVisible] = useState(1);
  const complete = visible >= content.steps.length;

  useEffect(() => setVisible(1), [data.contentVersion]);

  return (
    <section className="lesson-card demonstration">
      <div className="lesson-card__topline">
        <span className="eyebrow">正常示范</span>
        <span className="lesson-type"><FileCheck2 size={18} /> 跟着步骤做</span>
      </div>
      <h2>{content.scenario.date} · {content.scenario.product}</h2>
      <p className="lesson-lead">你是{content.scenario.role}。场景中已经确认：</p>
      <div className="fact-strip">
        {content.scenario.facts.map((fact) => <span key={fact}><Check size={16} />{fact}</span>)}
      </div>
      <ol className="demo-timeline">
        {content.steps.slice(0, visible).map((step) => (
          <li key={step.order}>
            <span className="demo-timeline__number">{step.order}</span>
            <div>
              <strong>{step.action}</strong>
              <p><span>为什么：</span>{step.reason}</p>
            </div>
          </li>
        ))}
      </ol>
      {complete && (
        <div className="lesson-insight">
          <ArrowRight size={24} />
          <div><strong>正确处理链</strong><span>{content.summary}</span></div>
        </div>
      )}
      <div className="lesson-inline-actions">
        <span className="muted">已展开 {visible} / {content.steps.length} 步</span>
        <button
          className="button button--primary"
          type="button"
          disabled={busy}
          onClick={() => (complete ? onComplete() : setVisible((value) => value + 1))}
        >
          {busy ? '正在保存…' : complete ? '完成示范' : '展开下一步'} <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}

function BasicPracticeStep({
  routeId,
  data,
  onCompleted,
}: {
  routeId: string;
  data: StepResponse<'BASIC_PRACTICE'>;
  onCompleted: () => Promise<void>;
}) {
  return <PracticeSession routeId={routeId} data={data} onCompleted={onCompleted} />;
}

function ExceptionCaseStep({
  route,
  data,
}: {
  route: RouteOverview;
  data: StepResponse<'EXCEPTION_CASE'>;
}) {
  const navigate = useNavigate();
  const content = data.content as ExceptionCaseContent;
  const [answer, setAnswer] = useState('');
  const [revision, setRevision] = useState(0);
  const [lastSavedAnswer, setLastSavedAnswer] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [conflict, setConflict] = useState<DraftConflict | null>(null);
  const [confirming, setConfirming] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const allowNavigation = useRef(false);
  const recoveryKey = `custody-training:draft-recovery:${route.routeId}`;
  const dirty = answer !== lastSavedAnswer;
  const navigationBlocker = useBlocker(() => dirty && !allowNavigation.current);

  const loadDraft = useCallback(async () => {
    setLoadingDraft(true);
    setError(null);
    try {
      const draft = await getDraft(route.routeId);
      const recovery = sessionStorage.getItem(recoveryKey);
      setAnswer(recovery ?? draft.answer ?? '');
      setLastSavedAnswer(draft.answer ?? '');
      setRevision(draft.revision);
      setUpdatedAt(draft.updatedAt);
      if (recovery) sessionStorage.removeItem(recoveryKey);
    } catch (reason) {
      setError(reason as Error);
    } finally {
      setLoadingDraft(false);
    }
  }, [recoveryKey, route.routeId]);

  useEffect(() => {
    void loadDraft();
  }, [loadDraft]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty || submitting) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty, submitting]);

  const persist = useCallback(async (value = answer, expected = revision): Promise<boolean> => {
    if (value === lastSavedAnswer) return true;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveDraft(route.routeId, data.contentVersion, value, expected);
      setRevision(saved.revision);
      setUpdatedAt(saved.updatedAt);
      setLastSavedAnswer(value);
      return true;
    } catch (reason) {
      if (reason instanceof ApiError && reason.code === 'DRAFT_CONFLICT') {
        const server = await getDraft(route.routeId);
        setConflict({ server, localAnswer: value });
      } else {
        if (reason instanceof ApiError && reason.code === 'CONTENT_VERSION_MISMATCH') {
          sessionStorage.setItem(recoveryKey, value);
        }
        setError(reason as Error);
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [answer, data.contentVersion, lastSavedAnswer, recoveryKey, revision, route.routeId]);

  useEffect(() => {
    if (loadingDraft || !dirty || submitting) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void persist(), 900);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [answer, dirty, loadingDraft, persist, submitting]);

  async function resolveConflict(choice: 'server' | 'local') {
    if (!conflict) return;
    if (choice === 'server') {
      setAnswer(conflict.server.answer ?? '');
      setLastSavedAnswer(conflict.server.answer ?? '');
      setRevision(conflict.server.revision);
      setUpdatedAt(conflict.server.updatedAt);
      setConflict(null);
      return;
    }
    const local = conflict.localAnswer;
    const serverRevision = conflict.server.revision;
    setConflict(null);
    setRevision(serverRevision);
    await persist(local, serverRevision);
  }

  async function submit() {
    const normalized = answer.trim();
    if (!normalized) return;
    setSubmitting(true);
    setError(null);
    try {
      if (dirty) {
        const saved = await persist(normalized, revision);
        if (!saved) {
          setConfirming(false);
          return;
        }
      }
      const storageKey = pendingAttemptKey(route.routeId);
      const pendingRaw = sessionStorage.getItem(storageKey);
      const pending = pendingRaw
        ? JSON.parse(pendingRaw) as { answer: string; clientRequestId: string }
        : null;
      const clientRequestId =
        pending?.answer === normalized ? pending.clientRequestId : requestId('attempt');
      sessionStorage.setItem(storageKey, JSON.stringify({ answer: normalized, clientRequestId }));
      const attempt = await submitAttempt(route.routeId, {
        clientRequestId,
        contentVersion: route.contentVersion,
        rubricVersion: route.rubricVersion,
        answer: normalized,
      });
      sessionStorage.removeItem(storageKey);
      setLastSavedAnswer(normalized);
      allowNavigation.current = true;
      navigate(`/attempts/${attempt.attemptId}`, { replace: true });
    } catch (reason) {
      setError(reason as Error);
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingDraft) return <LoadingState label="正在取回你的异常案例草稿…" />;

  return (
    <section className="exception-case">
      <div className="exception-case__heading">
        <div>
          <span className="eyebrow">异常案例</span>
          <h2>请给出完整处理方案</h2>
          <p>先厘清事实，再说明核查、措施、协作和反馈。提交后将生成正式训练记录。</p>
        </div>
        <Mascot pose="THINKING" size="small" message="我陪你一起把思路理清。" />
      </div>

      {error && (
        <ErrorState
          error={error}
          compact
          onRetry={
            error instanceof ApiError && error.code === 'CONTENT_VERSION_MISMATCH'
              ? () => window.location.reload()
              : undefined
          }
        />
      )}

      <div className="exception-workspace">
        <aside className="case-brief">
          <div className="case-brief__meta">
            <span><strong>你的角色</strong>{content.scenario.role}</span>
            <span><strong>业务时点</strong>{content.scenario.date}</span>
          </div>
          <div>
            <span className="eyebrow">已知事实</span>
            <ul>{content.scenario.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
          </div>
          <div>
            <span className="eyebrow">作答任务</span>
            <ol>{content.tasks.map((task) => <li key={task}>{task}</li>)}</ol>
          </div>
        </aside>

        <div className="answer-editor">
          <div className="answer-editor__top">
            <label htmlFor="formal-answer">你的处理方案</label>
            <span className={saving ? 'is-saving' : ''}>
              {saving ? <><Clock3 size={15} /> 正在保存</> : <><Save size={15} /> {updatedAt ? '草稿已保存' : '自动保存已开启'}</>}
            </span>
          </div>
          <textarea
            id="formal-answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value.slice(0, 12000))}
            placeholder="请写下你的完整处理方案……"
            disabled={submitting}
          />
          <div className="writing-prompts">
            <span>可参考的表达顺序</span>
            {content.writingPrompts?.map((prompt) => <em key={prompt}>{prompt}</em>)}
          </div>
          <div className="answer-editor__footer">
            <span>{answer.length.toLocaleString()} / 12,000</span>
            <div>
              <button
                className="button button--secondary"
                type="button"
                onClick={() => void persist()}
                disabled={!dirty || saving || submitting}
              >
                <Save size={18} /> 保存草稿
              </button>
              <button
                className="button button--primary"
                type="button"
                disabled={!answer.trim() || saving || submitting}
                onClick={() => setConfirming(true)}
              >
                <Send size={18} /> 提交答案
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirming && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="submit-title">
            <span className="modal__icon"><FileCheck2 /></span>
            <h2 id="submit-title">生成本次正式评分记录？</h2>
            <p>提交成功后，本次答案将不可修改。评分会在后台异步完成。</p>
            <div className="modal__actions">
              <button className="button button--ghost" type="button" onClick={() => setConfirming(false)}>
                再检查一下
              </button>
              <button className="button button--primary" type="button" onClick={() => void submit()} disabled={submitting}>
                {submitting ? '正在提交…' : '确认提交'}
              </button>
            </div>
          </div>
        </div>
      )}

      {conflict && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
            <span className="modal__icon modal__icon--warning"><CircleAlert /></span>
            <h2 id="conflict-title">发现另一份更新过的草稿</h2>
            <p>我们没有覆盖它。请选择继续使用云端草稿，或明确保留当前编辑内容。</p>
            <div className="conflict-preview">
              <div><strong>云端草稿</strong><p>{conflict.server.answer || '（空草稿）'}</p></div>
              <div><strong>当前编辑</strong><p>{conflict.localAnswer || '（空草稿）'}</p></div>
            </div>
            <div className="modal__actions">
              <button className="button button--secondary" type="button" onClick={() => void resolveConflict('server')}>
                使用云端草稿
              </button>
              <button className="button button--primary" type="button" onClick={() => void resolveConflict('local')}>
                保留当前编辑并保存
              </button>
            </div>
          </div>
        </div>
      )}

      {navigationBlocker.state === 'blocked' && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true">
            <span className="modal__icon modal__icon--warning"><Save /></span>
            <h2>草稿还没有保存完成</h2>
            <p>建议先留在页面等待自动保存，避免丢失刚刚输入的内容。</p>
            <div className="modal__actions">
              <button className="button button--ghost" type="button" onClick={() => navigationBlocker.reset()}>
                留在这里
              </button>
              <button className="button button--secondary" type="button" onClick={() => navigationBlocker.proceed()}>
                仍然离开
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function LearningPage() {
  const navigate = useNavigate();
  const { routeId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const requestedStep = searchParams.get('step') as StepType | null;
  const [route, setRoute] = useState<RouteOverview | null>(null);
  const [active, setActive] = useState<StepType>('KNOWLEDGE_CARD');
  const [step, setStep] = useState<StepResponse | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [loadingStep, setLoadingStep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stepReload, setStepReload] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const refreshRoute = useCallback(async (selectNext = false) => {
    const latest = await getRoute(routeId);
    setRoute(latest);
    if (selectNext) {
      const requested = requestedStep && stepOrder.includes(requestedStep)
        && latest.steps.find((item) => item.stepType === requestedStep)?.accessible
        ? requestedStep
        : null;
      const selected = requested
        ?? latest.nextStep
        ?? latest.steps.find((item) => item.accessible)?.stepType
        ?? 'KNOWLEDGE_CARD';
      setActive(selected);
    }
    return latest;
  }, [requestedStep, routeId]);

  useEffect(() => {
    setLoadingRoute(true);
    setError(null);
    refreshRoute(true)
      .catch((reason) => setError(reason as Error))
      .finally(() => setLoadingRoute(false));
  }, [refreshRoute]);

  useEffect(() => {
    if (!route) return;
    setLoadingStep(true);
    setError(null);
    getStep(routeId, active)
      .then((value) => setStep(value))
      .catch((reason) => {
        setStep(null);
        setError(reason as Error);
        if (reason instanceof ApiError && reason.code === 'LEARNING_SEQUENCE_VIOLATION') {
          void refreshRoute(true);
        }
      })
      .finally(() => setLoadingStep(false));
  }, [active, refreshRoute, route, routeId, stepReload]);

  useEffect(() => {
    document.title = route ? `${route.title} · 托管智训营` : '路线学习 · 托管智训营';
  }, [route]);

  const activeIndex = stepOrder.indexOf(active);
  const previous = activeIndex > 0
    ? [...stepOrder].slice(0, activeIndex).reverse().find((type) =>
      route?.steps.find((item) => item.stepType === type)?.accessible)
    : undefined;

  async function markComplete(type: StepType) {
    if (!route || !step) return;
    setBusy(true);
    setError(null);
    try {
      const progress = await completeStep(
        route.routeId,
        type,
        step.contentVersion,
        requestId('complete'),
      );
      const latest = await refreshRoute(false);
      setActive(progress.nextStep ?? latest.nextStep ?? type);
    } catch (reason) {
      setError(reason as Error);
      if (
        reason instanceof ApiError
        && ['CONTENT_VERSION_MISMATCH', 'LEARNING_SEQUENCE_VIOLATION'].includes(reason.code)
      ) {
        await refreshRoute(true);
      }
    } finally {
      setBusy(false);
    }
  }

  async function practiceCompleted() {
    await refreshRoute(false);
    setActive('EXCEPTION_CASE');
  }

  const validStep = step?.stepType === active ? step : null;
  const practiceMode = Boolean(route) && active === 'BASIC_PRACTICE';

  return (
    <AppShell
      backLabel="返回地图"
      onBack={() => navigate('/map/accounting')}
      context={route?.title || '路线学习'}
    >
      {practiceMode && route ? (
        <div className="practice-layout page-enter">
          <div className="practice-layout__progress">
            <div className="practice-layout__progress-inner">
              <RouteStepper route={route} active={active} onSelect={setActive} />
            </div>
          </div>
          {error && (
            <ErrorState error={error} compact onRetry={() => setStepReload((value) => value + 1)} />
          )}
          {loadingStep && <LoadingState label="正在加载当前学习环节…" />}
          {!loadingStep && validStep?.stepType === 'BASIC_PRACTICE' && (
            <BasicPracticeStep
              routeId={route.routeId}
              data={validStep as StepResponse<'BASIC_PRACTICE'>}
              onCompleted={practiceCompleted}
            />
          )}
        </div>
      ) : (
        <div className="learning-page page-enter">
          {loadingRoute && <LoadingState label="正在准备路线…" />}
          {error && !route && <ErrorState error={error} onRetry={() => void refreshRoute(true)} />}
          {route && (
            <>
              <header className="learning-header">
                <div>
                  <span className="eyebrow">核算路线 · 预计 {route.estimatedMinutes ?? 20} 分钟</span>
                  <h1>{route.title}</h1>
                  <p>{route.summary}</p>
                </div>
                <RouteStepper route={route} active={active} onSelect={setActive} />
              </header>

              {error && <ErrorState error={error} compact onRetry={() => setStepReload((value) => value + 1)} />}
              {loadingStep && <LoadingState label="正在加载当前学习环节…" />}
              {!loadingStep && validStep?.stepType === 'KNOWLEDGE_CARD' && (
                <KnowledgeCardStep
                  data={validStep as StepResponse<'KNOWLEDGE_CARD'>}
                  busy={busy}
                  onComplete={() => markComplete('KNOWLEDGE_CARD')}
                />
              )}
              {!loadingStep && validStep?.stepType === 'DEMONSTRATION' && (
                <DemonstrationStep
                  data={validStep as StepResponse<'DEMONSTRATION'>}
                  busy={busy}
                  onComplete={() => markComplete('DEMONSTRATION')}
                />
              )}
              {!loadingStep && validStep?.stepType === 'EXCEPTION_CASE' && (
                <ExceptionCaseStep
                  route={route}
                  data={validStep as StepResponse<'EXCEPTION_CASE'>}
                />
              )}

              {active !== 'EXCEPTION_CASE' && (
                <div className="lesson-bottom-bar">
                  <button
                    className="button button--ghost"
                    type="button"
                    disabled={!previous}
                    onClick={() => previous && setActive(previous)}
                  >
                    <ArrowLeft size={18} /> 上一步
                  </button>
                  <span>{route.completedSteps} / {route.totalSteps} 个环节已完成</span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}
