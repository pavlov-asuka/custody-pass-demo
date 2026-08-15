import { Check, ChevronDown, CircleAlert, RotateCcw } from 'lucide-react';
import type { AttemptResponse, Conclusion, RouteState } from '../api/types';
import {
  dimensionLabels,
  fieldIdLabel,
  optionValueLabel,
  routeStateLabels,
} from '../utils/format';
import { Mascot } from './Mascot';

function conclusionCopy(
  conclusion: Conclusion,
  historicalConclusion: Conclusion | undefined,
  currentRouteState: RouteState | undefined,
) {
  if (
    conclusion === 'LEARNED_NOT_MASTERED' &&
    historicalConclusion === 'LEARNED_NOT_MASTERED' &&
    currentRouteState === 'PASSED'
  ) {
    return {
      title: '本次复习未达到通过线',
      description: '历史记录中的通过状态保留；本次复习按当前作答单独记录。',
    };
  }
  return conclusion === 'PASSED'
    ? { title: '路线已通过', description: '总分达到通过线，且关键要求已满足。' }
    : { title: '本次作答需要补学', description: '先完成指定补学目标，再重新提交综合实务。' };
}
export function ResultView({
  attempt,
  historical = false,
  actions,
}: {
  attempt: AttemptResponse;
  historical?: boolean;
  actions?: React.ReactNode;
}) {
  const result = attempt.result;
  if (!result) return null;
  const copy = conclusionCopy(
    result.conclusion,
    attempt.historicalConclusion,
    attempt.currentRouteState,
  );
  const passed = result.conclusion === 'PASSED';

  return (
    <div className={`result-view ${historical ? 'result-view--historical' : ''}`} data-testid="result-view">
      <section className={`result-hero ${passed ? 'result-hero--passed' : 'result-hero--review'}`}>
        <div className="result-hero__mascot">
          <Mascot pose={passed ? 'CELEBRATE' : 'RESULT_SUPPORT'} size="large" />
          {passed && <span className="result-confetti" aria-hidden="true"><i /><i /><i /><i /><i /></span>}
        </div>
        <div className="result-hero__copy">
          <span className="eyebrow">{historical ? '本次历史结果' : '本次学习结果'}</span>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
          <div className="result-summary">
            <span className={result.scoreThresholdMet ? 'is-met' : 'is-missed'}>
              {result.scoreThresholdMet ? <Check size={17} /> : <CircleAlert size={17} />}
              总分 {result.totalScore} / 门槛 {result.passScore}
            </span>
            <span className={result.allMandatoryRequirementsMet ? 'is-met' : 'is-missed'}>
              {result.allMandatoryRequirementsMet ? <Check size={17} /> : <CircleAlert size={17} />}
              {result.allMandatoryRequirementsMet ? '必达要求已满足' : '必达要求仍待补齐'}
            </span>
          </div>
        </div>
      </section>

      {!passed && (
        <section className="mandatory-summary">
          <CircleAlert size={22} />
          <div>
            <strong>先处理未满足的必达项</strong>
            <p>本次作答有必达项未满足。先查看下方标出的字段、计算或勾稽，再进入定向补学。</p>
          </div>
        </section>
      )}

      <section className="result-card">
        <div className="result-card__heading">
          <div>
            <span className="eyebrow">四维反馈</span>
            <h2>按四个维度查看证据</h2>
          </div>
        </div>
        <div className="dimension-list">
          {result.dimensions.map((dimension) => {
            const percent = Math.round((dimension.score / dimension.maxScore) * 100);
            return (
              <details key={dimension.dimension} className="dimension">
                <summary>
                  <div>
                    <strong>{dimensionLabels[dimension.dimension]}</strong>
                    <span>{dimension.score} / {dimension.maxScore}</span>
                  </div>
                  <div className="dimension__track">
                    <span style={{ width: `${percent}%` }} />
                  </div>
                  <ChevronDown className="dimension__chevron" />
                </summary>
                <div className="dimension__evidence">
                  {dimension.items.length ? (
                    dimension.items.map((item, index) => (
                      <div key={`${dimension.dimension}-${index}`} className={item.matched ? 'is-met' : 'is-missed'}>
                        {item.matched ? <Check size={18} /> : <CircleAlert size={18} />}
                        <p>{item.evidence || (item.matched ? '该项要求已核对通过。' : '本次提交缺少该项要求的内容。')}</p>
                      </div>
                    ))
                  ) : (
                    <p className="muted">本维度暂未返回可展开的证据。</p>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      {attempt.answerSnapshot && (
        <details className="result-card answer-snapshot">
          <summary>
            <span><RotateCcw size={19} /> 查看本次提交的作答</span>
            <ChevronDown />
          </summary>
          <dl className="answer-snapshot__responses">
            {Object.entries(attempt.answerSnapshot.responses).map(([fieldId, value], index) => (
              <div key={fieldId}>
                <dt>{fieldIdLabel(fieldId, index)}</dt>
                <dd>{typeof value === 'string' ? optionValueLabel(value, fieldId, index) : String(value)}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      {historical && attempt.currentRouteState && (
        <section className="current-state">
          <div>
            <span className="eyebrow">路线当前状态</span>
            <h2>{routeStateLabels[attempt.currentRouteState]}</h2>
          </div>
          <p>历史评分不可修改；下方状态是路线当前进度，不会覆盖本次结论。</p>
        </section>
      )}

      {actions && <div className="result-actions">{actions}</div>}
    </div>
  );
}
