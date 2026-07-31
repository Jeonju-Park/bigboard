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

export interface Person {
  id: string
  name: string
  type: PersonType
  title: string
  company: string
  holdings: PersonHolding[]
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
  prevClose: number | null
  change: number | null
  marketCap: number | null
  volume: number | null
  per: number | null
  pbr: number | null
  divYield: number | null
  high52: number | null
  low52: number | null
  sparkline: Sparkline
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
