/**
 * person.ts — 인물 행에 어떤 금액을 보여줄지 한 곳에서 정한다.
 *
 * ⚠️ 내부자와 공직자는 **성격이 다른 데이터**다.
 *
 *   내부자 — DART 공시. 언제 얼마에 사고팔았는지가 나온다 → **거래 흐름**(12개월 순매수)
 *   공직자 — 재산공개. 연 1회 신고한 **잔액 스냅샷**뿐이고 거래 시점은 공개되지 않는다
 *
 * 그래서 공직자의 `totalNetBuy12m` 은 계산 자체가 불가능해 0 이다.
 * 이걸 모르고 "순매수 0 이 아닌 사람"으로 목록을 만들면 공직자가 전부 사라진다 —
 * 실제로 탐색 화면에서 그런 버그가 있었다.
 *
 * 인물 행의 대표 금액은 반드시 이 함수를 거친다.
 */
import type { Person } from './types'
import { formatDate } from './format'

export interface PersonHeadline {
  /** 표시할 금액 (없으면 null → 화면이 숨긴다) */
  amount: number | null
  /** 금액 아래 붙는 작은 설명. 공직자는 기준일이 의무다(규칙 2) */
  note: string | null
  /** 이 금액이 무엇인지 — 섹션 헤더 등에서 쓴다 */
  kind: '순매수' | '순매도' | '주식 평가액' | '총재산' | null
}

export function personHeadline(p: Person): PersonHeadline {
  if (p.type === 'official') {
    // 가장 최근 공개 연도를 쓴다
    const latest = [...(p.officialAssets ?? [])].sort((a, b) => b.year - a.year)[0]
    if (!latest) return { amount: null, note: null, kind: null }

    // ⚠️ 주식 평가액이 없다고 총재산으로 대체하지 않는다.
    //    '주식 평가액 순' 목록에 총재산을 섞으면 서로 다른 값이 한 줄에 서고,
    //    주식이 적고 부동산이 많은 사람이 상위로 올라가 헤더가 거짓말이 된다.
    //    자료에 증권 항목이 없으면 '모른다'고 말한다.
    if (latest.stockValue === null) {
      return { amount: null, note: `${formatDate(latest.asOf)} 기준 · 증권 항목 미기재`, kind: null }
    }
    return {
      amount: latest.stockValue,
      // 연 1회 자료라 '언제 시점인지'를 반드시 함께 보여준다
      note: `${formatDate(latest.asOf)} 기준`,
      kind: '주식 평가액',
    }
  }

  if (p.totalNetBuy12m === 0) return { amount: null, note: null, kind: null }
  return {
    amount: Math.abs(p.totalNetBuy12m),
    note: null,
    kind: p.totalNetBuy12m > 0 ? '순매수' : '순매도',
  }
}

/**
 * 공직자 목록 정렬용 — **주식 평가액만**. 없으면 null.
 * 총재산으로 대체하면 서로 다른 값끼리 줄 세우게 된다.
 */
export function officialStockValue(p: Person): number | null {
  const latest = [...(p.officialAssets ?? [])].sort((a, b) => b.year - a.year)[0]
  return latest?.stockValue ?? null
}
