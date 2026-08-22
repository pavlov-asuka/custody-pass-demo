import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleAlert,
  Lightbulb,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { answerPractice } from '../api/client';
import type {
  Line,
  PracticeFeedback,
  PracticeQuestion as Question,
  StepResponse,
} from '../api/types';
import {
  businessActionLabel,
  optionDisplayLabel,
  publicBusinessText,
  publicUnitLabel,
  practiceFeedbackLabel,
  practiceLedgerLabels,
} from '../utils/format';
import { requestId } from '../utils/ids';
import { Mascot } from './Mascot';

/**
 * 基础练习正式视觉母版
 * DESIGN 12 / 13.3：一屏一个问题；主列 720px；底部唯一主行动；
 * 选项未选 1—2px 浅灰边、已选 2px 蓝边淡蓝底、正确 2px 绿边淡绿底、
 * 错误 2px 红边淡红底；局部反馈贴近行动区，不做整页失败卡。
 * 保持提交、自动推进和错题重答的既定业务逻辑。
 */
export function PracticeSession({
  routeId,
  line,
  data,
  onCompleted,
}: {
  routeId: string;
  line?: Line;
  data: StepResponse<'BASIC_PRACTICE'>;
  onCompleted: () => Promise<void>;
}) {
  const content = data.content;
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const question = content.questions[index];

  useEffect(() => {
    setIndex(0);
    setFeedback(null);
  }, [data.contentVersion]);

  async function submit(answer: string[]) {
    setError(null);
    try {
      const result = await answerPractice(
        routeId,
        question.questionId,
        data.contentVersion,
        answer,
        requestId('practice'),
      );
      setFeedback(result);
      if (result.correct) {
        window.setTimeout(async () => {
          if (result.practiceCompleted) {
            await onCompleted();
          } else {
            setIndex((value) => Math.min(content.questions.length - 1, value + 1));
            setFeedback(null);
          }
        }, 650);
      }
    } catch (reason) {
      setError(reason as Error);
    }
  }

  return (
    <section className="practice-session" aria-label="基础练习">
      <div className="practice-session__body">
        <div className="practice-session__meta">
          <span className="practice-session__count">
            基础练习 · 第 {index + 1} / {content.questions.length} 题
          </span>
          <div className="practice-session__dots" aria-hidden="true">
            {content.questions.map((item, itemIndex) => (
              <span
                key={item.questionId}
                className={itemIndex < index ? 'is-done' : itemIndex === index ? 'is-current' : ''}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="practice-session__error" role="alert">
            <CircleAlert size={20} />
            <span>{error.message}</span>
          </div>
        )}

        <PracticeBody
          key={question.questionId}
          question={question}
          line={line}
          feedback={feedback}
          isLastQuestion={index === content.questions.length - 1}
          onSubmit={submit}
        />
      </div>
    </section>
  );
}

function PracticeBody({
  question,
  line,
  feedback,
  isLastQuestion,
  onSubmit,
}: {
  question: Question;
  line?: Line;
  feedback: PracticeFeedback | null;
  isLastQuestion: boolean;
  onSubmit: (answer: string[]) => Promise<void> | void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const isOrdering = question.type === 'ORDERING';
  const isStructured = ['FIELD_MAP', 'CALCULATION', 'LEDGER_ENTRY', 'RECONCILIATION', 'SHORT_TEXT']
    .includes(question.type);

  const initialOrder = useMemo(
    () => question.items?.map((item) => item.itemId) ?? [],
    [question.items],
  );
  const structuredSize = useMemo(() => {
    if (question.type === 'FIELD_MAP') return question.fieldMappings?.length ?? 0;
    if (question.type === 'CALCULATION') return question.calculation?.fields.length ?? 0;
    if (question.type === 'LEDGER_ENTRY') return question.ledgerEntries?.length ?? 0;
    if (question.type === 'RECONCILIATION') return question.reconciliation?.fields.length ?? 0;
    return question.type === 'SHORT_TEXT' ? 1 : 0;
  }, [question]);

  useEffect(() => {
    setSelected(isOrdering ? initialOrder : isStructured ? Array(structuredSize).fill('') : []);
  }, [initialOrder, isOrdering, isStructured, question.questionId, structuredSize]);

  function toggle(value: string) {
    if (feedback?.correct) return;
    if (question.type === 'SINGLE_CHOICE') {
      setSelected([value]);
      return;
    }
    setSelected((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function updateValue(index: number, value: string) {
    if (feedback?.correct) return;
    setSelected((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  function move(orderIndex: number, direction: -1 | 1) {
    setSelected((current) => {
      const next = [...current];
      const target = orderIndex + direction;
      if (target < 0 || target >= next.length) return current;
      [next[orderIndex], next[target]] = [next[target], next[orderIndex]];
      return next;
    });
  }

  async function submit() {
    if (!selected.length) return;
    setSubmitting(true);
    try {
      await onSubmit(selected);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = selected.length > 0
    && selected.every((value) => value.trim().length > 0)
    && !submitting
    && !feedback?.correct;
  const wrongOnce = feedback && !feedback.correct;

  function renderStructuredInput() {
    if (question.type === 'FIELD_MAP') {
      return (
        <div className="practice-structured practice-structured--mapping">
          {question.fieldMappings?.map((field, fieldIndex) => (
            <div className="practice-structured__row" key={field.fieldId}>
              <div className="practice-structured__label">
                <strong>{publicBusinessText(field.label)}</strong>
                <span>来源：{publicBusinessText(field.source)}</span>
              </div>
              <select
                aria-label={publicBusinessText(field.label)}
                value={selected[fieldIndex] ?? ''}
                onChange={(event) => updateValue(fieldIndex, event.target.value)}
                disabled={Boolean(feedback?.correct)}
              >
                <option value="">选择对应业务含义</option>
                {field.options.map((option) => <option value={option.optionId} key={option.optionId}>{publicBusinessText(option.text)}</option>)}
              </select>
            </div>
          ))}
        </div>
      );
    }

    if (question.type === 'CALCULATION') {
      return (
        <div className="practice-structured practice-structured--calculation">
          {question.calculation?.fields.map((field, fieldIndex) => (
            <label className="practice-structured__row" key={field.fieldId}>
              <span className="practice-structured__label">
                <strong>{publicBusinessText(field.label)}</strong>
                <span>
                  {publicBusinessText(field.formula)}
                  {field.precision !== undefined && `；建议保留 ${field.precision} 位小数`}
                  {field.tolerance !== undefined && `；判定允许误差 ±${field.tolerance}`}
                </span>
              </span>
              <span className="practice-structured__control">
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label={publicBusinessText(field.label)}
                  value={selected[fieldIndex] ?? ''}
                  placeholder={publicBusinessText(field.placeholder)}
                  onChange={(event) => updateValue(fieldIndex, event.target.value)}
                  disabled={Boolean(feedback?.correct)}
                />
                <em>{publicUnitLabel(field.unit, { line, fieldId: field.fieldId, label: field.label })}</em>
              </span>
            </label>
          ))}
        </div>
      );
    }

    if (question.type === 'LEDGER_ENTRY') {
      const labels = practiceLedgerLabels(line);
      return (
        <div className="practice-structured practice-structured--ledger">
          <div className="practice-ledger__head"><span>{labels.direction}</span><span>{labels.source}</span><span>{labels.input}</span></div>
          {question.ledgerEntries?.map((entry, entryIndex) => (
            <label className="practice-ledger__row" key={entry.entryId}>
              <b>{businessActionLabel(entry.direction)}</b>
              <span><strong>{publicBusinessText(entry.label)}</strong><em>{publicBusinessText(entry.amount)}</em></span>
              <input
                type="text"
                aria-label={publicBusinessText(entry.label)}
                value={selected[entryIndex] ?? ''}
                placeholder={publicBusinessText(entry.placeholder)}
                onChange={(event) => updateValue(entryIndex, event.target.value)}
                disabled={Boolean(feedback?.correct)}
              />
            </label>
          ))}
        </div>
      );
    }

    if (question.type === 'RECONCILIATION') {
      return (
        <div className="practice-structured practice-structured--reconciliation">
          {question.reconciliation?.fields.map((field, fieldIndex) => (
            <label className="practice-structured__row" key={field.fieldId}>
              <span className="practice-structured__label">
                <strong>{publicBusinessText(field.label)}</strong>
                <span>
                  {publicBusinessText(field.formula)}
                  {field.precision !== undefined && `；建议保留 ${field.precision} 位小数`}
                  {field.tolerance !== undefined && `；判定允许误差 ±${field.tolerance}`}
                </span>
              </span>
              {field.kind === 'SELECT' ? (
                <select
                  aria-label={publicBusinessText(field.label)}
                  value={selected[fieldIndex] ?? ''}
                  onChange={(event) => updateValue(fieldIndex, event.target.value)}
                  disabled={Boolean(feedback?.correct)}
                >
                  <option value="">{publicBusinessText(field.placeholder)}</option>
                  {field.options?.map((option) => <option value={option.optionId} key={option.optionId}>{publicBusinessText(option.text)}</option>)}
                </select>
              ) : (
                <span className="practice-structured__control">
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label={publicBusinessText(field.label)}
                    value={selected[fieldIndex] ?? ''}
                    placeholder={publicBusinessText(field.placeholder)}
                    onChange={(event) => updateValue(fieldIndex, event.target.value)}
                    disabled={Boolean(feedback?.correct)}
                  />
                </span>
              )}
            </label>
          ))}
        </div>
      );
    }

    return (
      <label className="practice-structured practice-structured--text">
        <span className="practice-structured__text-label">{publicBusinessText(question.textInput?.label ?? '业务结论')}</span>
        <textarea
          aria-label={publicBusinessText(question.textInput?.label ?? '业务结论')}
          value={selected[0] ?? ''}
          placeholder={question.textInput?.placeholder ? publicBusinessText(question.textInput.placeholder) : undefined}
          maxLength={500}
          onChange={(event) => updateValue(0, event.target.value)}
          disabled={Boolean(feedback?.correct)}
        />
      </label>
    );
  }

  return (
    <div className="practice-body">
      <h2 className="practice-body__prompt">{publicBusinessText(question.prompt)}</h2>

      {isOrdering ? (
        <ol className="practice-ordering">
          {selected.map((id, orderIndex) => {
            const item = question.items?.find((entry) => entry.itemId === id);
            return (
              <li key={id}>
                <span className="practice-ordering__number">{orderIndex + 1}</span>
                <span className="practice-ordering__text">{item?.text ? publicBusinessText(item.text) : ''}</span>
                <span className="practice-ordering__controls">
                  <button
                    type="button"
                    aria-label={`上移「${item?.text ? publicBusinessText(item.text) : ''}」`}
                    onClick={() => move(orderIndex, -1)}
                    disabled={orderIndex === 0 || Boolean(feedback?.correct)}
                  >
                    <ArrowUp size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label={`下移「${item?.text ? publicBusinessText(item.text) : ''}」`}
                    onClick={() => move(orderIndex, 1)}
                    disabled={orderIndex === selected.length - 1 || Boolean(feedback?.correct)}
                  >
                    <ArrowDown size={18} />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      ) : isStructured ? renderStructuredInput() : (
        <div
          className="practice-options"
          role={question.type === 'SINGLE_CHOICE' ? 'radiogroup' : 'group'}
          aria-label="作答选项"
        >
          {question.options?.map((option, optionIndex) => {
            const active = selected.includes(option.optionId);
            const state = feedback
              ? active
                ? feedback.correct
                  ? 'is-correct'
                  : 'is-wrong'
                : ''
              : active
                ? 'is-selected'
                : '';
            return (
              <button
                key={option.optionId}
                type="button"
                className={`practice-option ${state}`}
                onClick={() => toggle(option.optionId)}
                aria-pressed={active}
              >
                <span className="practice-option__key">{optionDisplayLabel(option.optionId, optionIndex)}</span>
                <span className="practice-option__text">{publicBusinessText(option.text)}</span>
                <span className="practice-option__mark" aria-hidden="true">
                  {state === 'is-correct' && <Check size={22} strokeWidth={3} />}
                  {state === 'is-wrong' && <CircleAlert size={22} />}
                  {state === 'is-selected' && <Check size={22} strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {wrongOnce && (
        <div className="practice-body__hint">
          <Mascot pose="THINKING" size="small" />
          <div className="practice-body__hint-bubble">
            <strong>{line === 'CLEARING' ? '先回到清算资料。' : '先回到资料。'}</strong>
            <span>{line === 'CLEARING' ? '核对业务键、处理状态和交收结果。' : '对照来源和计算结果，再提交。'}</span>
          </div>
        </div>
      )}

      <footer
        className={`practice-actionbar ${
          feedback ? (feedback.correct ? 'practice-actionbar--correct' : 'practice-actionbar--wrong') : ''
        }`}
      >
        <div className="practice-actionbar__inner">
          {feedback ? (
            <div className="practice-actionbar__feedback" role="status">
              <span className="practice-actionbar__feedback-icon" aria-hidden="true">
                {feedback.correct ? <Check size={26} strokeWidth={3} /> : <CircleAlert size={26} />}
              </span>
              <div>
                <strong>{practiceFeedbackLabel(question.type, line, feedback.correct)}</strong>
                <p>{feedback.explanation}</p>
                {feedback.hint && (
                  <span className="practice-actionbar__hint">
                    <Lightbulb size={15} /> {feedback.hint}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="practice-actionbar__meta">
              {selected.length > 0 && selected.every((value) => value.trim().length > 0)
                ? '已填齐，可以核对'
                : isStructured
                  ? '先填写所有字段，再核对'
                  : selected.length
                    ? '选择已确定，可以核对'
                    : '先选择一个选项，再核对'}
            </span>
          )}
          {feedback?.correct ? (
            <div className="practice-actionbar__status" role="status" aria-live="polite">
              <span>{isLastQuestion ? '已答对最后一题，正在进入综合实务…' : '已答对，正在载入下一题…'}</span>
              <i aria-hidden="true" />
              <i aria-hidden="true" />
              <i aria-hidden="true" />
            </div>
          ) : (
            <button
              className="b3-btn b3-btn--primary practice-actionbar__submit"
              type="button"
              onClick={submit}
              disabled={!canSubmit}
            >
              {submitting ? '正在提交…' : wrongOnce ? '重新提交' : '检查答案'}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
