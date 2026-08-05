import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAttempt, retryScoring } from '../api/client';
import type { AttemptResponse } from '../api/types';
import { AppShell } from '../components/AppShell';
import { Mascot } from '../components/Mascot';
import { ResultView } from '../components/ResultView';
import { ErrorState, LoadingState } from '../components/States';

export function AttemptPage() {
  const { attemptId = '' } = useParams();
  const id = Number(attemptId);
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<AttemptResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await getAttempt(id);
      setAttempt(result);
      return result;
    } catch (reason) {
      setError(reason as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (attempt?.processingStatus !== 'SCORING') return;
    const timer = window.setInterval(() => void load(), 800);
    return () => window.clearInterval(timer);
  }, [attempt?.processingStatus, load]);

  useEffect(() => {
    document.title = attempt?.processingStatus === 'COMPLETED'
      ? '评分结果 · 托管智训营'
      : '评分中 · 托管智训营';
  }, [attempt?.processingStatus]);

  async function handleRetry() {
    setRetrying(true);
    setError(null);
    try {
      setAttempt(await retryScoring(id));
    } catch (reason) {
      setError(reason as Error);
    } finally {
      setRetrying(false);
    }
  }

  return (
    <AppShell
      backLabel="返回核算地图"
      onBack={() => navigate('/map/accounting')}
      context="综合实务评分"
    >
      <div className="attempt-page page-enter">
        {loading && <LoadingState label="正在读取本次正式作答…" />}
        {error && <ErrorState error={error} onRetry={() => void load()} />}

        {attempt?.processingStatus === 'SCORING' && (
          <section className="scoring-wait" data-testid="scoring-wait">
            <div className="scoring-orbit" aria-hidden="true">
              <span /><span /><span />
              <Mascot pose="SCORING_WAIT" size="large" />
            </div>
            <span className="eyebrow">正式作答已安全保存</span>
            <h1>小托正在整理你的四维反馈</h1>
            <p>我们会核对概念理解、处理步骤、风险意识与表达规范。查询期间不会重复评分。</p>
            <div className="scoring-progress">
              <span />
              <strong>评分生成中</strong>
            </div>
            <button className="button button--ghost" type="button" onClick={() => navigate('/map/accounting')}>
              <ArrowLeft size={18} /> 先返回地图
            </button>
          </section>
        )}

        {attempt?.processingStatus === 'FAILED' && (
          <section className="scoring-failed">
            <Mascot pose="RESULT_SUPPORT" size="medium" />
            <span className="eyebrow">技术评分未完成</span>
            <h1>答案还在，重新启动评分即可</h1>
            <p>这不是学习结论，也不会生成新的训练记录。我们会继续使用同一份正式作答。</p>
            <button
              className="button button--primary"
              type="button"
              onClick={() => void handleRetry()}
              disabled={retrying}
            >
              <RefreshCw size={19} /> {retrying ? '正在重试…' : '重试原作答评分'}
            </button>
          </section>
        )}

        {attempt?.processingStatus === 'COMPLETED' && (
          <ResultView
            attempt={attempt}
            actions={
              attempt.result?.conclusion === 'PASSED' ? (
                <>
                  <button className="button button--primary" type="button" onClick={() => navigate('/map/accounting')}>
                    返回地图继续学习 <ArrowRight size={19} />
                  </button>
                  <button className="button button--secondary" type="button" onClick={() => navigate(`/learn/${attempt.routeId}`)}>
                    再次复习路线
                  </button>
                </>
              ) : (
                <button
                  className="button button--primary"
                  type="button"
                  onClick={() =>
                    navigate(
                      attempt.allowedActions.includes('RETRY_COMPREHENSIVE_PRACTICE')
                        ? `/learn/${attempt.routeId}?step=COMPREHENSIVE_PRACTICE`
                        : `/attempts/${attempt.attemptId}/remediation`,
                    )
                  }
                >
                  {attempt.allowedActions.includes('RETRY_COMPREHENSIVE_PRACTICE') ? '重新完成综合实务' : '开始定向补学'}
                  <ArrowRight size={19} />
                </button>
              )
            }
          />
        )}
      </div>
    </AppShell>
  );
}
