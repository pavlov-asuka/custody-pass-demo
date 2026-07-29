import type { ReactNode } from 'react';

export type MascotPose =
  | 'WELCOME_WAVE'
  | 'GUIDE_POINT'
  | 'READ_WITH_BOOK'
  | 'THINKING'
  | 'SCORING_WAIT'
  | 'RESULT_SUPPORT';

interface MascotProps {
  pose?: MascotPose;
  size?: 'small' | 'medium' | 'large';
  message?: ReactNode;
  className?: string;
}
export function Mascot({
  pose = 'WELCOME_WAVE',
  size = 'medium',
  message,
  className = '',
}: MascotProps) {
  const isBook = pose === 'READ_WITH_BOOK';
  const isScoring = pose === 'SCORING_WAIT';
  const isThinking = pose === 'THINKING';
  const isPointing = pose === 'GUIDE_POINT';
  const isSupport = pose === 'RESULT_SUPPORT';

  return (
    <div className={`mascot mascot--${size} ${className}`}>
      <svg
        className="mascot__art"
        viewBox="0 0 240 260"
        role="img"
        aria-label="小托"
      >
        <g
          fill="none"
          stroke="#17324d"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="7"
        >
          <path
            fill="#2f80ed"
            d="M87 44C67 34 54 19 52 8c16 3 30 12 39 25 1-15 7-27 17-33 7 16 4 30-4 43z"
          />
          <path
            fill="#2f80ed"
            d="M153 44c20-10 33-25 35-36-16 3-30 12-39 25-1-15-7-27-17-33-7 16-4 30 4 43z"
          />
          <path
            fill="#fffdf8"
            d="M42 96c-9-17-7-33 4-49 11 4 21 11 28 22 13-13 28-20 46-20s34 7 47 20c7-11 17-18 28-22 11 16 13 32 4 49 6 12 8 25 5 38-5 25-25 44-51 50H87c-26-6-46-25-51-50-3-13-1-26 6-38z"
          />
          <path fill="#f6a8b8" d="M50 63c7 2 13 7 18 13-8 2-15 0-20-5z" />
          <path fill="#f6a8b8" d="M190 63c-7 2-13 7-18 13 8 2 15 0 20-5z" />
          <path
            fill="#2f80ed"
            d="M102 55c7-23 17-35 30-39 0 15-4 27-12 35 9-2 17 0 24 5-12 9-26 12-42-1z"
          />
          <ellipse fill="#101820" cx="85" cy="111" rx="20" ry="25" />
          <ellipse fill="#101820" cx="155" cy="111" rx="20" ry="25" />
          <circle fill="#fffdf8" stroke="none" cx="78" cy="102" r="6" />
          <circle fill="#fffdf8" stroke="none" cx="148" cy="102" r="6" />
          <path fill="#2f80ed" d="M112 132q8-8 16 0-8 8-16 0z" />
          <path d="M102 145q18 19 36 0" />
          <path
            fill="#3b82f6"
            d="M74 179c12-7 27-10 46-10s34 3 46 10l10 64H64z"
          />
          <path fill="#75b6ff" d="M95 174l25 21 25-21" />
          <path fill="#fffdf8" d="M78 239l-4 15H44q0-20 20-27z" />
          <path fill="#fffdf8" d="M162 239l4 15h30q0-20-20-27z" />

          {pose === 'WELCOME_WAVE' && (
            <>
              <path fill="#fffdf8" d="M164 190q23-15 25-45l15 4q-1 39-30 62z" />
              <path fill="#fffdf8" d="M188 145l-2-23m5 23 9-20m-7 24 17-12" />
              <path fill="#fffdf8" d="M76 190q-18 8-28 27l-13-8q11-27 36-36z" />
            </>
          )}
          {isPointing && (
            <>
              <path fill="#fffdf8" d="M164 190q26-5 47-25l10 11q-21 27-51 34z" />
              <path fill="#fffdf8" d="M209 166l15-11" />
              <path fill="#fffdf8" d="M76 190q-14 9-23 22l-13-9q10-21 31-30z" />
            </>
          )}
          {isThinking && (
            <>
              <path fill="#fffdf8" d="M163 190q18-17 11-36l15-4q13 29-14 55z" />
              <path fill="#fffdf8" d="M174 155l-6-13" />
              <path fill="#fffdf8" d="M76 190q-15 7-23 22l-13-9q10-21 31-30z" />
              <circle fill="#58cc02" cx="209" cy="89" r="8" />
              <circle fill="#58cc02" cx="222" cy="68" r="5" />
            </>
          )}
          {isBook && (
            <>
              <path fill="#fffdf8" d="M72 185q-17 5-24 22l14 9 20-20z" />
              <path fill="#fffdf8" d="M168 185q17 5 24 22l-14 9-20-20z" />
              <path fill="#2f80ed" d="M55 190q35-5 65 18v39q-31-23-65-18z" />
              <path fill="#75b6ff" d="M185 190q-35-5-65 18v39q31-23 65-18z" />
            </>
          )}
          {isScoring && (
            <>
              <path fill="#fffdf8" d="M76 190q-19 8-20 30l15 2 14-25z" />
              <path fill="#fffdf8" d="M164 190q19 8 20 30l-15 2-14-25z" />
              <rect fill="#fffdf8" x="71" y="181" width="98" height="67" rx="10" />
              <path fill="#58cc02" d="M103 181v-10h34v10z" />
              <path d="M91 203h57M91 220h42" />
            </>
          )}
          {isSupport && (
            <>
              <path fill="#fffdf8" d="M78 188q-27 0-44 17l9 13q20-12 39-7z" />
              <path fill="#fffdf8" d="M162 188q27 0 44 17l-9 13q-20-12-39-7z" />
            </>
          )}
        </g>
      </svg>
      {message && <div className="mascot__bubble">{message}</div>}
    </div>
  );
}
