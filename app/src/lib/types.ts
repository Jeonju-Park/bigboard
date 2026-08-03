/**
 * types.ts — 화면 계약(schema). pipeline/ 이 생산하는 public/data/*.json 의 형태다.
 *
 * 출처: docs/04_dev/dev_prompts_webapp.md v2.1 STEP 2-A "목표 스키마".
 * 이 파일과 pipeline 의 출력이 어긋나면 화면이 조용히 깨지므로,
 * pipeline 쪽 변환 로직을 고칠 때 반드시 여기도 같이 고친다.
 *
 * ⚠️ 이 파일은 pipeline/src/types.ts 와 **같은 모양**이어야 한다. 한쪽만 고치면 화면이 조용히 깨진다.
 * ⚠️ 실명 공시 데이터다. 가공·추정값을 넣지 않는다 — 원문 그대로 + sourceUrl 원문 링크가 원칙.
 *    확보되지 않는 값은 임의 채우기 대신 null 로 두고 화면에서 행을 숨긴다.
 */

/** 내부자(임원·주요주주) / 고위공직자. 공직자 데이터는 연 1회 공개라 신선도 라벨이 의무다 */
export type PersonType = 'insider' | 'official' | 'politician' | 'institution'

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
  /**
   * 원문 링크 — 모든 상세에 필수 (실명 데이터 책임).
   * 국장은 DART, 미장은 SEC EDGAR 또는 하원 공시 PDF.
   * 예전 이름은 dartUrl 이었는데 미장에서는 거짓이라 바꿨다.
   */
  sourceUrl: string
  /** 정정공시로 대체된 건이면 true. upsert 시 표시용 */
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
  /** 최근 12개월 누적 순매수(원). 파생 집계이므로 화면에 "집계 기준" 문구를 병기한다 */
  totalNetBuy12m: number
}

/**
 * 스파크라인 종가 시계열 — 1개월/3개월/1년.
 *
 * **stocks.json 이 아니라 sparklines.json 으로 분리했다.** 종목당 100여 개의 숫자라
 * 합치면 gzip 200KB 가 넘는데, 정작 필요한 곳은 종목·피드 상세 두 화면뿐이다.
 * 탐색·검색·마이가 그 무게를 같이 지불할 이유가 없다.
 */
export interface Sparkline {
  m1: number[]
  m3: number[]
  y1: number[]
}

/** 종목코드 → 스파크라인 (sparklines.json) */
export type Sparklines = Record<string, Sparkline>

/**
 * 시세 항목은 전부 nullable 이다.
 * 공공데이터포털 키가 없는 동안 pipeline 이 null 을 채우며, 화면은 **해당 행을 숨긴다**.
 * 0 이나 '-' 로 대체하지 않는다(규칙 2 데이터 정직성).
 */
export interface Stock {
  code: string
  name: string
  /** 시장 구분 (KOSPI/KOSDAQ/KONEX). 시세 API 의 mrktCtg */
  market: string | null
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
  /** 순매수(또는 순매도) 금액(원) */
  amount: number
}

/** 기간·방향별 파생 집계 */
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
  /** 신고 포지션 합계(달러) */
  totalValue: number
  holdings: InstitutionHolding[]
  /** SEC 원문 링크 — 실명 데이터 책임 */
  sourceUrl: string
}

export interface Meta {
  /** 이 파일이 어느 시장 것인지. data/kr, data/us 를 섞어 읽는 사고를 막는다 */
  market: 'kr' | 'us'
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
  /**
   * 스파크라인(과거 시계열) 확보 여부.
   * 미장은 Finnhub 무료 티어에서 candle 이 403 이라 시계열이 없다.
   * 0 으로 채운 가짜 차트를 그리지 않고 **차트 자체를 숨기기 위한** 플래그다.
   */
  sparklineAvailable: boolean
  /** 수집 시 건너뛴 건수와 사유 — 조용한 누락을 만들지 않는다 */
  skipped: { total: number; reasons: Record<string, number> }
}
