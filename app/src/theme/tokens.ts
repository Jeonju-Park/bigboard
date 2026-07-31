/**
 * tokens.ts — 빅보드(BIG board) 디자인 토큰 · 단일 진실
 *
 * 출처: docs/03_design/bx_designsystem_source_bigshot_radar.md §2~4 (2026-07-31 확정)
 *       + 클로드 디자인 프로젝트 9e45dbcf-da6f-407c-a2c0-3090c31d8382 의 _ds/tokens/*.css
 *
 * ⚠️ CLAUDE.md 절대규칙 3 — 색·간격·타이포의 raw 값은 **이 파일에만** 존재한다.
 *    컴포넌트/CSS에서는 절대 hex·px를 직접 쓰지 말고 아래 두 경로 중 하나만 쓴다:
 *      · CSS  → var(--coral-500) 같은 CSS 변수 (tokens.generated.css 가 이 파일에서 생성됨)
 *      · TSX  → import { cssVar } from '@/theme/tokens'  → cssVar.color.brandSurface
 *
 *    `npm run build:tokens` 가 이 파일 → src/theme/tokens.generated.css 를 생성한다.
 *    predev/prebuild 훅에 걸려 있으므로 값을 고치면 자동 반영된다. CSS를 직접 고치지 말 것.
 */

// ─────────────────────────────────────────────────────────────────────────────
// §2 색상 — 60 / 28 / 12 면적 예산 (화면 면적 기준)
//
//   Base  ~60%  bg-primary   #FFFFFF   모든 화면 기본 배경
//   Sub   ~28%  bg-secondary #F6F7F8   그룹 구분 면, 입력 필드, 티커 바
//   Main  ~12%  coral-500    #FF7355   브랜드 면 전용 — 히어로·CTA·활성 탭·로고
//   Data   ≤3%  coral-300    #FFAC98   데이터 그래픽 — 랭킹 1위 바
//   Text    —   ink          #17191C   글자·아이콘 색. **브랜드 컬러가 아니다**
// ─────────────────────────────────────────────────────────────────────────────

/** Gray Scale 9단계 (§2) */
export const gray = {
  50: '#FAFBFC',
  100: '#F6F7F8',
  200: '#E9EBED',
  300: '#D6DADD',
  400: '#B0B6BC',
  500: '#8A9199',
  600: '#5F666E',
  700: '#3F454C',
  800: '#26292E',
  900: '#17191C',
} as const

/**
 * Coral Scale (Lab-H 40 고정, §2)
 * coral-400 보다 진한 단계는 만들지 않는다 — 매수 레드 #D93B3B 와 dE 30 이하로 충돌한다.
 */
export const coral = {
  50: '#FFF1ED', //  흰 배경 대비 1.10 · 아주 연한 면
  100: '#FFE2DA', //  1.22 · 칩·아바타
  200: '#FFCCBE', //  1.44 · 선택 상태
  300: '#FFAC98', //  1.81 · 랭킹 1위 바 (매수레드 dE 45.4)
  400: '#FF8F74', //  2.23 · 호버
  500: '#FF7355', //  2.68 · 브랜드 기본. ink 대비 6.57 (AA)
} as const

/** 글자·아이콘 색. 검은 앱바·검은 히어로·검은 배경 블록은 금지 (§2) — 앱 아이콘·파비콘만 예외 */
export const ink = '#17191C'

/**
 * 시맨틱 — 국장 관습, 변경 불가 (§2).
 * 숫자·태그에만 쓴다. 배경 면으로 쓰지 않는다.
 */
export const semantic = {
  buy: '#D93B3B', // 매수/상승
  sell: '#2563A8', // 매도/하락
} as const

/**
 * 역할 별칭 — 이름으로 오용을 막는다.
 *
 * ⚠️ coral 은 **면으로만** 쓴다. 흰 배경 위 대비가 2.68이라
 *    선·아이콘·테두리·텍스트 색으로 쓰면 WCAG 1.4.11(비텍스트 3:1) 위반이다.
 * ⚠️ coral 면 위에는 ink 만 얹는다(6.57:1). 흰 글자는 2.68이라 금지.
 * ⚠️ 데이터 그래픽에는 coral-500 을 쓰지 않는다 — 매수 레드와 dE 18.7 로 뭉친다.
 */
