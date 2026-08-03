/**
 * format.ts — 표기 규칙 (디자인 시스템 CONTENT FUNDAMENTALS).
 *
 * 금액은 리스트에서 "82.4억", 승격 값에서 "7억 3,440만원".
 * 시각은 "2026.07.31 15:40". 숫자는 전부 IBM Plex Mono tabular 로 렌더한다.
 *
 * ⚠️ 값이 없으면 0 이나 '-' 를 지어내지 말고 null 을 그대로 흘려보낸다(규칙 2).
 *    화면이 "행 숨김"을 선택할 수 있어야 하기 때문이다.
 *
 * ⚠️ **통화는 시장을 따른다.** 미장 데이터는 달러인데 '원'을 붙이면 그냥 거짓말이다.
 *    실제로 \$55.2 짜리 단가가 "55.2원"으로, \$496,800 이 "50만"으로 찍혔다.
 *    그래서 금액 함수는 전부 현재 시장을 읽어 단위를 고른다.
 *    (인자로 넘기게 하면 호출부 한 곳만 빠져도 거짓이 되므로 기본값을 시장에서 가져온다)
 */
import { getMarket, MARKETS, type Market } from './market'
import type { AmountRange } from './types'

const 조 = 1_000_000_000_000
const 억 = 100_000_000
const 만 = 10_000

/** 달러 압축 단위. 한국식 만/억과 자릿수가 달라 따로 둔다 */
const USD_UNITS = [
  { v: 1_000_000_000_000, s: 'T' },
  { v: 1_000_000_000, s: 'B' },
  { v: 1_000_000, s: 'M' },
  { v: 1_000, s: 'K' },
] as const

function currencyOf(market: Market = getMarket()) {
  return MARKETS[market].currency
}

/**
 * 리스트용 압축 표기 — "1,535조", "82.4억", "3,440만", "5,120원"
 *
 * 조 단위가 없으면 시가총액이 "15,346,481억" 처럼 읽을 수 없는 숫자가 된다.
 * 대기업 시총은 조 단위가 기본이라 여기서 끊는다.
 */
export function formatAmountShort(v: number | null, market?: Market): string | null {
  if (v === null || !Number.isFinite(v)) return null
  const abs = Math.abs(v)

  if (currencyOf(market) === 'USD') {
    for (const u of USD_UNITS) {
      if (abs >= u.v) {
        const n = v / u.v
        return `$${Math.abs(n) >= 100 ? Math.round(n).toLocaleString() : n.toFixed(1)}${u.s}`
      }
    }
    // 1,000달러 미만은 센트까지 의미가 있다 (단가가 여기 들어온다)
    return `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  }
  if (abs >= 조) {
    const n = v / 조
    return `${Math.abs(n) >= 100 ? Math.round(n).toLocaleString() : n.toFixed(1)}조`
  }
  if (abs >= 억) {
    const n = v / 억
    // 100억 넘으면 소수점이 의미 없다
    return `${Math.abs(n) >= 100 ? Math.round(n).toLocaleString() : n.toFixed(1)}억`
  }
  if (abs >= 만) return `${Math.round(v / 만).toLocaleString()}만`
  return `${v.toLocaleString()}원`
}

/** 승격 값(22px Mono 700)용 정밀 표기 — "7억 3,440만원" */
export function formatAmountFull(v: number | null, market?: Market): string | null {
  if (v === null || !Number.isFinite(v)) return null

  if (currencyOf(market) === 'USD') {
    // 달러는 한국식으로 자리를 끊지 않는다. 천 단위 구분 + 센터 두 자리가 원문 표기다
    return `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString(undefined, {
      minimumFractionDigits: Math.abs(v) < 1000 ? 2 : 0,
      maximumFractionDigits: 2,
    })}`
  }

  const sign = v < 0 ? '-' : ''
  let rest = Math.abs(Math.round(v))
  const parts: string[] = []
  const jo = Math.floor(rest / 조)
  if (jo) {
    parts.push(`${jo.toLocaleString()}조`)
    rest -= jo * 조
  }
  const eok = Math.floor(rest / 억)
  if (eok) {
    parts.push(`${eok.toLocaleString()}억`)
    rest -= eok * 억
  }
  const man = Math.floor(rest / 만)
  if (man) {
    parts.push(`${man.toLocaleString()}만`)
    rest -= man * 만
  }
  if (rest || !parts.length) parts.push(rest.toLocaleString())
  return `${sign}${parts.join(' ')}원`
}

/** "1,234주" */
export function formatQuantity(v: number | null): string | null {
  if (v === null || !Number.isFinite(v)) return null
  return `${Math.abs(v).toLocaleString()}주`
}

/**
 * "5,120원" / "$55.20" — 단가처럼 단위를 그대로 보여야 하는 값.
 * 이름은 formatPrice 이었지만 미장에서 거짓이 되어 formatPrice 로 바꿨다.
 */
export function formatPrice(v: number | null, market?: Market): string | null {
  if (v === null || !Number.isFinite(v)) return null
  if (currencyOf(market) === 'USD') {
    // 미국 주가는 소수점 둘째 자리까지가 표준 표기다
    return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
  }
  return `${v.toLocaleString()}원`
}

/** "2026.07.31" */
export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const [y, m, d] = iso.slice(0, 10).split('-')
  return y && m && d ? `${y}.${m}.${d}` : null
}

/** "2026.07.31 15:40" */
export function formatDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return null
  const p = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}.${p(dt.getMonth() + 1)}.${p(dt.getDate())} ${p(dt.getHours())}:${p(dt.getMinutes())}`
}

