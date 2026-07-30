import { Check, ChevronDown, CircleAlert, RotateCcw } from 'lucide-react';
import type { AttemptResponse, Conclusion, RouteState } from '../api/types';
import { dimensionLabels, routeStateLabels } from '../utils/format';
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
      title: '本次复习尚未达标',
      description: '路线的历史通过状态不会撤销，这次结果已如实保留。',
    };
  }
  return conclusion === 'PASSED'
    ? { title: '路线已通过', description: '你已经完成本路线的关键能力检验。' }
    : { title: '已学习，还需要补强', description: '先完成定向补学，再重新挑战完整异常案例。' };
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
              {result.allMandatoryRequirementsMet ? '关键要求已满足' : '关键要求仍有遗漏'}
            </span>
          </div>
        </div>
      </section>

      {!passed && (
        <section className="mandatory-summary">
          <CircleAlert size={22} />
          <div>
            <strong>先补上关键遗漏</strong>
            <p>本次作答仍有关键要求未充分体现。下面的四维证据会说明需要优先补强的位置。</p>
          </div>
        </section>
      )}

      <section className="result-card">
        <div className="result-card__heading">
          <div>
            <span className="eyebrow">四维反馈</span>
            <h2>把能力拆开看，更容易进步</h2>
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
                        <p>{item.evidence || (item.matched ? '作答中已体现这一能力。' : '本次作答尚未充分体现。')}</p>
                      </div>
                    ))
                  ) : (
                    <p className="muted">本维度暂无可展开的证据。</p>
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
            <span><RotateCcw size={19} /> 查看本次原始作答</span>
            <ChevronDown />
          </summary>
          <p>{attempt.answerSnapshot}</p>
        </details>
      )}

      {historical && attempt.currentRouteState && (
        <section className="current-state">
          <div>
            <span className="eyebrow">路线当前状态</span>
            <h2>{routeStateLabels[attempt.currentRouteState]}</h2>
          </div>
          <p>历史评分保持不变；这里单独展示路线现在的最新状态。</p>
        </section>
      )}

      {actions && <div className="result-actions">{actions}</div>}
    </div>
  );
}