export const color = {
  // 면
  bgPrimary: '#FFFFFF',
  bgSecondary: gray[100],
  surfacePage: '#FFFFFF',
  surfaceSunken: gray[100],
  surfaceCard: '#FFFFFF',

  // 브랜드
  brandSurface: coral[500], //  면 전용
  brandSurfaceHover: coral[400],
  brandData: coral[300], //  데이터 그래픽 전용
  onBrand: ink, //  coral 면 위 글자

  // 선
  borderHairline: gray[200], //  헤어라인 디바이더 1px 전용

  // 글자 (§3 계층 법칙의 색 성분)
  textPrimary: gray[900],
  textBody: gray[800],
  textSub: gray[700],
  textCaption: gray[500],
  textMicro: gray[400], //  L5 위트 자막 전용

  // 아이콘
  iconDefault: ink,
  iconMuted: gray[500],

  // 상호작용
  interactiveInk: ink,
  interactivePressed: gray[700],
  disabledFg: gray[400],
  disabledBg: gray[100],

  // 시맨틱
  semanticBuy: semantic.buy,
  semanticSell: semantic.sell,
} as const

/**
 * 그라데이션 조항 (§8) — 2스톱·135° 고정.
 * 허용: 로고 · 랜딩 히어로 · 스플래시 · OG 이미지 · 스토어 그래픽 **5곳뿐**.
 * 앱 UI 내부(카드·버튼·바·칩·배경 면)에는 쓰지 않는다.
 */
export const gradient = {
  sunset: 'linear-gradient(135deg, #FF7355 0%, #FFB964 100%)',
} as const

// ─────────────────────────────────────────────────────────────────────────────
// §3 타이포그래피 — 3서체 역할 분리 (Inter/Roboto 기본값 회피)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ 폰트 패밀리명 주의:
 * jsdelivr 의 동적 서브셋 CSS 가 선언하는 이름은 "Pretendard Variable" 이다.
 * 스택에 "Pretendard" 만 적으면 **로컬에 Pretendard 를 설치한 기기에서만** 정상으로 보이고
 * 나머지 사용자에게는 조용히 시스템 폰트로 폴백된다. 두 이름을 모두 적는다.
 * ("Pretendard" 는 로컬 설치본·자체 호스팅 전환 대비 폴백)
 */
export const font = {
  /** Display — Paperlogy 800. 워드마크 + **화면당 최대 1회** display(24px)만. 그 외 전면 금지 */
  display: '"Paperlogy", "Pretendard Variable", "Pretendard", sans-serif',
  /** Body — Pretendard. 제목·본문·라벨·캡션·micro 전부 = 화면 텍스트의 사실상 전량 */
  body: '"Pretendard Variable", "Pretendard", sans-serif',
  /** Numeric — IBM Plex Mono. 모든 숫자. font-variant-numeric: tabular-nums 필수 */
  numeric: '"IBM Plex Mono", monospace',
} as const

/**
 * 타입 스케일 — 큰 글자 지양, 최대 24px.
 * 계층 법칙: 레벨마다 크기·굵기·색 3요소를 **동시에** 규정한다. 임의 조합 금지.
 * 아래 `textStyle` 이 그 조합을 잠근 형태이므로 실제 코드는 textStyle 을 쓴다.
 */
export const fontSize = {
  micro: '11px',
  caption: '12px',
  bodyS: '13px',
  body: '15px',
  label: '15px',
  titleS: '17px',
  title: '20px',
  display: '24px',
  /** 문장 밖으로 '승격'된 값 전용 (§3) — 예: 총액을 별도 줄에 */
  promote: '22px',
} as const

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const

export const lineHeight = {
  body: 1.5,
  heading: 1.25,
  numeric: 1.2,
} as const

/**
 * L1~L5 계층 (§3) — 크기·굵기·색을 한 덩어리로 묶어 임의 조합을 차단한다.
 *   L1 화면 제목  : display 또는 title, 700+, ink
 *   L2 섹션 제목  : titleS, 600, ink
 *   L3 본문       : body, 400, gray-800
 *   L4 보조 설명  : caption, 400, gray-500
 *   L5 위트 자막  : micro, 400, gray-400  ← **여기만 유머 허용**
 */
