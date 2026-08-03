/**
 * derive.ts — 공시 목록에서 인물·종목·랭킹을 뽑는다. **국장·미장 공용.**
 *
 * 원래 fetch.ts(국장) 안에만 있던 함수들인데 form4.ts(미장)가 같은 걸 필요로 했다.
 * 복사하면 한쪽만 고쳐지는 순간 두 시장의 집계 규칙이 조용히 갈라진다 —
 * "순매수 순위"가 시장마다 다른 뜻이 되는 건 이용자에게 설명할 수 없다.
 *
 * 집계 원칙 (양쪽 동일):
 *  · 금액을 모르는 건(단가 미기재·매수매도 혼재)은 **합산에서 뺀다**.
 *    0 으로 넣으면 순위가 거짓이 된다.
 *  · 사전공시(계획)는 아직 일어난 거래가 아니므로 제외한다.
 */
import type { Disclosure, Person, Rankings, Stock } from './types.ts'

/** 동명이인을 회사로 가른다. 같은 회사의 같은 이름은 같은 사람으로 본다 */
export function personId(name: string, company: string): string {
  return `${company}-${name}`.replace(/\s+/g, '')
}

/** n일 전 'YYYY-MM-DD'. 집계 컷오프용 */
export function cutoffDate(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
}

export function derivePersons(list: Disclosure[]): Person[] {
  const map = new Map<string, Person>()
  const cutoff = cutoffDate(365)

  for (const d of list) {
    if (d.isPlanned) continue // 계획은 아직 일어난 거래가 아니다
    const id = personId(d.personName, d.company)
    let p = map.get(id)
    if (!p) {
      p = {
        id,
        name: d.personName,
        type: d.personType,
        title: d.title,
        company: d.company,
        holdings: [],
        totalNetBuy12m: 0,
      }
      map.set(id, p)
    }
    if (!p.title && d.title) p.title = d.title

    // 종목별 보유는 가장 최근 공시의 변동후 잔량
    const h = p.holdings.find((x) => x.stockCode === d.stockCode)
    // 보유량을 모르는 시장(의회 신고)은 보유 목록을 만들지 않는다 — 0 으로 채우면 '0주 보유'라는 거짓이 된다
    if (d.holdingAfter !== null) {
      if (!h) p.holdings.push({ stockCode: d.stockCode, stockName: d.company, quantity: d.holdingAfter })
      else h.quantity = d.holdingAfter
    }

    if (d.tradeDate >= cutoff && d.totalAmount !== null) {
      p.totalNetBuy12m += d.direction === 'buy' ? d.totalAmount : -d.totalAmount
    }
  }
  return [...map.values()]
}

export function deriveRankings(list: Disclosure[]): Rankings {
  const periods = ['7', '30', '90'] as const
  const out: Rankings = {
    netBuy: { 7: [], 30: [], 90: [] },
    netSell: { 7: [], 30: [], 90: [] },
  } as unknown as Rankings

  for (const period of periods) {
    const cutoff = cutoffDate(Number(period))
    const net = new Map<string, { d: Disclosure; amount: number }>()

    for (const d of list) {
      // 금액을 모르는 건(단가 없음)은 집계에서 제외한다 — 0 으로 넣으면 순위가 거짓이 된다
      if (d.isPlanned || d.totalAmount === null || d.tradeDate < cutoff) continue
      const id = personId(d.personName, d.company)
      const cur = net.get(id) ?? { d, amount: 0 }
      cur.amount += d.direction === 'buy' ? d.totalAmount : -d.totalAmount
      net.set(id, cur)
    }

    const entries = [...net.entries()]
    out.netBuy[period] = entries
      .filter(([, v]) => v.amount > 0)
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 20)
      .map(([id, v], i) => ({
        rank: i + 1,
        personId: id,
        personName: v.d.personName,
        personType: v.d.personType,
        company: v.d.company,
        amount: v.amount,
      }))
    out.netSell[period] = entries
      .filter(([, v]) => v.amount < 0)
      .sort((a, b) => a[1].amount - b[1].amount)
      .slice(0, 20)
      .map(([id, v], i) => ({
        rank: i + 1,
        personId: id,
        personName: v.d.personName,
        personType: v.d.personType,
        company: v.d.company,
        amount: Math.abs(v.amount),
      }))
  }
  return out
}

/**
 * 종목은 이름·코드만 채운다.
 * 시세는 별도 스크립트(stocks.ts / us-stocks.ts)가 채우며, 그 전에는 전부 null 이다.
 * 화면은 null 인 행을 숨긴다 — 값을 지어내지 않는다.
 */
export function deriveStocks(list: Disclosure[]): Stock[] {
  const map = new Map<string, Stock>()
  for (const d of list) {
    if (!d.stockCode || map.has(d.stockCode)) continue
    map.set(d.stockCode, {
      code: d.stockCode,
      name: d.company,
      market: null,
      prevClose: null,
      change: null,
      marketCap: null,
      volume: null,
      per: null,
      pbr: null,
      divYield: null,
      high52: null,
      low52: null,
      priceAsOf: null,
    })
  }
  return [...map.values()]
}
