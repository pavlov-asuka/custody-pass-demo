import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookMarked,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Lightbulb,
  Map as MapIcon,
  Quote,
  RotateCcw,
  ScrollText,
  Sparkles,
} from 'lucide-react';
import type { TrainingRecordDetail } from '../api/types';
import { DIMENSION_META, formatDateTime, reviewerModeLabel } from '../domain/labels';
import { DemoTag, LineTag } from './LineTag';
import { ScoreRing } from './ScoreRing';
import { Mascot } from './Mascot';
import './result.css';

interface ResultViewProps {
  detail: TrainingRecordDetail;
  /** 提交后首次进入：播放揭晓动效 */
  fresh?: boolean;
  /** 该记录对应的案例是否为占位演示内容 */
  placeholder?: boolean;
}

function scoreVerdict(rate: number): { text: string; mood: 'cheer' | 'idle' | 'thinking' } {
  if (rate >= 0.8) return { text: '出色的作答！关键要点覆盖得很扎实，继续保持这种思路。', mood: 'cheer' };
  if (rate >= 0.6) return { text: '主干思路是对的，再看看下面的遗漏点，补上就更完整了。', mood: 'idle' };
  return { text: '这次还有不少要点没覆盖到，别灰心，照着学习建议再练一次。', mood: 'thinking' };
}

function rateTone(rate: number): string {
  if (rate >= 0.8) return 'var(--ok)';
  if (rate >= 0.6) return 'var(--blue)';
  return 'var(--danger)';
}

export function ResultView({ detail, fresh = false, placeholder = false }: ResultViewProps) {
  const [openDims, setOpenDims] = useState<Set<string>>(new Set());
  const [showAnswer, setShowAnswer] = useState(false);
  const [revealed, setRevealed] = useState(!fresh);

  useEffect(() => {
    if (!fresh) return;
    const t = window.setTimeout(() => setRevealed(true), 60);
    return () => window.clearTimeout(t);
  }, [fresh]);

  const rate = detail.totalMaxScore > 0 ? detail.totalScore / detail.totalMaxScore : 0;
  const verdict = useMemo(() => scoreVerdict(rate), [rate]);

  const missedSet = useMemo(() => new Set(detail.missedPointIds), [detail.missedPointIds]);

  function toggleDim(key: string) {
    setOpenDims((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className={`result-wrap${revealed ? ' revealed' : ''}`}>
      {/* 总览 */}
      <section className="result-hero card">
        <div className="result-hero-main">
          <div className="result-hero-tags">
            <LineTag line={detail.caseLine} />
            {placeholder && <DemoTag />}
            <span className="tag" style={{ background: 'var(--bg-deep)', color: 'var(--ink-soft)' }}>
              {reviewerModeLabel(detail.reviewerMode)}
            </span>
          </div>
          <h1 className="result-case-title">{detail.caseTitle}</h1>
          <p className="result-submitted num">提交于 {formatDateTime(detail.submittedAt)}</p>
          <p className="result-xp num">
            <Sparkles size={13} />
            本次训练获得经验值 +{detail.totalScore} XP
          </p>

          <div className="result-verdict">
            <Mascot size={54} mood={verdict.mood} shadow={false} />
            <p>{verdict.text}</p>
          </div>

          <div className="result-hero-actions">
            <Link to={`/cases/${detail.caseId}`} className="btn btn-primary btn-sm">
              <RotateCcw size={14.5} />
              再练一次
            </Link>
            <Link to="/" className="btn btn-ghost btn-sm">
              <MapIcon size={14.5} />
              返回学习地图
            </Link>
            <Link to="/records" className="btn btn-ghost btn-sm">
              <ScrollText size={14.5} />
              训练记录
            </Link>
          </div>
        </div>

        <div className="result-hero-score">
          <ScoreRing score={detail.totalScore} maxScore={detail.totalMaxScore} animate={fresh} />
          <div className="result-rate num" style={{ color: rateTone(rate) }}>
            得分率 {Math.round(rate * 100)}%
          </div>
          <div className="result-hit-count">
            命中 {detail.matchedPointIds.length} 点 · 遗漏 {detail.missedPointIds.length} 点
          </div>
        </div>
      </section>

      {/* 四维能力 */}
      <section className="result-section">
        <h2 className="result-section-title">四维能力反馈</h2>
        <div className="result-dims">
          {detail.dimensions.map((dim, idx) => {
            const meta = DIMENSION_META[dim.dimension];
            const dimRate = dim.maxScore > 0 ? dim.score / dim.maxScore : 0;
            const open = openDims.has(dim.dimension);
            const missedCount = dim.points.filter((p) => missedSet.has(p.pointId) || !p.matched).length;
            return (
              <article
                key={dim.dimension}
                className={`dim-card card rise-in rise-in-${Math.min(idx + 1, 4)}`}
                style={{ borderTop: `3px solid ${meta.color}` }}
              >
                <button
                  type="button"
                  className="dim-head"
                  onClick={() => toggleDim(dim.dimension)}
                  aria-expanded={open}
                >
                  <div className="dim-head-main">
                    <h3 className="dim-name">{meta.name}</h3>
                    <p className="dim-hint">{meta.hint}</p>
                  </div>
                  <div className="dim-score num">
                    <strong>{dim.score}</strong>
                    <span>/ {dim.maxScore}</span>
                  </div>
                </button>

                <div className="dim-bar" role="img" aria-label={`${meta.name}得分 ${dim.score}/${dim.maxScore}`}>
                  <i
                    style={{
                      width: revealed ? `${Math.round(dimRate * 100)}%` : '0%',
                      background: meta.color,
                    }}
                  />
                </div>

                <div className="dim-foot">
                  <span className={missedCount > 0 ? 'dim-missed' : 'dim-all-hit'}>
                    {missedCount > 0 ? `${missedCount} 个要点待补充` : '要点全部命中'}
                  </span>
                  <span className={`dim-toggle${open ? ' open' : ''}`}>
                    逐点明细
                    <ChevronDown size={14} />
                  </span>
                </div>

                {open && (
                  <ul className="dim-points">
                    {dim.points.map((p) => (
                      <li key={p.pointId} className={`dim-point${p.matched ? ' hit' : ' miss'}`}>
                        <span className="dim-point-icon">
                          {p.matched ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}
                        </span>
                        <div className="dim-point-body">
                          <p className="dim-point-desc">{p.description}</p>
                          {p.matched && p.evidence && (
                            <p className="dim-point-evidence">
                              <Quote size={11} />
                              {p.evidence}
                            </p>
                          )}
                          {!p.matched && <p className="dim-point-miss-tip">作答中未体现该要点</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* 学习建议 */}
      {detail.learningSuggestions.length > 0 && (
        <section className="result-section">
          <h2 className="result-section-title">
            <Lightbulb size={18} style={{ color: 'var(--gold)' }} />
            下一步学习建议
          </h2>
          <div className="result-suggestions">
            {detail.learningSuggestions.map((s, i) => (
              <div key={`${s.knowledgeTopicId}-${i}`} className="suggestion-card card rise-in" style={{ animationDelay: `${0.05 + i * 0.06}s` }}>
                <span className="suggestion-icon" aria-hidden="true">
                  <BookMarked size={17} />
                </span>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 我的作答 */}
      <section className="result-section">
        <button type="button" className="answer-toggle" onClick={() => setShowAnswer((v) => !v)} aria-expanded={showAnswer}>
          <span>查看我的作答原文</span>
          <ChevronDown size={16} className={showAnswer ? 'rotated' : ''} />
        </button>
        {showAnswer && (
          <div className="card answer-original">
            {detail.answer.split(/\n+/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
