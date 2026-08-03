/**
 * types.ts — app/src/lib/types.ts 와 **같은 모양**이어야 한다.
 * 한쪽만 고치면 화면이 조용히 깨지므로 둘을 함께 고친다.
 * (별도 패키지라 import 로 공유하지 않고 의도적으로 복제한다 — app 과 의존성 분리 원칙)
 */

export type PersonType = 'insider' | 'official'
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
  quantity: number
  totalAmount: number | null
  tradeDate: string
  discloseDate: string
  reportReason: string
  isPlanned: boolean
  dDay: number | null
  holdingBefore: number
  holdingAfter: number
  details: TradeDetail[]
  dartUrl: string
  isAmended: boolean
}

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

export interface Meta {
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
  /** 수집 시 건너뛴 건수와 사유 — 조용한 누락을 만들지 않는다 */
  skipped: { total: number; reasons: Record<string, number> }
}
