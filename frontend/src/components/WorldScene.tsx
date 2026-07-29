import type { Line } from '../api/types';

/**
 * 三世界场景插画（阶段 3B）
 * 统一几何语言：圆形、圆角矩形、扁平药丸地面影、白云。
 * 三个世界只通过场景道具和构图区分，共用同一块规范色板；
 * 建设中场景整体去饱和，不建立第二套色彩体系。
 */
export function WorldScene({ line, building }: { line: Line; building: boolean }) {
  return (
    <div
      className={`world-scene world-scene--${line.toLowerCase()} ${building ? 'is-building' : ''}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 320 230">
        <g
          fill="none"
          stroke="#1e2f6e"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4.5"
        >
          {/* 白云 */}
          <g fill="#ffffff">
            <path d="M52 52a14 14 0 0 1 26-6 11 11 0 0 1 18 10H56a12 12 0 0 1-4-4z" />
            <path d="M236 34a12 12 0 0 1 22-5 10 10 0 0 1 16 9h-34a10 10 0 0 1-4-4z" />
          </g>

          {/* 地面药丸影 */}
          <ellipse fill="#e3e9f0" stroke="none" cx="160" cy="204" rx="104" ry="13" />

          {line === 'ACCOUNTING' && <AccountingProps />}
          {line === 'CLEARING' && <ClearingProps />}
          {line === 'SUPERVISION' && <SupervisionProps />}

          {building && (
            <g>
              {/* 在建砖块堆 */}
              <rect fill="#e5e5e5" x="238" y="176" width="30" height="14" rx="3" />
              <rect fill="#e5e5e5" x="256" y="162" width="30" height="14" rx="3" />
              <rect fill="#e5e5e5" x="240" y="148" width="30" height="14" rx="3" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}

/** 核算：账簿、计算器、勾稽对账章、硬币 */
function AccountingProps() {
  return (
    <>
      {/* 硬币 */}
      <circle fill="#ffc800" cx="62" cy="148" r="16" />
      <circle cx="62" cy="148" r="9" />
      {/* 账簿（打开） */}
      <path fill="#2b63e8" d="M96 196V120c18-10 38-10 56 0v76c-18-10-38-10-56 0z" />
      <path fill="#1cb0f6" d="M216 196V120c-18-10-38-10-56 0v76c18-10 38-10 56 0z" />
      <path fill="#ffffff" d="M104 188v-56c14-8 30-8 44 0v56c-14-8-30-8-44 0z" />
      <path fill="#ffffff" d="M208 188v-56c-14-8-30-8-44 0v56c14-8 30-8 44 0z" />
      <path stroke="#9fb6d8" strokeWidth="3.5" d="M116 142c8-3 16-3 24 0M116 154c8-3 16-3 24 0M116 166c8-3 16-3 24 0M172 142c8-3 16-3 24 0M172 154c8-3 16-3 24 0M172 166c8-3 16-3 24 0" />
      {/* 计算器 */}
      <rect fill="#58cc02" x="228" y="96" width="52" height="66" rx="10" />
      <rect fill="#ffffff" x="238" y="106" width="32" height="14" rx="4" />
      <g fill="#ffffff" stroke="none">
        <circle cx="242" cy="132" r="4" />
        <circle cx="254" cy="132" r="4" />
        <circle cx="266" cy="132" r="4" />
        <circle cx="242" cy="144" r="4" />
        <circle cx="254" cy="144" r="4" />
        <circle cx="266" cy="144" r="4" />
      </g>
      {/* 勾稽对账章 */}
      <circle fill="#58cc02" cx="88" cy="84" r="24" />
      <path stroke="#ffffff" strokeWidth="5" d="M78 84l8 8 14-16" />
    </>
  );
}

/** 清算：交收双向箭头、资金桥梁、货币圆 */
function ClearingProps() {
  return (
    <>
      {/* 左端货币仓 */}
      <circle fill="#ffc800" cx="74" cy="120" r="26" />
      <path d="M74 108v24M66 114h16M66 126h16" />
      {/* 右端证券仓 */}
      <rect fill="#1cb0f6" x="222" y="94" width="48" height="52" rx="10" />
      <path stroke="#ffffff" strokeWidth="3.5" d="M234 112h24M234 124h24M234 136h14" />
      {/* 资金桥梁（拱） */}
      <path
        fill="#8fb8ff"
        d="M92 196c10-34 32-52 68-52s58 18 68 52l-16 6c-8-26-26-40-52-40s-44 14-52 40l-16-6z"
      />
      {/* 交收双向箭头（两仓之间传递） */}
      <path
        fill="#58cc02"
        d="M112 92h54v-12l26 20-26 20v-12h-54z"
      />
      <path
        fill="#2b63e8"
        d="M208 148h-54v-12l-26 20 26 20v-12h54z"
      />
    </>
  );
}

/** 监督：盾牌、边界界桩、检查望远镜 */
function SupervisionProps() {
  return (
    <>
      {/* 盾牌 */}
      <path
        fill="#ce82ff"
        d="M130 76c14 8 30 12 44 12 0 48-16 76-44 92-28-16-44-44-44-92 14 0 30-4 44-12z"
      />
      <path stroke="#ffffff" strokeWidth="6" d="M112 124l14 14 26-30" />
      {/* 边界虚线与界桩 */}
      <path stroke="#9fb6d8" strokeDasharray="8 9" strokeWidth="3.5" d="M40 178h92M188 178h92" />
      <g>
        <rect fill="#ff9600" x="52" y="142" width="10" height="38" rx="4" />
        <path fill="#ffc800" d="M57 146l26 8-26 8z" />
      </g>
      <g>
        <rect fill="#ff9600" x="258" y="142" width="10" height="38" rx="4" />
        <path fill="#ffc800" d="M263 146l-26 8 26 8z" />
      </g>
      {/* 检查望远镜 */}
      <path fill="#1cb0f6" d="M216 92l34-22 10 16-34 22z" />
      <circle fill="#ddf4ff" cx="254" cy="76" r="12" />
      <path d="M226 104l-8 22" />
    </>
  );
}
