import type { Line } from '../api/types';
import accountingUrl from '../assets/illustrations/world-accounting.webp';
import clearingUrl from '../assets/illustrations/world-clearing.webp';
import supervisionUrl from '../assets/illustrations/world-supervision.webp';

const sceneAssets: Record<Line, string> = {
  CLEARING: clearingUrl,
  ACCOUNTING: accountingUrl,
  SUPERVISION: supervisionUrl,
};

/** 三世界正式透明场景资产。建设中状态只通过 CSS 去饱和，不绘制第二套场景。 */
export function WorldScene({ line, building }: { line: Line; building: boolean }) {
  return (
    <div
      className={`world-scene world-scene--${line.toLowerCase()} ${building ? 'is-building' : ''}`}
      aria-hidden="true"
    >
      <img className="world-scene__image" src={sceneAssets[line]} alt="" />
    </div>
  );
}
