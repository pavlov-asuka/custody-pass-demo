import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CircleAlert, Clock3, FileText, ListChecks, ScrollText, SendHorizontal, ShieldCheck, SignalHigh } from 'lucide-react';
import { ApiError, api, newClientRequestId } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { LINE_META, difficultyLabel } from '../domain/labels';
import { DemoTag, LineTag } from '../components/LineTag';
import { Mascot } from '../components/Mascot';
import { ErrorState, PageLoading } from '../components/States';
import './case.css';

const MAX_ANSWER = 12000;
const REVIEW_MIN_MS = 1400;

const REVIEW_PHASES = ['小托正在阅读你的作答…', '正在核对关键要点…', '正在整理四维反馈…'];

export function CasePage() {
  const { caseId = '' } = useParams();
  const navigate = useNavigate();
  const { data: caseDetail, loading, error, reload } = useAsync(() => api.getCase(caseId), [caseId]);

  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; conflict: boolean } | null>(null);
  const [phaseIdx, setPhaseIdx] = useState(0);

  /** 幂等键与生成该键时的答案（trim 后）：答案实质修改才换新键，网络重试复用原键 */
  const idemRef = useRef<{ id: string; answerAtId: string }>({ id: newClientRequestId(), answerAtId: '' });

  useEffect(() => {
    if (!submitting) return;
    setPhaseIdx(0);
    const timer = window.setInterval(() => setPhaseIdx((i) => (i + 1) % REVIEW_PHASES.length), 1100);
    return () => window.clearInterval(timer);
  }, [submitting]);

  const trimmed = answer.trim();
  const answerTooLong = trimmed.length > MAX_ANSWER;
  const canSubmit = !submitting && trimmed.length > 0 && !answerTooLong;

  async function handleSubmit() {
    if (!caseDetail || !canSubmit) return;
    // 幂等判断以 trim 后的文本为准：实质修改才生成新 clientRequestId
    if (idemRef.current.answerAtId !== trimmed) {
      idemRef.current = { id: newClientRequestId(), answerAtId: trimmed };
    }
    const requestId = idemRef.current.id;

    setSubmitting(true);
    setSubmitError(null);
    const startedAt = Date.now();
    try {
      const detail = await api.submitAnswer(caseDetail.id, requestId, trimmed);
      const elapsed = Date.now() - startedAt;
      if (elapsed < REVIEW_MIN_MS) {
        await new Promise((r) => window.setTimeout(r, REVIEW_MIN_MS - elapsed));
      }
      navigate(`/records/${detail.recordId}`, { state: { detail, fresh: true } });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isConflict) {
          setSubmitError({
            conflict: true,
            message: '该请求标识已对应另一份提交。你的答案已保留，请修改后再提交。',
          });
        } else if (err.isUnauthorized) {
          setSubmitError({ conflict: false, message: '登录已失效，请重新登录后再提交' });
        } else if (err.status === 403) {
          setSubmitError({ conflict: false, message: '安全校验失败，请稍后重试' });
        } else {
          setSubmitError({ conflict: false, message: '评分服务暂时不可用，你的答案已保留，请稍后重试' });
        }
      } else {
        setSubmitError({ conflict: false, message: '提交失败，你的答案已保留，请稍后重试' });
      }
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoading text="正在打开案例…" />;
  if (error || !caseDetail) {
    return (
      <div>
        <Link to="/" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
          <ArrowLeft size={15} />
          返回学习地图
        </Link>
        <ErrorState
          title={error instanceof ApiError && error.isNotFound ? '案例不存在' : '案例加载失败'}
          message={error?.message}
          onRetry={reload}
        />
      </div>
    );
  }

  const meta = LINE_META[caseDetail.line];

  return (
    <div className="case-page" style={{ ['--route-color' as string]: meta.color }}>
      {/* 案例头 */}
      <header className="case-head card rise-in">
        <div className="case-head-main">
          <div className="case-head-tags">
            <LineTag line={caseDetail.line} />
            {caseDetail.placeholder && <DemoTag />}
          </div>
          <h1 className="case-title">{caseDetail.title}</h1>
          <div className="case-meta-row">
            <span>
              <SignalHigh size={13} />
              难度 · {difficultyLabel(caseDetail.difficulty)}
            </span>
            <span>
              <Clock3 size={13} />
              约 {caseDetail.estimatedMinutes} 分钟
            </span>
          </div>
        </div>
        <Link to="/" className="btn btn-ghost btn-sm case-back">
          <ArrowLeft size={15} />
          返回地图
        </Link>
      </header>

      <div className="case-layout">
        {/* 材料 */}
        <article className="case-material card rise-in rise-in-1">
          <section className="case-section">
            <h2 className="case-section-title">
              <span className="case-section-no">
                <FileText size={12} />
              </span>
              案例背景
            </h2>
            <div className="case-background">
              {caseDetail.background.split(/\n+/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>

          <section className="case-section">
            <h2 className="case-section-title">
              <span className="case-section-no">
                <ListChecks size={12} />
              </span>
              作答任务
            </h2>
            <ol className="case-tasks">
              {caseDetail.tasks.map((task, i) => (
                <li key={i}>
                  <span className="case-task-no num">{i + 1}</span>
                  <span>{task}</span>
                </li>
              ))}
            </ol>
          </section>
        </article>

        {/* 作答 */}
        <aside className="case-answer rise-in rise-in-2">
          <div className="case-answer-card card">
            <div className="case-answer-coach">
              <Mascot size={52} mood={submitting ? 'thinking' : 'idle'} shadow={false} />
              <p>
                {submitting
                  ? '小托正在评卷，请稍等片刻…'
                  : '按任务逐条写出你的处理思路，写清步骤和依据比速度更重要。'}
              </p>
            </div>

            <div className="case-editor-wrap">
              <textarea
                className="case-editor"
                placeholder="在这里写下你的完整处理方案…"
                value={answer}
                maxLength={MAX_ANSWER + 200}
                disabled={submitting}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  if (submitError) setSubmitError(null);
                }}
              />
              <span className={`case-editor-count num${answerTooLong ? ' over' : ''}`}>
                {trimmed.length}/{MAX_ANSWER}
              </span>
            </div>

            {submitError && (
              <div className="form-error" role="alert" style={{ marginTop: 12 }}>
                <CircleAlert size={15} style={{ flex: 'none', marginTop: 2 }} />
                {submitError.message}
              </div>
            )}

            <div className="case-answer-actions">
              <Link to="/" className="btn btn-ghost">
                先放一放
              </Link>
              <button type="button" className="btn btn-primary case-submit" disabled={!canSubmit} onClick={handleSubmit}>
                {submitting ? (
                  <>
                    <span className="btn-spinner" aria-hidden="true" />
                    评分中…
                  </>
                ) : (
                  <>
                    <SendHorizontal size={15} />
                    提交答案
                  </>
                )}
              </button>
            </div>

            <p className="case-answer-note">
              <ShieldCheck size={13} />
              提交前可反复修改；若网络异常未出结果，可直接再次提交，不会产生重复记录
            </p>
          </div>
        </aside>
      </div>

      {/* 评分等待浮层 */}
      {submitting && (
        <div className="review-overlay" role="alert" aria-busy="true">
          <div className="review-panel card">
            <Mascot size={96} mood="thinking" />
            <p className="review-phase" key={phaseIdx}>
              {REVIEW_PHASES[phaseIdx]}
            </p>
            <div className="review-bar">
              <i />
            </div>
            <p className="review-tip">
              <ScrollText size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
              评卷完成后将自动生成四维能力反馈
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
