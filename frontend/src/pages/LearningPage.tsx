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
  ComprehensivePracticeAnswer,
  ComprehensivePracticeContent,
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
import {
  materialKindLabel,
  optionValueLabel,
  publicBusinessText,
  publicUnitLabel,
  workItemTypeLabel,
} from '../utils/format';
import { pendingAttemptKey, requestId } from '../utils/ids';

const stepOrder: StepType[] = [
  'KNOWLEDGE_CARD',
  'DEMONSTRATION',
  'BASIC_PRACTICE',
  'COMPREHENSIVE_PRACTICE',
];

interface DraftConflict {
  server: DraftResponse;
  localAnswer: ComprehensivePracticeAnswer;
}

function answerPreview(
  content: ComprehensivePracticeContent,
  answer: ComprehensivePracticeAnswer,
): string {
  const filled = content.workItems.flatMap((item, index) => {
    const value = answer.responses[item.workItemId];
    if (value === undefined || value === null || value === '') return [];
    const displayValue = typeof value === 'number'
      ? `${value}${item.response.unit ? ` ${publicUnitLabel(item.response.unit)}` : ''}`
      : optionValueLabel(String(value), item.workItemId, index);
    return [`${publicBusinessText(item.title)}：${publicBusinessText(displayValue)}`];
  });
  return filled.length ? filled.join('\n') : '尚未填写';
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
        <span className="lesson-type"><BookOpen size={18} /> 关键判断</span>
      </div>
      <Mascot pose="READ_WITH_BOOK" size="small" />
      <h2>{publicBusinessText(card.title)}</h2>
      <div className="knowledge-card__conclusion">{publicBusinessText(card.conclusion)}</div>
      <div className={`knowledge-visual knowledge-visual--${card.type.toLowerCase()}`}>
        {card.items.map((item, itemIndex) => (
          <div key={item} className="knowledge-visual__item">
            <span>{itemIndex + 1}</span>
            <strong>{publicBusinessText(item)}</strong>
            {itemIndex < card.items.length - 1 && <ArrowRight size={19} />}
          </div>
        ))}
      </div>
      <div className="lesson-insight">
        <Lightbulb size={24} />
        <div><strong>本卡结论</strong><span>{publicBusinessText(card.conclusion)}</span></div>
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
        <span className="lesson-type"><FileCheck2 size={18} /> 按步骤核对</span>
      </div>
      <h2>{publicBusinessText(content.scenario.date)} · {publicBusinessText(content.scenario.product)}</h2>
      <p className="lesson-lead">你的岗位是{publicBusinessText(content.scenario.role)}。当前资料已确认：</p>
      <div className="fact-strip">
        {content.scenario.facts.map((fact) => <span key={fact}><Check size={16} />{publicBusinessText(fact)}</span>)}
      </div>
      <ol className="demo-timeline">
        {content.steps.map((step, stepIndex) => {
          const state = stepIndex < visible - 1
            ? 'is-done'
            : stepIndex === visible - 1
              ? 'is-current'
              : 'is-future';
          return (
          <li key={step.order} className={state}>
            <span className="demo-timeline__number">{step.order}</span>
            <div>
              <strong>{publicBusinessText(step.action)}</strong>
              <p><span>为什么：</span>{publicBusinessText(step.reason)}</p>
            </div>
          </li>
          );
        })}
      </ol>
      {complete && (
        <div className="lesson-insight">
          <ArrowRight size={24} />
          <div><strong>处理结果</strong><span>{publicBusinessText(content.summary)}</span></div>
        </div>
      )}
      <div className="lesson-inline-actions">
        <span className="muted">已显示 {visible} / {content.steps.length} 步</span>
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

function ComprehensivePracticeStep({
  route,
  data,
}: {
  route: RouteOverview;
  data: StepResponse<'COMPREHENSIVE_PRACTICE'>;
}) {
  const navigate = useNavigate();
  const content = data.content as ComprehensivePracticeContent;
  const emptyAnswer: ComprehensivePracticeAnswer = { responses: {} };
  const [answer, setAnswer] = useState<ComprehensivePracticeAnswer>(emptyAnswer);
  const [revision, setRevision] = useState(0);
  const [lastSavedAnswer, setLastSavedAnswer] = useState<ComprehensivePracticeAnswer>(emptyAnswer);
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
  const serializedAnswer = JSON.stringify(answer);
  const dirty = serializedAnswer !== JSON.stringify(lastSavedAnswer);
  const complete = content.workItems.every((item) => {
    const value = answer.responses[item.workItemId];
    return typeof value === 'number' ? Number.isFinite(value) : Boolean(value?.trim());
  });
  const navigationBlocker = useBlocker(() => dirty && !allowNavigation.current);

  const loadDraft = useCallback(async () => {
    setLoadingDraft(true);
    setError(null);
    try {
      const draft = await getDraft(route.routeId);
      const recovery = sessionStorage.getItem(recoveryKey);
      const recovered = recovery ? JSON.parse(recovery) as ComprehensivePracticeAnswer : null;
      setAnswer(recovered ?? draft.answer ?? emptyAnswer);
      setLastSavedAnswer(draft.answer ?? emptyAnswer);
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
    if (JSON.stringify(value) === JSON.stringify(lastSavedAnswer)) return true;
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
          sessionStorage.setItem(recoveryKey, JSON.stringify(value));
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
      setAnswer(conflict.server.answer ?? emptyAnswer);
      setLastSavedAnswer(conflict.server.answer ?? emptyAnswer);
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
    if (!complete) return;
    setSubmitting(true);
    setError(null);
    try {
      if (dirty) {
        const saved = await persist(answer, revision);
        if (!saved) {
          setConfirming(false);
          return;
        }
      }
      const storageKey = pendingAttemptKey(route.routeId);
      const pendingRaw = sessionStorage.getItem(storageKey);
      const pending = pendingRaw
        ? JSON.parse(pendingRaw) as { answer: ComprehensivePracticeAnswer; clientRequestId: string }
        : null;
      const clientRequestId = pending && JSON.stringify(pending.answer) === serializedAnswer
        ? pending.clientRequestId
        : requestId('attempt');
      sessionStorage.setItem(storageKey, JSON.stringify({ answer, clientRequestId }));
      const attempt = await submitAttempt(route.routeId, {
        clientRequestId,
        contentVersion: route.contentVersion,
        rubricVersion: route.rubricVersion,
        answer,
      });
      sessionStorage.removeItem(storageKey);
      setLastSavedAnswer(answer);
      allowNavigation.current = true;
      navigate(`/attempts/${attempt.attemptId}`, { replace: true });
    } catch (reason) {
      setError(reason as Error);
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingDraft) return <LoadingState label="正在读取综合实务草稿…" />;

  return (
    <section className="comprehensive-practice">
      <div className="comprehensive-practice__heading">
        <div>
          <span className="eyebrow">综合实务</span>
          <h2>完成核算工作底稿</h2>
          <p>读取资料、完成计算与账务处理，再用第二来源核对结果。</p>
        </div>
        <Mascot pose="THINKING" size="small" message="先读资料，再落笔计算。" />
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

      <div className="practice-workspace">
        <aside className="practice-brief">
          <div className="practice-brief__meta">
            <span><strong>你的角色</strong>{publicBusinessText(content.scenario.role)}</span>
            <span><strong>业务时点</strong>{publicBusinessText(content.scenario.date)}</span>
          </div>
          <div>
            <span className="eyebrow">当前业务</span>
            <h3>{publicBusinessText(content.scenario.product)}</h3>
            <p>{publicBusinessText(content.scenario.purpose)}</p>
          </div>
          <div className="source-materials">
            <span className="eyebrow">业务资料包</span>
            {content.sourceMaterials.map((material) => (
              <article className="source-material" key={material.materialId}>
                <header><strong>{publicBusinessText(material.title)}</strong><em>{materialKindLabel(material.kind)}</em></header>
                <p>{publicBusinessText(material.description)}</p>
                <dl>
                  {material.fields.map((field) => (
                    <div key={field.fieldId}>
                      <dt>{publicBusinessText(field.label)}</dt>
                      <dd>{publicBusinessText(field.value)}{field.unit ? ` ${publicUnitLabel(field.unit)}` : ''}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </aside>

        <div className="practice-sheet">
          <div className="practice-sheet__top">
            <div><span className="eyebrow">工作纸</span><strong>{Object.keys(answer.responses).length} / {content.workItems.length} 项已填写</strong></div>
            <span className={saving ? 'is-saving' : ''}>
              {saving ? <><Clock3 size={15} /> 正在保存</> : <><Save size={15} /> {updatedAt ? '草稿已保存' : '自动保存已开启'}</>}
            </span>
          </div>
          <div className="work-items">
            {content.workItems.map((item, index) => {
              const value = answer.responses[item.workItemId] ?? '';
              const update = (next: string | number) => setAnswer((current) => ({
                responses: { ...current.responses, [item.workItemId]: next },
              }));
              return (
                <section className="work-item" key={item.workItemId}>
                  <span className="work-item__index">{String(index + 1).padStart(2, '0')}</span>
                  <div className="work-item__body">
                    <div className="work-item__title"><strong>{publicBusinessText(item.title)}</strong><em>{workItemTypeLabel(item.type)}</em></div>
                    <p>{publicBusinessText(item.instruction)}</p>
                    {item.response.kind === 'SELECT' ? (
                      <select id={`work-${item.workItemId}`} aria-label={publicBusinessText(item.title)} value={String(value)} onChange={(event) => update(event.target.value)} disabled={submitting}>
                        <option value="">{publicBusinessText(item.response.placeholder)}</option>
                        {item.response.options?.map((option) => <option value={option.optionId} key={option.optionId}>{publicBusinessText(option.text)}</option>)}
                      </select>
                    ) : item.response.kind === 'NUMBER' ? (
                      <label className="work-input work-input--number">
                        <input id={`work-${item.workItemId}`} aria-label={publicBusinessText(item.title)} type="number" step={item.response.precision ? 1 / (10 ** item.response.precision) : 1} value={value} placeholder={publicBusinessText(item.response.placeholder)} onChange={(event) => update(event.target.value === '' ? '' : Number(event.target.value))} disabled={submitting} />
                        {item.response.unit && <span>{publicUnitLabel(item.response.unit)}</span>}
                      </label>
                    ) : item.type === 'SHORT_TEXT' ? (
                      <textarea id={`work-${item.workItemId}`} aria-label={publicBusinessText(item.title)} value={String(value)} maxLength={500} placeholder={publicBusinessText(item.response.placeholder)} onChange={(event) => update(event.target.value)} disabled={submitting} />
                    ) : (
                      <input id={`work-${item.workItemId}`} aria-label={publicBusinessText(item.title)} type="text" value={String(value)} maxLength={100} placeholder={publicBusinessText(item.response.placeholder)} onChange={(event) => update(event.target.value)} disabled={submitting} />
                    )}
                  </div>
                </section>
              );
            })}
          </div>
          <div className="practice-sheet__footer">
            <p>{publicBusinessText(content.submissionNote)}</p>
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
                disabled={!complete || saving || submitting}
                onClick={() => setConfirming(true)}
              >
                <Send size={18} /> 提交综合实务
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirming && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="submit-title">
            <span className="modal__icon"><FileCheck2 /></span>
            <h2 id="submit-title">提交这份综合实务？</h2>
            <p>提交后，字段、计算、勾稽和结论会固定为正式快照并进入异步评分。</p>
            <div className="modal__actions">
              <button className="button button--ghost" type="button" onClick={() => setConfirming(false)}>
                返回检查
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
            <p>当前编辑内容仍保留在本地。请选择云端草稿，或保留当前编辑并保存。</p>
            <div className="conflict-preview">
              <div><strong>云端草稿</strong><pre>{answerPreview(content, conflict.server.answer ?? emptyAnswer)}</pre></div>
              <div><strong>当前编辑</strong><pre>{answerPreview(content, conflict.localAnswer)}</pre></div>
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
            <h2>当前草稿尚未保存</h2>
            <p>自动保存还未完成，离开可能丢失刚输入的字段。</p>
            <div className="modal__actions">
              <button className="button button--ghost" type="button" onClick={() => navigationBlocker.reset()}>
                留在这里
              </button>
              <button className="button button--secondary" type="button" onClick={() => navigationBlocker.proceed()}>
                不保存，仍然离开
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
    document.title = route ? `${publicBusinessText(route.title)} · 托管智训营` : '路线学习 · 托管智训营';
  }, [route]);

  const activeIndex = stepOrder.indexOf(active);
  const previous = activeIndex > 0
    ? [...stepOrder].slice(0, activeIndex).reverse().find((type) =>
      route?.steps.find((item) => item.stepType === type)?.accessible)
    : undefined;

  function selectStep(type: StepType) {
    navigate(`/learn/${encodeURIComponent(routeId)}?step=${type}`);
  }

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
    setActive('COMPREHENSIVE_PRACTICE');
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
              <RouteStepper route={route} active={active} onSelect={selectStep} />
            </div>
          </div>
          {error && (
            <ErrorState error={error} compact onRetry={() => setStepReload((value) => value + 1)} />
          )}
          {loadingStep && <LoadingState label="正在读取当前学习环节…" />}
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
          {loadingRoute && <LoadingState label="正在读取路线状态…" />}
          {error && !route && <ErrorState error={error} onRetry={() => void refreshRoute(true)} />}
          {route && (
            <>
              <header className="learning-header">
                <div>
                  <span className="eyebrow">核算路线 · 预计 {route.estimatedMinutes ?? 20} 分钟</span>
                  <h1>{publicBusinessText(route.title)}</h1>
                  <p>{publicBusinessText(route.summary ?? '')}</p>
                </div>
                <RouteStepper route={route} active={active} onSelect={selectStep} />
              </header>

              {error && <ErrorState error={error} compact onRetry={() => setStepReload((value) => value + 1)} />}
              {loadingStep && <LoadingState label="正在读取当前学习环节…" />}
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
              {!loadingStep && validStep?.stepType === 'COMPREHENSIVE_PRACTICE' && (
                <ComprehensivePracticeStep
                  route={route}
                  data={validStep as StepResponse<'COMPREHENSIVE_PRACTICE'>}
                />
              )}

              {active !== 'COMPREHENSIVE_PRACTICE' && (
                <div className="lesson-bottom-bar">
                  <button
                    className="button button--ghost"
                    type="button"
                    disabled={!previous}
                    onClick={() => previous && selectStep(previous)}
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