/** "3일 전" · "방금" — 날짜 그룹 헤더와 신선도 라벨용 */
export function formatRelative(iso: string | null | undefined, now = Date.now()): string | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  const diffMin = Math.floor((now - t) / 60000)
  if (diffMin < 1) return '방금'
  if (diffMin < 60) return `${diffMin}분 전`
  const h = Math.floor(diffMin / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  return `${d}일 전`
}

/** 거래일과 공시일의 시차 — S2 의 정보 포인트 */
export function daysBetween(fromIso: string, toIso: string): number | null {
  const a = new Date(fromIso).getTime()
  const b = new Date(toIso).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.round((b - a) / 86400000)
}

/** 날짜 그룹 헤더 — "오늘" / "어제" / "2026.07.28 (화)" */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
export function formatDateGroup(iso: string, todayIso: string): string {
  const diff = daysBetween(iso, todayIso)
  if (diff === 0) return '오늘'
  if (diff === 1) return '어제'
  const dt = new Date(iso + 'T00:00:00')
  return `${formatDate(iso)} (${WEEKDAYS[dt.getDay()]})`
}

/**
 * 신고 금액 **구간** — 미국 의회 거래 전용.
 *
 * 의원은 정확한 금액을 신고하지 않고 11개 구간 중 하나를 고른다.
 * 그래서 중간값 같은 단일 숫자로 바꾸지 않고 **구간 그대로** 보여준다.
 * 구간을 하나의 수처럼 표시하면 있지도 않은 정밀도를 지어내는 것이다.
 *
 *   { min: 1001,    max: 15000 }   → "$1K–15K"
 *   { min: 1000001, max: 5000000 } → "$1M–5M"
 *   { min: 50000000, max: null }   → "$50M+"    (최상단 구간은 상한이 없다)
 */
export function formatAmountRange(r: AmountRange | null | undefined): string | null {
  if (!r || !Number.isFinite(r.min)) return null
  // 구간 경계는 $1,001 / $15,000 처럼 1 만큼 어긋나 있다. 읽는 사람에게 그 1은 의미가 없다
  const unit = (v: number) =>
    v >= 1_000_000
      ? `${Math.round(v / 1_000_000)}M`
      : v >= 1_000
        ? `${Math.round(v / 1_000)}K`
        : `${Math.round(v)}`
  const lo = unit(r.min)
  if (r.max === null || !Number.isFinite(r.max)) return `$${lo}+`
  return `$${lo}\u2013${unit(r.max)}`
}

/**
 * 비율 표기 — 등락률·배당수익률·PER·PBR.
 *
 * 소스가 주는 정밀도를 그대로 쓰면 "+2.8344%", "PER 30.4371" 이 된다.
 * 소수 넷째 자리는 읽는 사람에게 의미가 없고, 있지도 않은 정밀도를 주장한다
 * (시세는 15분 지연에 하루 단위 스냅샷이다).
 */
export function formatRatio(v: number | null, digits = 2): string | null {
  if (v === null || !Number.isFinite(v)) return null
  return v.toFixed(digits)
}

/** "+2.83%" · "-1.24%" — 부호를 붙인다 */
export function formatPercent(v: number | null, digits = 2): string | null {
  if (v === null || !Number.isFinite(v)) return null
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)}%`
}
