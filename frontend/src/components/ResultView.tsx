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
    <div className="result-view" data-testid="result-view">
      <section className={`result-hero ${passed ? 'result-hero--passed' : 'result-hero--review'}`}>
        <Mascot pose="RESULT_SUPPORT" size="medium" />
        <div>
          <span className="eyebrow">{historical ? '本次历史结果' : '本次学习结果'}</span>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
        <div className="score-stamp">
          <strong>{result.totalScore}</strong>
          <span>/ 100</span>
        </div>
      </section>

      <section className="result-card">
        <div className="result-card__heading">
          <div>
            <span className="eyebrow">通过判断</span>
            <h2>{passed ? '两项条件均已满足' : '看看还差在哪里'}</h2>
          </div>
          {passed ? <Check className="result-icon result-icon--ok" /> : <CircleAlert className="result-icon" />}
        </div>
        <div className="criteria-grid">
          <div className={result.scoreThresholdMet ? 'is-met' : 'is-missed'}>
            {result.scoreThresholdMet ? <Check /> : <CircleAlert />}
            <span>分数门槛</span>
            <strong>{result.totalScore} / {result.passScore}</strong>
          </div>
          <div className={result.allMandatoryRequirementsMet ? 'is-met' : 'is-missed'}>
            {result.allMandatoryRequirementsMet ? <Check /> : <CircleAlert />}
            <span>关键要求</span>
            <strong>{result.allMandatoryRequirementsMet ? '已全部满足' : '仍有遗漏'}</strong>
          </div>
        </div>
      </section>

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
        <section className="result-card current-state">
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
