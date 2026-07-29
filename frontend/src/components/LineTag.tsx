import { LINE_META } from '../domain/labels';

/** 业务路线小标签 */
export function LineTag({ line }: { line: string }) {
  const meta = (LINE_META as Record<string, { short: string; color: string; soft: string }>)[line];
  if (!meta) {
    return (
      <span className="tag" style={{ background: 'var(--paper-deep)', color: 'var(--ink-soft)' }}>
        {line}
      </span>
    );
  }
  return (
    <span className="tag" style={{ background: meta.soft, color: meta.color }}>
      {meta.short}条线
    </span>
  );
}

/** 占位演示内容标识 */
export function DemoTag() {
  return (
    <span className="tag tag-demo" title="当前为演示占位内容，正式内容以业务部门发布为准">
      演示内容
    </span>
  );
}
