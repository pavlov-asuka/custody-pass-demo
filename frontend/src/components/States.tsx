import type { ReactNode } from 'react';
import { Mascot } from './Mascot';

export function PageLoading({ text = '加载中…' }: { text?: string }) {
  return (
    <div className="state-block" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p className="state-desc">{text}</p>
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = '加载失败', message, onRetry }: ErrorStateProps) {
  return (
    <div className="state-block" role="alert">
      <Mascot size={76} mood="thinking" />
      <p className="state-title">{title}</p>
      <p className="state-desc">{message ?? '服务暂时不可用，请稍后重试'}</p>
      {onRetry && (
        <button type="button" className="btn btn-primary btn-sm" onClick={onRetry}>
          重新加载
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  desc?: string;
  action?: ReactNode;
}

export function EmptyState({ title, desc, action }: EmptyStateProps) {
  return (
    <div className="state-block">
      <Mascot size={84} mood="idle" />
      <p className="state-title">{title}</p>
      {desc && <p className="state-desc">{desc}</p>}
      {action}
    </div>
  );
}
