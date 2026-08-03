/**
 * types.ts — app/src/lib/types.ts 와 **같은 모양**이어야 한다.
 * 한쪽만 고치면 화면이 조용히 깨지므로 둘을 함께 고친다.
 * (별도 패키지라 import 로 공유하지 않고 의도적으로 복제한다 — app 과 의존성 분리 원칙)
 */

export type PersonType = 'insider' | 'official' | 'politician' | 'institution'
export type Direction = 'buy' | 'sell'

export interface TradeDetail {
  date: string
  price: number | null
  qty: number
}

export interface Disclosure {
  id: string
  personName: string
  personType: PersonType
  title: string
  company: string
  stockCode: string
  direction: Direction
  unitPrice: number | null
  /**
   * 순증감 주식 수. **미국 의회 신고는 주식 수를 공개하지 않는다** — 금액 구간만 낸다.
   * 그래서 null 이 될 수 있고, 화면은 0 대신 해당 표시를 숨긴다.
   */
  quantity: number | null
  totalAmount: number | null
  tradeDate: string
  discloseDate: string
  reportReason: string
  isPlanned: boolean
  dDay: number | null
  /** 변동 전 보유량. 의회 신고에는 없어서 null */
  holdingBefore: number | null
  /** 변동 후 보유량. 의회 신고에는 없어서 null */
  holdingAfter: number | null
  details: TradeDetail[]
  sourceUrl: string
  isAmended: boolean

  // ── 미장 전용 (국장에서는 전부 undefined) ──────────────────────────────────
  /**
   * 미국 의회 신고는 **정확한 금액을 요구하지 않는다.** 11개 구간 중 하나로만 신고한다.
   * 그래서 totalAmount 는 null 이고 대신 이 구간이 채워진다.
   * 화면은 구간을 **구간 그대로** 보여준다 — 중간값으로 바꿔 단일 숫자처럼 보이게 하면 거짓이다.
   */
  amountRange?: AmountRange | null
  /**
   * 누구의 계좌인가. 의원 본인이 아닌 경우가 흔하다.
   * 배우자 거래를 의원 본인 거래로 표시하면 실명 데이터에서 명백한 오보다.
   */
  ownerType?: OwnerType | null
  /**
   * SEC Form 4 거래 코드 원본. **P/S 만 시장 거래**이고
   * A(보상)·M(옵션행사)·F(세금 원천징수)·G(증여)는 매수·매도가 아니다.
   * direction 만 보고 "샀다"고 쓰면 안 되므로 원본 코드를 끝까지 들고 간다.
   */
  transactionCode?: string | null
  /** 하원 PTR 의 자산 종류 코드 — ST(주식)·OP(옵션)만 우리 대상 */
  assetType?: string | null
  /** 거래일 → 신고일 지연 일수. 미장 의회는 30~45일이 법정 기한이라 시차가 크다 */
  filingLagDays?: number | null
}

/** 신고 금액 구간 (미국 의회). 경계값 포함 */
export interface AmountRange {
  min: number
  /** 최상단 구간($50,000,000 초과)은 상한이 없어 null */
  max: number | null
}

/** 거래 계좌의 주체 — SP(배우자)·DC(자녀)·JT(공동) */
export type OwnerType = 'self' | 'spouse' | 'child' | 'joint'

export interface PersonHolding {
  stockCode: string
  stockName: string
  quantity: number
}

/**
 * 재산공개 관보 1건 — **문서 색인이지 재산 내용이 아니다.**
 *
 * 행정안전부_관보_공직자 재산 공개 API(15109164)가 주는 건 관보의 제목·발행일·발행기관과
 * 원문 뷰어 링크뿐이다. 개인별 금액·이름은 응답에 없고 관보 PDF 안에 있다.
 * 그래서 이 목록은 "언제 어떤 공개가 있었고 원문은 여기"까지만 말한다.
 */
export interface GazetteNotice {
  /** 관보번호 (cntntSeqNo) */
  id: string
  /** 관보 제목 — 예: 정부공직자윤리위원회공고제2026-8호(재산공개목록(수시)) */
  title: string
  /** 발행일 (ISO) */
  publishedAt: string
  /** 발행기관 — 인사혁신처 / 대법원 / 중앙선관위 */
  institution: string
  /** 근거법령 */
  law: string
  /** 정정 관보인지 */
  isCorrection: boolean
  /** 원문 뷰어 링크 (gwanbo.go.kr) */
  sourceUrl: string
}

/** 공직자 재산공개 1개 연도 — 연 1회 공개라 연도가 곧 기준시점이다 */
export interface OfficialAssetYear {
  /** 공개 연도 (예: 2026) */
  year: number
  /** 재산 신고 기준일 (ISO). 보통 전년 12월 31일 */
  asOf: string
  /** 신고 총재산(원) */
  totalAssets: number
  /** 그 중 주식 평가액(원). 자료에 없으면 null */
  stockValue: number | null
}

