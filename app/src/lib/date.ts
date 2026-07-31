/**
 * date.ts — '오늘'과 날짜 문자열을 다루는 유일한 통로.
 *
 * ⚠️ `new Date().toISOString().slice(0, 10)` 을 쓰지 말 것.
 *    toISOString 은 **UTC 기준**이라 한국(UTC+9)에서는 자정~오전 9시 사이에
 *    하루 전 날짜가 나온다. 실제로 캘린더가 8월 1일 칸을 "2026-07-31" 로
 *    표시하는 버그가 있었다.
 *
 * 우리 데이터(DART 공시일·거래일)는 전부 **한국 날짜**다. 따라서 브라우저의
 * 로컬 날짜 부품(getFullYear/getMonth/getDate)으로 문자열을 만든다.
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** Date → 'YYYY-MM-DD' (로컬 시간대 기준) */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 오늘 'YYYY-MM-DD' */
export function todayKey(): string {
  return toDateKey(new Date())
}

/** n일 전 'YYYY-MM-DD'. 기간 필터의 컷오프에 쓴다 */
export function daysAgoKey(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return toDateKey(d)
}

/** 'YYYY-MM-DD' → Date (로컬 자정). 문자열을 Date 로 되돌릴 때 UTC 로 새지 않게 한다 */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}
