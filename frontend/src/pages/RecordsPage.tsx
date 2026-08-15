import { ArrowRight, CalendarDays, Check, Filter, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrainingRecords } from '../api/client';
import type { Conclusion, Line, TrainingRecordPage } from '../api/types';
import { AppShell } from '../components/AppShell';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { dimensionLabels, formatDate, lineLabels } from '../utils/format';

export function RecordsPage() {
  const navigate = useNavigate();
  const [line, setLine] = useState<Line | ''>('');
  const [conclusion, setConclusion] = useState<Conclusion | ''>('');
  const [page, setPage] = useState(0);
  const [records, setRecords] = useState<TrainingRecordPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    document.title = '我的训练记录 · 托管智训营';
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getTrainingRecords({
      page,
      size: 10,
      line: line || undefined,
      conclusion: conclusion || undefined,
    })
      .then((value) => active && setRecords(value))
      .catch((reason) => active && setError(reason as Error))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [conclusion, line, page]);

  return (
    <AppShell
      backLabel="返回学习世界"
      onBack={() => navigate('/worlds')}
      context="我的训练记录"
    >
      <div className="records-page page-enter">
        <header className="records-header">
          <div>
            <span className="eyebrow">正式作答记录</span>
            <h1>我的训练记录</h1>
            <p>共 {records?.totalElements ?? '—'} 次正式提交 · 查看作答快照、评分证据和提交时的路线状态。</p>
          </div>
        </header>

        <section className="record-filters">
          <span><Filter size={18} /> 筛选</span>
          <label>
            <span>业务线</span>
            <select value={line} onChange={(event) => { setLine(event.target.value as Line | ''); setPage(0); }}>
              <option value="">全部业务线</option>
              {Object.entries(lineLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            <span>提交结论</span>
            <select value={conclusion} onChange={(event) => { setConclusion(event.target.value as Conclusion | ''); setPage(0); }}>
              <option value="">全部结论</option>
              <option value="PASSED">已通过</option>
              <option value="LEARNED_NOT_MASTERED">需补学</option>
            </select>
          </label>
        </section>

        {loading && <LoadingState label="正在读取训练记录…" />}
        {error && <ErrorState error={error} />}
        {records && !records.items.length && (
          <EmptyState title="还没有符合条件的记录" description="完成一次综合实务提交后，记录会出现在这里。" />
        )}
        {records && records.items.length > 0 && (
          <section className="records-list" data-testid="records-list">
            {records.items.map((record) => {
              const passed = record.conclusion === 'PASSED';
              return (
                <article key={record.attemptId} className="record-row">
                  <div className={`record-row__status ${passed ? 'is-passed' : 'is-review'}`}>
                    {passed ? <Check /> : <RotateCcw />}
                  </div>
                  <div className="record-row__main">
                    <span className="record-path">{record.path}</span>
                    <h2>{record.routeTitle}</h2>
                    <div className="record-meta">
                      <span><CalendarDays size={16} /> {formatDate(record.submittedAt)}</span>
                      <span className={passed ? 'tag tag--passed' : 'tag tag--review'}>
                        {record.processingStatus === 'SCORING'
                          ? '评分处理中'
                          : record.processingStatus === 'FAILED'
                            ? '评分未完成（技术问题）'
                          : passed ? '本次已通过' : '本次需补学'}
                      </span>
                    </div>
                  </div>
                  <div className="record-row__score">
                    <strong>{record.totalScore ?? '—'}</strong><span>/ 100</span>
                  </div>
                  <div className="record-row__dimensions">
                    {record.dimensionSummary?.map((item) => (
                      <span key={item.dimension}>
                        {dimensionLabels[item.dimension]} {item.score}/{item.maxScore}
                      </span>
                    ))}
                  </div>
                  <button
                    className="record-row__open"
                    type="button"
                    onClick={() => navigate(
                      record.processingStatus === 'COMPLETED'
                        ? `/records/${record.attemptId}`
                        : `/attempts/${record.attemptId}`,
                    )}
                  >
                    查看详情 <ArrowRight size={18} />
                  </button>
                </article>
              );
            })}
          </section>
        )}

        {records && records.totalPages > 1 && (
          <div className="pagination">
            <button className="button button--ghost" type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
              上一页
            </button>
            <span>第 {page + 1} / {records.totalPages} 页</span>
            <button className="button button--ghost" type="button" disabled={page + 1 >= records.totalPages} onClick={() => setPage((value) => value + 1)}>
              下一页
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
