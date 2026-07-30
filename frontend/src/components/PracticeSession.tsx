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
  PracticeFeedback,
  PracticeQuestion as Question,
  StepResponse,
} from '../api/types';
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
  data,
  onCompleted,
}: {
  routeId: string;
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
  feedback,
  isLastQuestion,
  onSubmit,
}: {
  question: Question;
  feedback: PracticeFeedback | null;
  isLastQuestion: boolean;
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

  const canSubmit = selected.length > 0 && !submitting && !feedback?.correct;
  const wrongOnce = feedback && !feedback.correct;

  return (
    <div className="practice-body">
      <h2 className="practice-body__prompt">{question.prompt}</h2>

      {isOrdering ? (
        <ol className="practice-ordering">
          {selected.map((id, orderIndex) => {
            const item = question.items?.find((entry) => entry.itemId === id);
            return (
              <li key={id}>
                <span className="practice-ordering__number">{orderIndex + 1}</span>
                <span className="practice-ordering__text">{item?.text}</span>
                <span className="practice-ordering__controls">
                  <button
                    type="button"
                    aria-label={`上移「${item?.text}」`}
                    onClick={() => move(orderIndex, -1)}
                    disabled={orderIndex === 0 || Boolean(feedback?.correct)}
                  >
                    <ArrowUp size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label={`下移「${item?.text}」`}
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
      ) : (
        <div
          className="practice-options"
          role={question.type === 'SINGLE_CHOICE' ? 'radiogroup' : 'group'}
          aria-label="作答选项"
        >
          {question.options?.map((option) => {
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
                <span className="practice-option__key">{option.optionId}</span>
                <span className="practice-option__text">{option.text}</span>
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
            <strong>别急，再看一眼情景。</strong>
            <span>先分清系统状态和业务结果，再作判断。</span>
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
                <strong>{feedback.correct ? '判断正确' : '再想一步'}</strong>
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
              {selected.length ? '已做出选择，可以提交' : '选择一个选项后提交'}
            </span>
          )}
          {feedback?.correct ? (
            <div className="practice-actionbar__status" role="status" aria-live="polite">
              <span>{isLastQuestion ? '即将完成基础练习…' : '即将进入下一题…'}</span>
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
