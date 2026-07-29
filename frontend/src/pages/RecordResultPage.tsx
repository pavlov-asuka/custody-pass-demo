import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ApiError, api } from '../api/client';
import type { TrainingRecordDetail } from '../api/types';
import { ResultView } from '../components/ResultView';
import { ErrorState, PageLoading } from '../components/States';

interface LocationState {
  detail?: TrainingRecordDetail;
  fresh?: boolean;
}

/** 结果页：提交后直接展示（fresh 动效），也支持按 recordId 回看（走接口） */
export function RecordResultPage() {
  const { recordId = '' } = useParams();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;

  const stateMatches = state.detail && String(state.detail.recordId) === String(recordId);

  const [detail, setDetail] = useState<TrainingRecordDetail | null>(stateMatches ? state.detail! : null);
  const [loading, setLoading] = useState(!stateMatches);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (stateMatches) {
      setDetail(state.detail!);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getRecord(Number(recordId))
      .then((d) => {
        if (!cancelled) {
          setDetail(d);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err : new ApiError(0, 'NETWORK_ERROR', '加载失败，请稍后重试'));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId, reloadTick]);

  if (loading) return <PageLoading text="正在整理评分结果…" />;

  if (error || !detail) {
    return (
      <div>
        <Link to="/records" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
          <ArrowLeft size={15} />
          返回训练记录
        </Link>
        <ErrorState
          title={error?.isNotFound ? '记录不存在' : '结果加载失败'}
          message={error?.isNotFound ? '该训练记录不存在，或不属于当前登录学员' : error?.message}
          onRetry={error?.isNotFound ? undefined : () => setReloadTick((t) => t + 1)}
        />
      </div>
    );
  }

  return (
    <div>
      <Link to={stateMatches && state.fresh ? '/' : '/records'} className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        <ArrowLeft size={15} />
        {stateMatches && state.fresh ? '返回学习地图' : '返回训练记录'}
      </Link>
      <ResultView detail={detail} fresh={Boolean(state.fresh)} placeholder={false} />
    </div>
  );
}
