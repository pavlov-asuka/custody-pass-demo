import { ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getRoute, getTrainingRecord } from '../api/client';
import { AppShell } from '../components/AppShell';
import { ResultView } from '../components/ResultView';
import { ErrorState, LoadingState } from '../components/States';
import { useAsync } from '../hooks/useAsync';
import { formatDate, lineLabels, routeStateLabels } from '../utils/format';

export function RecordDetailPage() {
  const { attemptId = '' } = useParams();
  const id = Number(attemptId);
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(() => getTrainingRecord(id), [id]);
  const routeId = data?.routeId ?? '';
  const { data: route } = useAsync(
    () => routeId ? getRoute(routeId) : Promise.resolve(null),
    [routeId],
  );

  useEffect(() => {
    document.title = '训练记录详情 · 托管智训营';
  }, []);

  return (
    <AppShell
      backLabel="返回训练记录"
      onBack={() => navigate('/records')}
      context="历史作答记录"
    >
      <div className="record-detail-page page-enter">
        {loading && <LoadingState label="正在读取历史提交…" />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {data?.processingStatus === 'COMPLETED' && (
          <>
            <header className="record-detail-header">
              <div className="record-detail-header__status">
                  <span className="tag">历史记录（不可修改）</span>
                  <span className={`tag ${data.result?.conclusion === 'PASSED' ? 'tag--passed' : 'tag--review'}`}>
                  历史结论：{data.result?.conclusion === 'PASSED' ? '本次已通过' : '需补学'}
                </span>
                {data.currentRouteState && (
                  <span className="tag tag--current">路线当前：{routeStateLabels[data.currentRouteState]}</span>
                )}
              </div>
              <h1>{route?.title ?? '路线训练记录'}</h1>
              <p>{route ? `${lineLabels[route.line]}条线` : '业务条线'} / {route?.title ?? '历史路线'}</p>
              <span>提交时间：{formatDate(data.submittedAt)}</span>
            </header>
            <ResultView
              attempt={data}
              historical
              actions={
                <>
                  {data.allowedActions.includes('START_REMEDIATION') && (
                    <button
                      className="button button--primary"
                      type="button"
                      onClick={() => navigate(`/attempts/${data.attemptId}/remediation`)}
                    >
                      继续补学目标 <ArrowRight size={18} />
                    </button>
                  )}
                  <button className="button button--secondary" type="button" onClick={() => navigate(`/learn/${data.routeId}`)}>
                    返回路线
                  </button>
                </>
              }
            />
          </>
        )}
        {data?.processingStatus !== 'COMPLETED' && data && (
          <section className="state-panel">
            <strong>{data.processingStatus === 'FAILED' ? '本次评分遇到技术问题' : '本次作答正在评分'}</strong>
            <p>作答和记录已保存，请打开评分状态查看结果。</p>
            <button className="button button--primary" type="button" onClick={() => navigate(`/attempts/${data.attemptId}`)}>
              查看评分状态
            </button>
          </section>
        )}
      </div>
    </AppShell>
  );
}
