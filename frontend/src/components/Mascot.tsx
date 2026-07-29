import type { ReactNode } from 'react';

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

/**
 * 小托情景角色（阶段 3B 重绘）
 * 身份基准：design-assets/xiaotuo/xiaotuo-character-baseline-v1.png
 * 白色蓬松小兽、蓝色珊瑚鹿角、额前蓝毛束、大圆黑眼、粉耳内、
 * 蓝色翻领上衣、深蓝短裤。统一几何语言，纯色平涂，深蓝轮廓。
 */
export function Mascot({
  pose = 'WELCOME_WAVE',
  size = 'medium',
  message,
  className = '',
}: MascotProps) {
  const waving = pose === 'WELCOME_WAVE';
  const pointing = pose === 'GUIDE_POINT';
  const reading = pose === 'READ_WITH_BOOK';
  const thinking = pose === 'THINKING';
  const scoring = pose === 'SCORING_WAIT';
  const support = pose === 'RESULT_SUPPORT';
  const celebrate = pose === 'CELEBRATE';

  return (
    <div className={`mascot mascot--${size} mascot--${pose.toLowerCase()} ${className}`}>
      <svg
        className="mascot__art"
        viewBox="0 0 260 300"
        role="img"
        aria-label="小托"
      >
        <g
          fill="none"
          stroke="#1e2f6e"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="6"
        >
          {/* ============ 鹿角（蓝色珊瑚状） ============ */}
          <path
            fill="#2b50c8"
            d="M78 62C70 46 62 38 52 34c2 10 6 18 12 24-8-2-16-2-22 2 6 8 16 12 26 12l10-10z"
          />
          <path
            fill="#2b50c8"
            d="M84 58C80 40 80 26 86 14c6 8 10 18 10 28l-12 16z"
          />
          <path
            fill="#2b50c8"
            d="M182 62c8-16 16-24 26-28-2 10-6 18-12 24 8-2 16-2 22 2-6 8-16 12-26 12l-10-10z"
          />
          <path
            fill="#2b50c8"
            d="M176 58c4-18 4-32-2-44-6 8-10 18-10 28l12 16z"
          />

          {/* ============ 耳朵（白 + 粉耳内） ============ */}
          <path
            fill="#ffffff"
            d="M62 96c-14-8-24-8-32 2 6 12 18 18 32 18l0-20z"
          />
          <path fill="#f6a8b8" strokeWidth={4} d="M56 100c-7-4-13-4-17 2 4 6 10 9 17 9z" />
          <path
            fill="#ffffff"
            d="M198 96c14-8 24-8 32 2-6 12-18 18-32 18l0-20z"
          />
          <path fill="#f6a8b8" strokeWidth={4} d="M204 100c7-4 13-4 17 2-4 6-10 9-17 9z" />

          {/* ============ 头（白色蓬松轮廓） ============ */}
          <path
            fill="#ffffff"
            d="M130 56
               C100 56 76 66 66 84
               C58 97 56 112 60 126
               C54 132 54 140 60 146
               C64 162 76 174 94 180
               C104 184 116 186 130 186
               C144 186 156 184 166 180
               C184 174 196 162 200 146
               C206 140 206 132 200 126
               C204 112 202 97 194 84
               C184 66 160 56 130 56 Z"
          />
          {/* 脸颊两侧毛刺 */}
          <path fill="#ffffff" d="M63 128l-12 6 12 7-6 8 13-2z" />
          <path fill="#ffffff" d="M197 128l12 6-12 7 6 8-13-2z" />

          {/* ============ 额前蓝毛束 ============ */}
          <path
            fill="#5b8def"
            d="M104 62c2-16 10-28 24-34-2 10-2 18 2 26 6-4 14-6 20-4-6 10-18 16-32 16l-14-4z"
          />

          {/* ============ 眉毛 ============ */}
          <path stroke="#b8c8e8" strokeWidth="6" d="M88 90q10-6 20-3" />
          <path stroke="#b8c8e8" strokeWidth="6" d="M152 87q10-3 20 3" />

          {/* ============ 眼睛（大圆黑 + 高光） ============ */}
          <ellipse fill="#101820" stroke="none" cx="98" cy="116" rx="17" ry="22" />
          <ellipse fill="#101820" stroke="none" cx="162" cy="116" rx="17" ry="22" />
          <circle fill="#ffffff" stroke="none" cx="92" cy="107" r="6" />
          <circle fill="#ffffff" stroke="none" cx="156" cy="107" r="6" />
          <circle fill="#ffffff" stroke="none" cx="103" cy="124" r="2.6" opacity="0.9" />
          <circle fill="#ffffff" stroke="none" cx="167" cy="124" r="2.6" opacity="0.9" />

          {/* ============ 鼻子 ============ */}
          <path fill="#2b50c8" d="M121 140q9-8 18 0-4 7-9 7t-9-7z" />

          {/* ============ 嘴（张开笑） ============ */}
          {thinking ? (
            <path d="M118 162q12 6 24 0" />
          ) : (
            <path
              fill="#e8503a"
              d="M112 156q18 20 36 0-4 16-18 16t-18-16z"
            />
          )}

          {/* ============ 身体：蓝色翻领上衣 ============ */}
          <path
            fill="#2b63e8"
            d="M84 196c10-8 26-12 46-12s36 4 46 12c8 8 12 20 12 34l-10 30H82l-10-30c0-14 4-26 12-34z"
          />
          <path fill="#8fb8ff" d="M104 190l26 22 26-22-6-6H110z" />
          <path fill="#1e3a8f" d="M126 212h8v22h-8z" strokeWidth="3" />

          {/* ============ 短裤 + 腿 + 鞋 ============ */}
          <path fill="#1e3a8f" d="M84 258h92v14c0 6-4 10-10 10H94c-6 0-10-4-10-10v-14z" />
          <path fill="#ffffff" d="M100 280h18v8h-18z" strokeWidth="4" />
          <path fill="#ffffff" d="M142 280h18v8h-18z" strokeWidth="4" />
          <path
            fill="#2b63e8"
            d="M94 288h30v6c0 3-2 5-5 5H96c-4 0-6-2-6-6v-2c0-2 2-3 4-3z"
          />
          <path
            fill="#2b63e8"
            d="M136 288h30c2 0 4 1 4 3v2c0 4-2 6-6 6h-23c-3 0-5-2-5-5v-6z"
          />
          <path stroke="#ffffff" strokeWidth="3" d="M97 292h24M139 292h24" />

          {/* ============ 手臂与道具（按姿态） ============ */}
          {waving && (
            <>
              {/* 右手高举挥动 */}
              <path
                fill="#ffffff"
                d="M178 200c14-6 24-20 26-38l16 2c-2 26-16 46-36 54l-6-18z"
              />
              <path fill="#ffffff" d="M204 162l-4-22m9 20l8-20m-3 22l16-13" />
              {/* 左手自然微张 */}
              <path
                fill="#ffffff"
                d="M82 200c-12 4-20 14-24 26l14 6c4-10 10-16 18-20l-8-12z"
              />
            </>
          )}
          {pointing && (
            <>
              {/* 右手指向前方 */}
              <path
                fill="#ffffff"
                d="M178 200c18-2 34-10 44-24l10 12c-12 18-32 28-52 30l-2-18z"
              />
              <path fill="#ffffff" d="M222 176l18-6-2 12-16 4z" />
              {/* 左手背在身后 */}
              <path
                fill="#ffffff"
                d="M82 200c-10 6-16 14-18 24l13 4c3-9 8-15 15-19l-10-9z"
              />
            </>
          )}
          {reading && (
            <>
              {/* 双手捧书 */}
              <path
                fill="#ffffff"
                d="M84 202c-10 6-16 16-16 28l16 4 18-22-18-10z"
              />
              <path
                fill="#ffffff"
                d="M176 202c10 6 16 16 16 28l-16 4-18-22 18-10z"
              />
              <path
                fill="#2b50c8"
                d="M76 214c16-6 34-4 54 8v40c-20-12-38-14-54-8v-40z"
              />
              <path
                fill="#5b8def"
                d="M184 214c-16-6-34-4-54 8v40c20-12 38-14 54-8v-40z"
              />
              <path stroke="#ffffff" strokeWidth="3" d="M88 226c10-2 20 0 30 6M88 238c10-2 20 0 30 6M172 226c-10-2-20 0-30 6M172 238c-10-2-20 0-30 6" />
            </>
          )}
          {thinking && (
            <>
              {/* 一手托腮 */}
              <path
                fill="#ffffff"
                d="M176 204c16 0 28-8 32-22l12 8c-6 20-22 32-42 34l-2-20z"
              />
              <circle fill="#ffffff" cx="208" cy="182" r="12" />
              {/* 思考点 */}
              <circle fill="#5b8def" stroke="none" cx="216" cy="126" r="6" />
              <circle fill="#5b8def" stroke="none" cx="230" cy="106" r="8" />
              <circle fill="#5b8def" stroke="none" cx="248" cy="82" r="11" />
              {/* 左手自然 */}
              <path
                fill="#ffffff"
                d="M82 202c-12 4-20 14-24 26l14 6c4-10 10-16 18-20l-8-12z"
              />
            </>
          )}
          {scoring && (
            <>
              {/* 双手抱文件夹 */}
              <path
                fill="#ffffff"
                d="M84 204c-12 6-18 16-18 28l16 4 16-24-14-8z"
              />
              <path
                fill="#ffffff"
                d="M176 204c12 6 18 16 18 28l-16 4-16-24 14-8z"
              />
              <rect fill="#ffffff" x="88" y="196" width="84" height="58" rx="10" />
              <path fill="#58cc02" d="M112 196v-12h36v12z" />
              <path d="M104 216h52M104 230h38M104 244h46" />
            </>
          )}
          {support && (
            <>
              {/* 双臂温和张开 */}
              <path
                fill="#ffffff"
                d="M84 200c-16 0-30 8-38 22l12 10c8-10 18-16 30-16l-4-16z"
              />
              <path
                fill="#ffffff"
                d="M176 200c16 0 30 8 38 22l-12 10c-8-10-18-16-30-16l4-16z"
              />
            </>
          )}
          {celebrate && (
            <>
              {/* 双臂高举 */}
              <path
                fill="#ffffff"
                d="M84 198c-14-8-20-24-20-42l16-4c2 16 8 28 18 34l-14 12z"
              />
              <path
                fill="#ffffff"
                d="M176 198c14-8 20-24 20-42l-16-4c-2 16-8 28-18 34l14 12z"
              />
              <path fill="#ffffff" d="M64 156l-6-20m15 17l4-21m4 21l12-17" />
              <path fill="#ffffff" d="M196 156l6-20m-15 17l-4-21m-4 21l-12-17" />
              {/* 稀疏彩纸 */}
              <path fill="#58cc02" stroke="none" d="M40 96l8-4 4 8-8 4z" />
              <path fill="#ffc800" stroke="none" d="M222 120l8-4 4 8-8 4z" />
              <circle fill="#1cb0f6" stroke="none" cx="36" cy="132" r="4" />
              <circle fill="#ff9600" stroke="none" cx="230" cy="88" r="4" />
              <path fill="#ce82ff" stroke="none" d="M210 48l7-4 4 7-7 4z" />
            </>
          )}
        </g>
      </svg>
      {message && <div className="mascot__bubble">{message}</div>}
    </div>
  );
}