export const textStyle = {
  /** L1 — 화면당 1회 이하 */
  display: {
    fontFamily: font.display,
    fontSize: fontSize.display,
    fontWeight: fontWeight.extrabold,
    color: ink,
    lineHeight: lineHeight.heading,
    letterSpacing: '-0.01em',
  },
  /** L1 */
  title: {
    fontFamily: font.body,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: ink,
    lineHeight: lineHeight.heading,
    letterSpacing: '-0.01em',
  },
  /** L2 */
  titleS: {
    fontFamily: font.body,
    fontSize: fontSize.titleS,
    fontWeight: fontWeight.semibold,
    color: ink,
    lineHeight: lineHeight.heading,
    letterSpacing: 'normal',
  },
  label: {
    fontFamily: font.body,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: ink,
    lineHeight: 1.4,
    letterSpacing: 'normal',
  },
  /** L3 — base */
  body: {
    fontFamily: font.body,
    fontSize: fontSize.body,
    fontWeight: fontWeight.regular,
    color: gray[800],
    lineHeight: lineHeight.body,
    letterSpacing: 'normal',
  },
  bodyS: {
    fontFamily: font.body,
    fontSize: fontSize.bodyS,
    fontWeight: fontWeight.regular,
    color: gray[700],
    lineHeight: lineHeight.body,
    letterSpacing: 'normal',
  },
  /** L4 */
  caption: {
    fontFamily: font.body,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.regular,
    color: gray[500],
    lineHeight: lineHeight.body,
    letterSpacing: 'normal',
  },
  /** L5 — 위트는 오직 이 레이어에만 */
  micro: {
    fontFamily: font.body,
    fontSize: fontSize.micro,
    fontWeight: fontWeight.regular,
    color: gray[400],
    lineHeight: lineHeight.body,
    letterSpacing: 'normal',
  },
  /** 모든 숫자 */
  num: {
    fontFamily: font.numeric,
    fontSize: 'inherit',
    fontWeight: fontWeight.medium,
    color: 'inherit',
    lineHeight: lineHeight.numeric,
    letterSpacing: '-0.02em',
  },
  /**
   * 본문 안 강조의 **최대치** (§3): Numeric + 600 + ink.
   * 배경·색·밑줄·크기 키우기는 전면 금지. 텍스트 마커 하이라이트는 2026-07-31 폐기.
   */
  emph: {
    fontFamily: font.numeric,
    fontSize: 'inherit',
    fontWeight: fontWeight.semibold,
    color: ink,
    lineHeight: lineHeight.numeric,
    letterSpacing: '-0.02em',
  },
  /** 더 강조할 값은 문장 안에서 키우지 말고 **문장 밖으로 승격**시킨다 (§3) */
  promote: {
    fontFamily: font.numeric,
    fontSize: fontSize.promote,
    fontWeight: fontWeight.bold,
    color: ink,
    lineHeight: lineHeight.numeric,
    letterSpacing: '-0.02em',
  },
  promoteLabel: {
    fontFamily: font.body,
    fontSize: fontSize.micro,
    fontWeight: fontWeight.regular,
    color: gray[500],
    lineHeight: 1.4,
    letterSpacing: 'normal',
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// §4 Spacing & 그룹핑 — 4pt 그리드 + 근접성 비율
//   근접성 법칙: 관련 요소 ≤ 8px / 그룹 사이 ≥ 24px / 섹션 사이 ≥ 40px
//   내부:외부 간격 비율 최소 1:3 → 선 없이도 그룹핑이 읽히게
// ─────────────────────────────────────────────────────────────────────────────

export const space = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
} as const

export const layout = {
  /** 화면 좌우 여백 고정 (§4) */
  gutterScreen: '20px',
  /** 터치 타깃 최소 (§4) */
  touchMin: '44px',
  /** 관련 요소 사이 */
  gapIntra: '8px',
  /** 그룹 사이 */
  gapGroup: '24px',
  /** 섹션 사이 */
  gapSection: '40px',
  /** 모바일 뷰포트 최대폭 — 이보다 넓으면 중앙 정렬하고 바깥은 bg-secondary */
  appMaxWidth: '480px',
  /** 활성 상태 표시선 두께 — 세그먼트 탭 밑줄, 온보딩 진행바, 예고 배너 좌측 바 */
  underlineActive: '2px',
  /** 예고·강조 블록의 좌측 바 (IA: 캘린더·예고 배너의 4px ink 바) */
  accentBar: '4px',
} as const

/**
 * §5 — 카드는 "공시 카드" 하나뿐. radius 토큰도 사실상 그 하나를 위해 존재한다.
 * 카드 허용 조건: ①독립적으로 탭 되는 단위 ②공유/캡처되는 단위 — 둘 다 충족 시에만.
 * 기본은 borderless: 리스트는 헤어라인 디바이더와 여백으로 구분한다(신문 지면처럼).
 */
export const radius = {
  card: '12px',
  chip: '999px',
  field: '8px',
} as const

export const border = {
  hairline: `1px solid ${gray[200]}`,
} as const

/**
 * §5 모션 — 티커 흐름 + 랭킹 레이스 바 200ms ease-out, CTA 탭 스케일.
 * 그 외 등장 애니메이션(일괄 fade-in) 금지.
 */
export const motion = {
  race: '200ms cubic-bezier(0, 0, 0.2, 1)',
  press: '120ms cubic-bezier(0, 0, 0.2, 1)',
} as const

/**
 * §6 아이콘 — Material Symbols Rounded, 20/24px, weight 400.
 * 색은 ink(icon-default) 또는 gray-500(icon-muted). 이모지·이모티콘 전면 금지.
 */
export const iconSize = {
  sm: '20px',
  md: '24px',
} as const

export const zIndex = {
  appBar: 10,
  tabBar: 20,
  overlay: 100,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// CSS 변수 매핑 — 이 맵이 tokens.generated.css 를 만든다.
// TSX 에서 값이 필요할 땐 raw 값 대신 cssVar.* 를 써서 런타임 일관성을 유지한다.
// ─────────────────────────────────────────────────────────────────────────────

/** CSS 변수명 → 값. build:tokens 가 이걸 그대로 :root 로 찍는다. */
export const cssVariables: Record<string, string> = {
  // gray
  ...Object.fromEntries(Object.entries(gray).map(([k, v]) => [`--gray-${k}`, v])),
  // coral
  ...Object.fromEntries(Object.entries(coral).map(([k, v]) => [`--coral-${k}`, v])),
  '--ink': ink,

  '--bg-primary': color.bgPrimary,
  '--bg-secondary': color.bgSecondary,
  '--surface-page': color.surfacePage,
  '--surface-sunken': color.surfaceSunken,
  '--surface-card': color.surfaceCard,

  '--brand-surface': color.brandSurface,
  '--brand-surface-hover': color.brandSurfaceHover,
  '--brand-data': color.brandData,
  '--on-brand': color.onBrand,

  '--border-hairline': color.borderHairline,
  '--hairline': border.hairline,

  '--text-primary': color.textPrimary,
  '--text-body': color.textBody,
  '--text-sub': color.textSub,
  '--text-caption': color.textCaption,
  '--text-micro': color.textMicro,

  '--icon-default': color.iconDefault,
  '--icon-muted': color.iconMuted,
  '--interactive-ink': color.interactiveInk,
  '--interactive-pressed': color.interactivePressed,
  '--disabled-fg': color.disabledFg,
  '--disabled-bg': color.disabledBg,

  '--semantic-buy': color.semanticBuy,
  '--semantic-sell': color.semanticSell,

  '--grad-sunset': gradient.sunset,

  '--font-display': font.display,
  '--font-body': font.body,
  '--font-numeric': font.numeric,

  ...Object.fromEntries(Object.entries(fontSize).map(([k, v]) => [`--size-${kebab(k)}`, v])),
  '--leading-body': String(lineHeight.body),
  '--leading-heading': String(lineHeight.heading),
  '--leading-numeric': String(lineHeight.numeric),

  ...Object.fromEntries(Object.entries(space).map(([k, v]) => [`--space-${k}`, v])),
  '--gutter-screen': layout.gutterScreen,
  '--touch-min': layout.touchMin,
  '--gap-intra': layout.gapIntra,
  '--gap-group': layout.gapGroup,
  '--gap-section': layout.gapSection,
  '--app-max-width': layout.appMaxWidth,
  '--underline-active': layout.underlineActive,
  '--accent-bar': layout.accentBar,

  '--icon-size-sm': iconSize.sm,
  '--icon-size-md': iconSize.md,

  '--radius-card': radius.card,
  '--radius-chip': radius.chip,
  '--radius-field': radius.field,

  '--motion-race': motion.race,
  '--motion-press': motion.press,
}

function kebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
}

/**
 * TSX 인라인 스타일이나 SVG 속성에서 토큰이 필요할 때 쓰는 참조.
 * raw 값이 아니라 var() 문자열이므로 tokens.ts 를 고치면 그대로 따라온다.
 */
export const cssVar = {
  color: {
    bgPrimary: 'var(--bg-primary)',
    bgSecondary: 'var(--bg-secondary)',
    brandSurface: 'var(--brand-surface)',
    brandData: 'var(--brand-data)',
    onBrand: 'var(--on-brand)',
    ink: 'var(--ink)',
    textBody: 'var(--text-body)',
    textCaption: 'var(--text-caption)',
    textMicro: 'var(--text-micro)',
    borderHairline: 'var(--border-hairline)',
    semanticBuy: 'var(--semantic-buy)',
    semanticSell: 'var(--semantic-sell)',
  },
  space: {
    1: 'var(--space-1)',
    2: 'var(--space-2)',
    3: 'var(--space-3)',
    4: 'var(--space-4)',
    5: 'var(--space-5)',
    6: 'var(--space-6)',
    8: 'var(--space-8)',
    10: 'var(--space-10)',
    12: 'var(--space-12)',
  },
  motion: {
    race: 'var(--motion-race)',
    press: 'var(--motion-press)',
  },
} as const

/** 방향(매수/매도) → 시맨틱 색 CSS 변수. 국장 관습이라 반전 금지 */
export function directionColor(direction: 'buy' | 'sell'): string {
  return direction === 'buy' ? 'var(--semantic-buy)' : 'var(--semantic-sell)'
}
