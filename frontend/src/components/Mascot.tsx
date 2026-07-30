import type { ReactNode } from 'react';
import waveUrl from '../assets/illustrations/xiaotuo-wave.webp';
import pointUrl from '../assets/illustrations/xiaotuo-point.webp';
import bookUrl from '../assets/illustrations/xiaotuo-book.webp';
import thinkUrl from '../assets/illustrations/xiaotuo-think.webp';
import waitUrl from '../assets/illustrations/xiaotuo-wait.webp';
import supportUrl from '../assets/illustrations/xiaotuo-support.webp';
import celebrateUrl from '../assets/illustrations/xiaotuo-celebrate.webp';

export type MascotPose =
  | 'WELCOME_WAVE'
  | 'GUIDE_POINT'
  | 'READ_WITH_BOOK'
  | 'THINKING'
  | 'SCORING_WAIT'
  | 'RESULT_SUPPORT'
  | 'CELEBRATE';

interface MascotProps {
  pose?: MascotPose;
  size?: 'small' | 'medium' | 'large';
  message?: ReactNode;
  className?: string;
}

const mascotAssets: Record<MascotPose, string> = {
  WELCOME_WAVE: waveUrl,
  GUIDE_POINT: pointUrl,
  READ_WITH_BOOK: bookUrl,
  THINKING: thinkUrl,
  SCORING_WAIT: waitUrl,
  RESULT_SUPPORT: supportUrl,
  CELEBRATE: celebrateUrl,
};

/**
 * 小托情景角色。姿态由正式透明插画资产提供，组件只负责语义、尺寸和气泡布局。
 * 身份基准：design-assets/xiaotuo/xiaotuo-character-baseline-v1.png
 */
export function Mascot({
  pose = 'WELCOME_WAVE',
  size = 'medium',
  message,
  className = '',
}: MascotProps) {
  return (
    <div className={`mascot mascot--${size} mascot--${pose.toLowerCase()} ${className}`}>
      <img
        className="mascot__art"
        src={mascotAssets[pose]}
        role="img"
        aria-label="小托"
      />
      {message && <div className="mascot__bubble">{message}</div>}
    </div>
  );
}
