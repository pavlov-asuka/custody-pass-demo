import { useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { BookOpen, CircleAlert, Quote, SendHorizontal } from 'lucide-react';
import { ApiError, api } from '../api/client';
import type { KnowledgeAnswer } from '../api/types';
import { useAsync } from '../hooks/useAsync';
import { LINE_META, answerModeLabel } from '../domain/labels';
import { DemoTag } from '../components/LineTag';
import { Mascot } from '../components/Mascot';
import './knowledge.css';

interface QAEntry {
  id: number;
  question: string;
  answer: KnowledgeAnswer | null;
  error: string | null;
}

const MIN_LEN = 2;
const MAX_LEN = 500;

export function KnowledgePage() {
  const topicsState = useAsync(() => api.listTopics(), []);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [entries, setEntries] = useState<QAEntry[]>([]);
  const idRef = useRef(0);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const trimmed = question.trim();
  const lenInvalid = trimmed.length > 0 && (trimmed.length < MIN_LEN || trimmed.length > MAX_LEN);
  const canAsk = !asking && trimmed.length >= MIN_LEN && trimmed.length <= MAX_LEN;

  const groupedTopics = useMemo(() => {
    const topics = topicsState.data ?? [];
    const groups = new Map<string, typeof topics>();
    const seenTitles = new Set<string>();
    for (const t of topics) {
      // 占位资产中同名主题可能有多条，目录按标题去重展示
      const dedupeKey = `${t.route}|${t.title}`;
      if (seenTitles.has(dedupeKey)) continue;
      seenTitles.add(dedupeKey);
      const list = groups.get(t.route) ?? [];
      list.push(t);
      groups.set(t.route, list);
    }
    return [...groups.entries()];
  }, [topicsState.data]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canAsk) return;
    const q = trimmed;
    idRef.current += 1;
    const id = idRef.current;
    setAsking(true);
    setQuestion('');
    setEntries((prev) => [...prev, { id, question: q, answer: null, error: null }]);
    window.setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 60);
    try {
      const answer = await api.askKnowledge(q);
      setEntries((prev) => prev.map((en) => (en.id === id ? { ...en, answer } : en)));
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.isUnauthorized
            ? '登录已失效，请重新登录后再提问'
            : err.message
          : '提问失败，请稍后重试';
      setEntries((prev) => prev.map((en) => (en.id === id ? { ...en, error: message } : en)));
    } finally {
      setAsking(false);
      window.setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 60);
    }
  }

  return (
    <div className="kb-layout">
      {/* 主题目录 */}
      <aside className="kb-side rise-in">
        <div className="card kb-topics">
          <div className="kb-topics-head">
            <h2 className="kb-topics-title">
              <BookOpen size={16} />
              知识主题
            </h2>
            <DemoTag />
          </div>
          {topicsState.loading && (
            <div className="kb-topics-loading">
              <div className="skeleton" style={{ height: 18, marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 18, width: '80%', marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 18, width: '64%' }} />
            </div>
          )}
          {topicsState.error && (
            <div className="kb-topics-error">
              <p>{topicsState.error.message}</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={topicsState.reload}>
                重试
              </button>
            </div>
          )}
          {topicsState.data && topicsState.data.length === 0 && (
            <p className="kb-topics-empty">暂无已发布的知识主题</p>
          )}
          {groupedTopics.map(([route, topics]) => {
            const meta = (LINE_META as Record<string, { name: string; color: string }>)[route];
            return (
              <div key={route} className="kb-topic-group">
                <p className="kb-topic-route" style={{ color: meta?.color ?? 'var(--ink-faint)' }}>
                  {meta?.name ?? route}
                </p>
                <ul>
                  {topics.map((t) => (
                    <li key={t.topicId}>{t.title}</li>
                  ))}
                </ul>
              </div>
            );
          })}
          <p className="kb-topics-note">主题内容为演示占位材料，正式内容以业务部门发布为准</p>
        </div>
      </aside>

      {/* 问答主区 */}
      <section className="kb-main">
        <div className="kb-intro card rise-in">
          <Mascot size={58} mood="idle" shadow={false} />
          <div>
            <h1 className="kb-intro-title">问小托</h1>
            <p className="kb-intro-sub">
              围绕清算、核算、监督的托管业务知识提问。每次提问独立作答，回答附主题依据。
            </p>
          </div>
        </div>

        <div className="kb-entries">
          {entries.length === 0 && (
            <div className="kb-empty rise-in">
              <Mascot size={92} mood="wave" />
              <p className="kb-empty-title">有业务疑问，随时问小托</p>
              <p className="kb-empty-desc">
                例如：「部分交收时应先核对哪些信息？」「估值核算的日终流程有哪些关键步骤？」
              </p>
            </div>
          )}

          {entries.map((entry) => (
            <div key={entry.id} className="kb-entry rise-in">
              <div className="kb-q">
                <span className="kb-q-badge">我</span>
                <p>{entry.question}</p>
              </div>
              <div className="kb-a">
                <div className="kb-a-avatar">
                  <Mascot size={40} mood={entry.answer || entry.error ? 'idle' : 'thinking'} shadow={false} />
                </div>
                <div className="kb-a-body card">
                  {!entry.answer && !entry.error && (
                    <div className="kb-a-loading">
                      <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                      小托正在翻查知识库…
                    </div>
                  )}
                  {entry.error && (
                    <div className="kb-a-error">
                      <CircleAlert size={15} />
                      {entry.error}
                    </div>
                  )}
                  {entry.answer && (
                    <>
                      <div className="kb-a-answer">
                        {entry.answer.answer.split(/\n+/).map((p, i) => (
                          <p key={i}>{p}</p>
                        ))}
                      </div>
                      {entry.answer.insufficientKnowledge && (
                        <p className="kb-a-insufficient">
                          当前演示知识库暂未覆盖该问题，以上回答仅供参考
                        </p>
                      )}
                      <div className="kb-a-foot">
                        {entry.answer.citations.length > 0 && (
                          <div className="kb-a-citations">
                            <Quote size={12} />
                            {entry.answer.citations.map((c) => (
                              <span key={c.topicId} className="kb-cite">
                                {c.title}
                              </span>
                            ))}
                          </div>
                        )}
                        <span className="kb-a-mode">{answerModeLabel(entry.answer.answerMode)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={listEndRef} />
        </div>

        <form className="kb-ask card" onSubmit={submit}>
          <div className="kb-ask-inputwrap">
            <textarea
              className="kb-ask-input"
              rows={2}
              placeholder="输入你的业务问题（2-500 字）…"
              value={question}
              maxLength={MAX_LEN + 50}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit(e);
                }
              }}
            />
            <span className={`kb-ask-count num${lenInvalid ? ' over' : ''}`}>
              {question.length}/{MAX_LEN}
            </span>
          </div>
          <button type="submit" className="btn btn-primary kb-ask-btn" disabled={!canAsk}>
            {asking ? <span className="btn-spinner" aria-hidden="true" /> : <SendHorizontal size={15} />}
            提问
          </button>
        </form>
        {lenInvalid && <p className="kb-ask-warn">问题长度需在 {MIN_LEN}-{MAX_LEN} 字之间</p>}
      </section>
    </div>
  );
}
