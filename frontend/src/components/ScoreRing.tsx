import { useEffect, useState } from 'react';

interface ScoreRingProps {
  score: number;
  maxScore: number;
  size?: number;
  strokeWidth?: number;
  animate?: boolean;
}

/** 总分环形仪表：带描边动画与中心数字 */
export function ScoreRing({ score, maxScore, size = 148, strokeWidth = 11, animate = true }: ScoreRingProps) {
  const rate = maxScore > 0 ? Math.max(0, Math.min(1, score / maxScore)) : 0;
  const [progress, setProgress] = useState(animate ? 0 : rate);

  useEffect(() => {
    if (!animate) {
      setProgress(rate);
      return;
    }
    setProgress(0);
    const raf = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => setProgress(rate));
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf);
  }, [rate, animate]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * progress;

  const tone = rate >= 0.8 ? 'var(--ok)' : rate >= 0.6 ? 'var(--blue)' : 'var(--danger)';

  return (
    <div style={{ position: 'relative', width: size, height: size }} role="img" aria-label={`总分 ${score} / ${maxScore}`}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--paper-deep)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 1.1s var(--ease-out)' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="num" style={{ fontSize: size * 0.26, fontWeight: 800, lineHeight: 1.1, color: 'var(--ink)' }}>
          {score}
        </div>
        <div className="num" style={{ fontSize: size * 0.105, color: 'var(--ink-faint)', fontWeight: 600 }}>
          / {maxScore} 分
        </div>
      </div>
    </div>
  );
}
