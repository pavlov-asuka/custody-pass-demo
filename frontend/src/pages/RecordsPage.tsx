import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { formatDateTime, reviewerModeLabel } from '../domain/labels';
import { LineTag } from '../components/LineTag';
import { EmptyState, ErrorState, PageLoading } from '../components/States';
import { Mascot } from '../components/Mascot';
import './records.css';

const PAGE_SIZE = 10;

export function RecordsPage() {
  const [page, setPage] = useState(0);
  const { data, loading, error, reload } = useAsync(
    () => api.listRecords(page, PAGE_SIZE),
    [page],
  );

  if (loading && !data) {
    return (
      <div>
        <header className="page-head">
          <h1 className="page-title">训练记录</h1>
          <p className="page-sub">每一次作答与评分结果都会留在这里，方便回看与复盘</p>
        </header>
        <PageLoading text="正在读取训练记录…" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <header className="page-head">
          <h1 className="page-title">训练记录</h1>
        </header>
        <ErrorState title="训练记录加载失败" message={error.message} onRetry={reload} />
      </div>
    );
  }

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;
  const total = data?.totalElements ?? 0;

  return (
    <div>
      <header className="page-head rise-in">
        <h1 className="page-title">训练记录</h1>
        <p className="page-sub">
          每一次作答与评分结果都会留在这里，方便回看与复盘{total > 0 ? `（共 ${total} 条）` : ''}
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          title="还没有训练记录"
          desc="去完成第一个案例，这里就会留下你的成长轨迹"
          action={
            <Link to="/" className="btn btn-primary btn-sm">
              去学习地图
            </Link>
          }
        />
      ) : (
        <>
          <div className="record-list">
            {items.map((r, i) => {
              const rate = r.totalMaxScore > 0 ? r.totalScore / r.totalMaxScore : 0;
              const tone = rate >= 0.8 ? 'var(--ok)' : rate >= 0.6 ? 'var(--blue)' : 'var(--danger)';
              return (
                <Link
                  key={r.recordId}
                  to={`/records/${r.recordId}`}
                  className="record-row card rise-in"
                  style={{ animationDelay: `${Math.min(i, 6) * 0.05}s`, ['--row-color' as string]: tone }}
                >
                  <div className="record-row-main">
                    <div className="record-row-title-line">
                      <LineTag line={r.caseLine} />
                      <h3 className="record-row-title">{r.caseTitle}</h3>
                    </div>
                    <p className="record-row-time num">{formatDateTime(r.submittedAt)}</p>
                  </div>
                  <div className="record-row-side">
                    <span className="tag record-mode-tag">{reviewerModeLabel(r.reviewerMode)}</span>
                    <div className="record-score num">
                      <strong style={{ color: tone }}>{r.totalScore}</strong>
                      <span>/ {r.totalMaxScore}</span>
                      <div className="record-score-bar">
                        <i style={{ width: `${Math.round(rate * 100)}%`, background: tone }} />
                      </div>
                    </div>
                    <ChevronRight size={17} className="record-row-arrow" />
                  </div>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <nav className="pager" aria-label="分页">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft size={15} />
                上一页
              </button>
              <span className="pager-info num">
                第 {page + 1} / {totalPages} 页
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages - 1 || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
                <ChevronRight size={15} />
              </button>
            </nav>
          )}

          {loading && <p className="pager-loading">正在翻页…</p>}
        </>
      )}

      <div className="records-mascot-note">
        <Mascot size={44} mood="idle" shadow={false} />
        <p>小托建议：隔一段时间回看旧记录，对比前后作答，你会看到清晰的进步。</p>
      </div>
    </div>
  );
}
