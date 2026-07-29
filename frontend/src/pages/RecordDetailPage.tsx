import { ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTrainingRecord } from '../api/client';
import { AppShell } from '../components/AppShell';
import { ResultView } from '../components/ResultView';
import { ErrorState, LoadingState } from '../components/States';
import { useAsync } from '../hooks/useAsync';
import { formatDate } from '../utils/format';

export function RecordDetailPage() {
  const { attemptId = '' } = useParams();
  const id = Number(attemptId);
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(() => getTrainingRecord(id), [id]);

  useEffect(() => {
    document.title = '训练记录详情 · 托管智训营';
  }, []);

  return (
    <AppShell
      backLabel="返回训练记录"
      onBack={() => navigate('/records')}
      context="历史评分快照"
    >
      <div className="record-detail-page page-enter">
        {loading && <LoadingState label="正在读取历史评分快照…" />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {data?.processingStatus === 'COMPLETED' && (
          <>
            <header className="record-detail-header">
              <span className="eyebrow">不可修改的历史记录</span>
              <h1>站上核算岗</h1>
              <p>核算条线 / 核算基础与产品生命周期 / 岗位基础 / 站上核算岗</p>
              <span>{formatDate(data.submittedAt)}</span>
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
                      继续本次补学 <ArrowRight size={18} />
                    </button>
                  )}
                  <button className="button button--secondary" type="button" onClick={() => navigate(`/learn/${data.routeId}`)}>
                    返回路线复习
                  </button>
                </>
              }
            />
          </>
        )}
        {data?.processingStatus !== 'COMPLETED' && data && (
          <section className="state-panel">
            <strong>{data.processingStatus === 'FAILED' ? '本次评分遇到技术问题' : '本次作答仍在评分'}</strong>
            <p>答案和正式记录都已保存，请前往评分状态页继续处理。</p>
            <button className="button button--primary" type="button" onClick={() => navigate(`/attempts/${data.attemptId}`)}>
              前往评分状态
            </button>
          </section>
        )}
      </div>
    </AppShell>
  );
}
