import { Check } from 'lucide-react';
import type { RouteOverview, StepType } from '../api/types';
import { stepLabels } from '../utils/format';

const order: StepType[] = [
  'KNOWLEDGE_CARD',
  'DEMONSTRATION',
  'BASIC_PRACTICE',
  'EXCEPTION_CASE',
];

export function RouteStepper({
  route,
  active,
  onSelect,
}: {
  route: RouteOverview;
  active: StepType;
  onSelect: (step: StepType) => void;
}) {
  return (
    <ol className="route-stepper" aria-label="路线环节进度">
      {order.map((type, index) => {
        const status = route.steps.find((item) => item.stepType === type);
        const completed = status?.completed ?? false;
        const enabled = status?.accessible ?? false;
        return (
          <li key={type} className={active === type ? 'is-active' : ''}>
            {index > 0 && <span className={`route-stepper__line ${completed ? 'is-done' : ''}`} />}
            <button
              type="button"
              disabled={!enabled}
              onClick={() => onSelect(type)}
              aria-current={active === type ? 'step' : undefined}
            >
              <span className={`route-stepper__dot ${completed ? 'is-done' : ''}`}>
                {completed ? <Check size={16} strokeWidth={4} /> : index + 1}
              </span>
              <span>{stepLabels[type]}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
