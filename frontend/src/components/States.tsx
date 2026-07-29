import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react';
import { ApiError } from '../api/client';
import { Mascot } from './Mascot';

export function LoadingState({ label = '正在准备学习内容…' }: { label?: string }) {
  return (
    <div className="state-panel" data-testid="loading-state">
      <LoaderCircle className="spin" size={34} />
      <strong>{label}</strong>
    </div>
  );
}
export function ErrorState({
  error,
  onRetry,
  compact = false,
}: {
  error: Error;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const message = error instanceof ApiError ? error.message : '页面暂时开小差了，请稍后重试。';
  return (
    <div className={`state-panel state-panel--error ${compact ? 'state-panel--compact' : ''}`}>
      {!compact && <Mascot pose="RESULT_SUPPORT" size="small" />}
      <AlertTriangle size={28} />
      <strong>{message}</strong>
      {onRetry && (
        <button className="button button--secondary" type="button" onClick={onRetry}>
          <RefreshCw size={18} /> 再试一次
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="state-panel">
      <Mascot pose="GUIDE_POINT" size="small" />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
