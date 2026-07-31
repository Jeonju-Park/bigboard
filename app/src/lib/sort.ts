/**
 * sort.ts — 목록 정렬·기간 필터 옵션. 홈·캘린더가 공유한다.
 *
 * ⚠️ 금액 정렬에서 `totalAmount === null` 인 건(단가 미기재·혼합 보고서)을
 *    0 으로 취급하면 "거래액 적은 순" 맨 위를 전부 차지해 거짓 순위가 된다.
 *    금액을 모르는 건은 **항상 뒤로** 보낸다.
 */
import type { Disclosure } from './types'

export const SORT_OPTIONS = [
  { value: 'recent', label: '최신순', note: '공시일 기준' },
  { value: 'amountDesc', label: '거래액 많은 순' },
  { value: 'amountAsc', label: '거래액 적은 순' },
] as const

export type SortKey = (typeof SORT_OPTIONS)[number]['value']

export const PERIOD_OPTIONS = [
  { value: 'all', label: '전체 기간' },
  { value: '1', label: '오늘' },
  { value: '7', label: '최근 7일' },
  { value: '30', label: '최근 30일' },
] as const

export type PeriodKey = (typeof PERIOD_OPTIONS)[number]['value']

export function periodLabel(p: PeriodKey): string {
  return PERIOD_OPTIONS.find((o) => o.value === p)?.label ?? '전체 기간'
}

export function sortLabel(s: SortKey): string {
  return SORT_OPTIONS.find((o) => o.value === s)?.label ?? '최신순'
}

/** 공시일 기준 기간 필터 */
export function filterByPeriod<T extends { discloseDate: string }>(list: T[], period: PeriodKey): T[] {
  if (period === 'all') return list
  const days = Number(period)
  const cutoff = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10)
  return list.filter((d) => d.discloseDate >= cutoff)
}

export function sortDisclosures(list: Disclosure[], key: SortKey): Disclosure[] {
  const copy = [...list]
  if (key === 'recent') {
    return copy.sort((a, b) =>
      b.discloseDate === a.discloseDate ? b.id.localeCompare(a.id) : b.discloseDate.localeCompare(a.discloseDate),
    )
  }
  // 금액 미상은 순위에서 빼고 뒤에 붙인다 — 0 으로 넣으면 "적은 순" 상위가 전부 미상이 된다
  const known = copy.filter((d) => d.totalAmount !== null)
  const unknown = copy.filter((d) => d.totalAmount === null)
  known.sort((a, b) => (key === 'amountDesc' ? b.totalAmount! - a.totalAmount! : a.totalAmount! - b.totalAmount!))
  return [...known, ...unknown]
}

/** 금액 미상 건이 정렬에서 제외됐음을 화면이 알릴 수 있게 */
export function unknownAmountCount(list: Disclosure[]): number {
  return list.filter((d) => d.totalAmount === null).length
}
