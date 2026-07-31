/**
 * types.ts — 화면 계약(schema). pipeline/ 이 생산하는 public/data/*.json 의 형태다.
 *
 * 출처: docs/04_dev/dev_prompts_webapp.md v2.1 STEP 2-A "목표 스키마".
 * 이 파일과 pipeline 의 출력이 어긋나면 화면이 조용히 깨지므로,
 * pipeline 쪽 변환 로직을 고칠 때 반드시 여기도 같이 고친다.
 *
 * ⚠️ 이 파일은 pipeline/src/types.ts 와 **같은 모양**이어야 한다. 한쪽만 고치면 화면이 조용히 깨진다.
 * ⚠️ 실명 공시 데이터다. 가공·추정값을 넣지 않는다 — 원문 그대로 + dartUrl 원문 링크가 원칙.
 *    확보되지 않는 값은 임의 채우기 대신 null 로 두고 화면에서 행을 숨긴다.
 */

/** 내부자(임원·주요주주) / 고위공직자. 공직자 데이터는 연 1회 공개라 신선도 라벨이 의무다 */
export type PersonType = 'insider' | 'official'

/** 국장 관습상 매수=빨강, 매도=파랑. 반전 금지 (tokens.ts directionColor 참조) */
export type Direction = 'buy' | 'sell'

/** 세부변동내역 1행 — 무상증여 등 단가 미기재 건은 price 가 null */
export interface TradeDetail {
  date: string
  price: number | null
  qty: number
}

export interface Disclosure {
  id: string
  personName: string
  personType: PersonType
  /** 직위 (예: 대표이사, 사외이사) */
  title: string
  company: string
  stockCode: string
  direction: Direction
  /** 무상증여·상속 등 단가가 공시에 없는 경우 null */
  unitPrice: number | null
  quantity: number
  /**
   * 단가x수량 합. **null 이 흔하다** — 단가 미기재(무상증여·권리행사)이거나
   * 한 보고서에 매수·매도가 섞여 순증감 수량과 단위가 안 맞는 경우.
   * 0 으로 대체하면 정렬·집계가 거짓이 되므로 화면이 null 을 그대로 다뤄야 한다.
   */
  totalAmount: number | null
  /** 실제 거래일 */
  tradeDate: string
  /** 공시일 — 거래일과의 시차가 S2 의 정보 포인트다 */
  discloseDate: string
  reportReason: string
  /** 사전공시(거래계획) 여부 */
  isPlanned: boolean
  /** 사전공시일 때 남은 일수 */
  dDay: number | null
  holdingBefore: number
  holdingAfter: number
  details: TradeDetail[]
  /** DART 원문 링크 — 모든 상세에 필수 (실명 데이터 책임) */
  dartUrl: string
  /** 정정공시로 대체된 건이면 true. upsert 시 표시용 */
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
  /** 최근 12개월 누적 순매수(원). 파생 집계이므로 화면에 "집계 기준" 문구를 병기한다 */
  totalNetBuy12m: number
}

/** 스파크라인 종가 시계열 — 1개월/3개월/1년 */
export interface Sparkline {
  m1: number[]
  m3: number[]
  y1: number[]
}

/**
 * 시세 항목은 전부 nullable 이다.
 * 공공데이터포털 키가 없는 동안 pipeline 이 null 을 채우며, 화면은 **해당 행을 숨긴다**.
 * 0 이나 '-' 로 대체하지 않는다(규칙 2 데이터 정직성).
 */
export interface Stock {
  code: string
  name: string
  prevClose: number | null
  /** 전일 대비 등락률(%) */
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
  /** 순매수(또는 순매도) 금액(원) */
  amount: number
}

/** 기간·방향별 파생 집계 */
export type Rankings = Record<RankingKind, Record<RankingPeriod, RankingEntry[]>>

export interface Meta {
  /**
   * ISO 8601. 신선도 라벨("공시 수집 N분 전")과 지연 배너의 근거.
   * 파이프라인이 한 번도 돌지 않았으면 null — 화면은 "수집 전"으로 표시하고
   * 절대 현재 시각으로 대체하지 않는다 (규칙 2 데이터 정직성).
   */
  lastUpdated: string | null
  /** 데이터 출처 표기 (공공 개방 데이터 약관) */
  sources: string[]
  counts: {
    disclosures: number
    persons: number
    stocks: number
  }
  /**
   * 공직자 재산공개 기준일 (ISO). 연 1회 공개라 '언제 시점의 자료인지'를
   * 화면 어디서든 붙일 수 있어야 한다(규칙 2). 데이터가 없으면 null.
   */
  officialsAsOf: string | null
  /** 시세 소스 연결 여부 — 화면이 "준비 중"을 정직하게 표시할 수 있게 한다 */
  priceDataAvailable: boolean
  /** 수집 시 건너뛴 건수와 사유 — 조용한 누락을 만들지 않는다 */
  skipped: { total: number; reasons: Record<string, number> }
}
