/**
 * format.ts — 표기 규칙 (디자인 시스템 CONTENT FUNDAMENTALS).
 *
 * 금액은 리스트에서 "82.4억", 승격 값에서 "7억 3,440만원".
 * 시각은 "2026.07.31 15:40". 숫자는 전부 IBM Plex Mono tabular 로 렌더한다.
 *
 * ⚠️ 값이 없으면 0 이나 '-' 를 지어내지 말고 null 을 그대로 흘려보낸다(규칙 2).
 *    화면이 "행 숨김"을 선택할 수 있어야 하기 때문이다.
 */

const 조 = 1_000_000_000_000
const 억 = 100_000_000
const 만 = 10_000

/**
 * 리스트용 압축 표기 — "1,535조", "82.4억", "3,440만", "5,120원"
 *
 * 조 단위가 없으면 시가총액이 "15,346,481억" 처럼 읽을 수 없는 숫자가 된다.
 * 대기업 시총은 조 단위가 기본이라 여기서 끊는다.
 */
export function formatAmountShort(v: number | null): string | null {
  if (v === null || !Number.isFinite(v)) return null
  const abs = Math.abs(v)
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
export function formatAmountFull(v: number | null): string | null {
  if (v === null || !Number.isFinite(v)) return null
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

/** "5,120원" — 단가처럼 원 단위를 그대로 보여야 하는 값 */
export function formatWon(v: number | null): string | null {
  if (v === null || !Number.isFinite(v)) return null
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
