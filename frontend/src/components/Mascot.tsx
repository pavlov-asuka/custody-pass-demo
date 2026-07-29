import './mascot.css';

export type MascotMood = 'idle' | 'thinking' | 'cheer' | 'wave';

interface MascotProps {
  size?: number;
  mood?: MascotMood;
  /** 是否渲染底部阴影 */
  shadow?: boolean;
}

/**
 * 小托：原创 SVG 学习伙伴。
 * mood: idle 呼吸眨眼 / thinking 思考摇摆+气泡点 / cheer 欢呼跳跃 / wave 挥手
 */
export function Mascot({ size = 96, mood = 'idle', shadow = true }: MascotProps) {
  const uid = `mc${Math.round(size * 10)}${mood}`;
  return (
    <span
      className={`mascot mascot-${mood}`}
      style={{ width: size, height: size * 1.06 }}
      role="img"
      aria-label="小托"
    >
      <svg viewBox="0 0 120 128" width={size} height={size * 1.06} aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="55%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>
          <linearGradient id={`${uid}-belly`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e3edfe" />
          </linearGradient>
        </defs>

        {shadow && <ellipse className="mascot-shadow" cx="60" cy="118" rx="28" ry="6.5" fill="rgba(15,30,61,0.14)" />}

        <g className="mascot-body-group">
          {/* 左臂 */}
          <ellipse cx="23" cy="76" rx="8.5" ry="13" fill={`url(#${uid}-body)`} transform="rotate(18 23 76)" />
          {/* 右臂（挥手/欢呼时上举） */}
          <g className="mascot-arm-right">
            <ellipse cx="97" cy="76" rx="8.5" ry="13" fill={`url(#${uid}-body)`} transform="rotate(-18 97 76)" />
          </g>

          {/* 身体：圆润豆形 */}
          <path
            d="M60 22 C33 22 17 44 17 72 C17 100 36 114 60 114 C84 114 103 100 103 72 C103 44 87 22 60 22 Z"
            fill={`url(#${uid}-body)`}
          />
          {/* 胸前小高光 */}
          <ellipse cx="60" cy="95" rx="17" ry="11" fill={`url(#${uid}-belly)`} opacity="0.55" />

          {/* 脸部 */}
          <ellipse cx="60" cy="50" rx="24" ry="18.5" fill="#ffffff" />
          {/* 眼睛 */}
          <g className="mascot-eye">
            <circle cx="51" cy="50" r="3.6" fill="#0f1e3d" />
            <circle cx="52.2" cy="48.8" r="1.2" fill="#ffffff" />
          </g>
          <g className="mascot-eye">
            <circle cx="69" cy="50" r="3.6" fill="#0f1e3d" />
            <circle cx="70.2" cy="48.8" r="1.2" fill="#ffffff" />
          </g>
          {/* 腮红 */}
          <ellipse cx="44.5" cy="57" rx="3.4" ry="2" fill="#7dd3fc" opacity="0.75" />
          <ellipse cx="75.5" cy="57" rx="3.4" ry="2" fill="#7dd3fc" opacity="0.75" />
          {/* 微笑 */}
          <path d="M55 58.5 C57 61 63 61 65 58.5" fill="none" stroke="#0f1e3d" strokeWidth="2.2" strokeLinecap="round" />

          {/* 头顶触角（科技感） */}
          <path d="M60 22 C60 15 62 11 66 8" fill="none" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" />
          <circle cx="66.5" cy="7.5" r="4.2" fill="#22d3ee" />
          <circle cx="66.5" cy="7.5" r="1.8" fill="#ffffff" opacity="0.9" />

          {/* 胸前 AI 徽章 */}
          <rect x="52" y="86" width="16" height="10" rx="5" fill="#ffffff" opacity="0.9" />
          <text x="60" y="93.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="#2563eb" fontFamily="Segoe UI, sans-serif">AI</text>
        </g>
      </svg>
      {mood === 'thinking' && (
        <span className="mascot-think-dots" aria-hidden="true">
          <i /><i /><i />
        </span>
      )}
    </span>
  );
}
