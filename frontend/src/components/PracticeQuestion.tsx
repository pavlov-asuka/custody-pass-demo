import { ArrowDown, ArrowUp, Check, CircleAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { PracticeQuestion as Question } from '../api/types';

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

  const initialOrder = useMemo(
    () => question.items?.map((item) => item.itemId) ?? [],
    [question.items],
  );

  useEffect(() => {
    setSelected(isOrdering ? initialOrder : []);
  }, [initialOrder, isOrdering, question.questionId]);

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

  function move(index: number, direction: -1 | 1) {
    setSelected((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
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

  return (
    <div className="practice-question">
      <div className="eyebrow">想一想</div>
      <h2>{question.prompt}</h2>

      {isOrdering ? (
        <ol className="ordering-list">
          {selected.map((id, index) => {
            const item = question.items?.find((entry) => entry.itemId === id);
            return (
              <li key={id}>
                <span className="ordering-list__number">{index + 1}</span>
                <span>{item?.text}</span>
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
      ) : (
        <div className="choice-list">
          {question.options?.map((option) => {
            const active = selected.includes(option.optionId);
            return (
              <button
                key={option.optionId}
                type="button"
                className={active ? 'is-selected' : ''}
                onClick={() => toggle(option.optionId)}
                disabled={disabled}
              >
                <span className="choice-list__key">{option.optionId}</span>
                <span>{option.text}</span>
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
            <strong>{feedback.correct ? '判断正确' : '再想一步'}</strong>
            <p>{feedback.explanation}</p>
            {feedback.hint && <span>提示：{feedback.hint}</span>}
          </div>
        </div>
      )}

      <button
        className="button button--primary practice-question__submit"
        type="button"
        onClick={submit}
        disabled={!selected.length || disabled || submitting || feedback?.correct}
      >
        {submitting ? '正在提交…' : feedback && !feedback.correct ? '重新提交' : '检查答案'}
      </button>
    </div>
  );
}