export interface Person {
  id: string
  name: string
  type: PersonType
  title: string
  company: string
  holdings: PersonHolding[]
  /**
   * 공직자만 채워진다. 재산공개는 **연 1회**이므로 화면은 반드시 기준일을 함께 보여준다(규칙 2).
   * 내부자는 빈 배열.
   */
  officialAssets?: OfficialAssetYear[]
  /** 공직자의 직위·소속기관 (예: 국회의원, OO부 장관) */
  officialOffice?: string
  /** 이 인물 자료의 출처 표기 — 실명 데이터라 개인 단위로 추적 가능해야 한다 */
  sourceNote?: string
  totalNetBuy12m: number
}

export interface Sparkline {
  m1: number[]
  m3: number[]
  y1: number[]
}

/** 종목코드 → 스파크라인 (sparklines.json) */
export type Sparklines = Record<string, Sparkline>

export interface Stock {
  code: string
  name: string
  /** 시장 구분 (KOSPI/KOSDAQ/KONEX). 시세 API 의 mrktCtg */
  market: string | null
  prevClose: number | null
  change: number | null
  marketCap: number | null
  volume: number | null
  per: number | null
  pbr: number | null
  divYield: number | null
  high52: number | null
  low52: number | null
  /** 시세 기준일 (거래일, ISO). 규칙 2 — 언제 시점의 값인지 화면에 붙일 수 있어야 한다 */
  priceAsOf: string | null
}

export type RankingPeriod = '7' | '30' | '90'
export type RankingKind = 'netBuy' | 'netSell'

export interface RankingEntry {
  rank: number
  personId: string
  personName: string
  personType: PersonType
  company: string
  amount: number
}

export type Rankings = Record<RankingKind, Record<RankingPeriod, RankingEntry[]>>

/** 13F 보유 1행 */
export interface InstitutionHolding {
  /** 13F 는 CUSIP 으로 신고한다. 티커 매핑에 실패하면 null (종목 링크를 걸지 않는다) */
  ticker: string | null
  cusip: string
  name: string
  /** 평가액(달러). 2023년 이후 13F 는 천 달러가 아니라 **달러 단위**다 */
  value: number
  shares: number
  /** 옵션 포지션이면 채워진다. 현물 보유와 섞어 세면 안 된다 */
  putCall: 'put' | 'call' | null
}

/**
 * 13F 를 제출한 기관의 분기 보유 현황.
 *
 * ⚠️ **"지금 들고 있는 것"이 아니다.** 13F 는 분기 종료 후 45일 이내 제출이라
 *    우리가 보는 건 최대 4.5개월 묵은 스냅샷이고, 공매도·채권·해외주식은 아예 빠진다.
 *    공직자 재산공개에 "연 1회 공개"를 붙였듯 여기엔 기준일과 제출일이 둘 다 필요하다.
 */
export interface Institution {
  /** SEC CIK */
  id: string
  name: string
  /** 보고 기준일 = 분기 말 (ISO) */
  periodOfReport: string
  /** 실제 제출일 (ISO). periodOfReport 와의 시차가 곧 지연이다 */
  filedAt: string
  /** 신고 포지션 합계(달러). 잘라내기 전 **전체** 기준이다 */
  totalValue: number
  /**
   * 신고된 전체 종목 수. holdings 는 상위 일부만 담는다 —
   * 시타델은 12,857종목이라 전부 실으면 파일이 수십 MB 가 된다.
   * 화면이 "상위 50 / 전체 12,857"이라고 말할 수 있어야 잘라낸 사실이 숨지 않는다.
   */
  holdingCount: number
  holdings: InstitutionHolding[]
  /** SEC 원문 링크 — 실명 데이터 책임 */
  sourceUrl: string
}

export interface Meta {
  /** 이 파일이 어느 시장 것인지. data/kr, data/us 를 섞어 읽는 사고를 막는다 */
  market: 'kr' | 'us'
  lastUpdated: string | null
  sources: string[]
  counts: { disclosures: number; persons: number; stocks: number }
  /**
   * 공직자 재산공개 기준일 (ISO). 연 1회 공개라 '언제 시점의 자료인지'를
   * 화면 어디서든 붙일 수 있어야 한다(규칙 2). 데이터가 없으면 null.
   */
  officialsAsOf: string | null
  /** 시세 소스 미연결 상태를 화면이 알 수 있게 — 값을 추정하지 않고 사실을 노출한다 */
  priceDataAvailable: boolean
  /** 스파크라인(과거 시계열) 확보 여부. 미장 무료 티어엔 시계열이 없어 차트를 숨긴다 */
  sparklineAvailable: boolean
  /** 수집 시 건너뛴 건수와 사유 — 조용한 누락을 만들지 않는다 */
  skipped: { total: number; reasons: Record<string, number> }
}
