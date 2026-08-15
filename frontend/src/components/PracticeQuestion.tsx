import { ArrowDown, ArrowUp, Check, CircleAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { PracticeQuestion as Question } from '../api/types';
import {
  businessActionLabel,
  optionDisplayLabel,
  publicBusinessText,
  publicUnitLabel,
} from '../utils/format';

export function PracticeQuestion({
  question,
  disabled = false,
  feedback,
  onSubmit,
}: {
  question: Question;
  disabled?: boolean;
  feedback?: { correct: boolean; explanation: string; hint?: string } | null;
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

  function move(index: number, direction: -1 | 1) {
    setSelected((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

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
                disabled={disabled || Boolean(feedback?.correct)}
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
                  disabled={disabled || Boolean(feedback?.correct)}
                />
                <em>{publicUnitLabel(field.unit)}</em>
              </span>
            </label>
          ))}
        </div>
      );
    }

    if (question.type === 'LEDGER_ENTRY') {
      return (
        <div className="practice-structured practice-structured--ledger">
          <div className="practice-ledger__head"><span>方向</span><span>资料行</span><span>补全科目</span></div>
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
                disabled={disabled || Boolean(feedback?.correct)}
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
                  disabled={disabled || Boolean(feedback?.correct)}
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
                    disabled={disabled || Boolean(feedback?.correct)}
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
          disabled={disabled || Boolean(feedback?.correct)}
        />
      </label>
    );
  }

  async function submit() {
    if (!selected.length || selected.some((value) => value.trim().length === 0)) return;
    setSubmitting(true);
    try {
      await onSubmit(selected);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="practice-question">
      <div className="eyebrow">先做判断</div>
      <h2>{publicBusinessText(question.prompt)}</h2>

      {isOrdering ? (
        <ol className="ordering-list">
          {selected.map((id, index) => {
            const item = question.items?.find((entry) => entry.itemId === id);
            return (
              <li key={id}>
                <span className="ordering-list__number">{index + 1}</span>
                <span>{item?.text ? publicBusinessText(item.text) : ''}</span>
                <span className="ordering-list__controls">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0 || disabled}>
                    <ArrowUp size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === selected.length - 1 || disabled}
                  >
                    <ArrowDown size={18} />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      ) : isStructured ? renderStructuredInput() : (
        <div className="choice-list">
          {question.options?.map((option, index) => {
            const active = selected.includes(option.optionId);
            return (
              <button
                key={option.optionId}
                type="button"
                className={active ? 'is-selected' : ''}
                onClick={() => toggle(option.optionId)}
                disabled={disabled}
              >
                <span className="choice-list__key">{optionDisplayLabel(option.optionId, index)}</span>
                <span>{publicBusinessText(option.text)}</span>
                {active && <Check className="choice-list__check" size={20} strokeWidth={4} />}
              </button>
            );
          })}
        </div>
      )}

      {feedback && (
        <div className={`feedback ${feedback.correct ? 'feedback--correct' : 'feedback--wrong'}`}>
          {feedback.correct ? <Check size={24} /> : <CircleAlert size={24} />}
          <div>
            <strong>{feedback.correct ? '判断正确' : '请核对资料'}</strong>
            <p>{feedback.explanation}</p>
            {feedback.hint && <span>下一步：{feedback.hint}</span>}
          </div>
        </div>
      )}

      <button
        className="button button--primary practice-question__submit"
        type="button"
        onClick={submit}
        disabled={!selected.length || selected.some((value) => value.trim().length === 0) || disabled || submitting || feedback?.correct}
      >
        {submitting ? '正在提交…' : feedback && !feedback.correct ? '重新提交' : '检查答案'}
      </button>
    </div>
  );
}
