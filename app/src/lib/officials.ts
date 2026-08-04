/**
 * officials.ts — 공직자 보유 자료를 화면에서 쓰기 좋은 모양으로.
 *
 * ⚠️ 공직자 데이터는 **거래가 아니라 보유 스냅샷**이다.
 *    내부자 공시는 "언제 얼마에 샀다"인데, 재산공개는 "공개일 기준 몇 주 갖고 있다"뿐이다.
 *    그래서 홈 피드(시간순 거래 중계)에 그냥 섞을 수 없다. 섞으면 거래한 적 없는
 *    사람이 거래한 것처럼 보인다. 별도 블록으로 두고 기준일을 항상 붙인다.
 *
 * 또 하나 — 재산공개는 **가족 재산까지 함께 공개**한다. 명의(본인·배우자·장남)를
 * 지우면 배우자 보유가 본인 것으로 읽히므로 어디서든 명의를 들고 다닌다.
 */
import type { OfficialHoldings, Person } from './types'

export interface OfficialHolder {
  person: Person
  /** 이 종목에 대한 이 사람의 보유 (명의별로 여러 줄일 수 있다) */
  lots: { owner: string | null; quantity: number }[]
  /** 명의를 합친 총 보유 수량 */
  total: number
}

/**
 * 이 종목을 보유한 공직자들. 보유량 많은 순.
 * 한 사람이 본인·배우자 명의로 나눠 들고 있으면 lots 로 갈라서 보여준다 —
 * 합계만 보여주면 "본인이 다 갖고 있다"로 읽힌다.
 */
export function officialsHoldingStock(
  persons: Person[],
  holdings: OfficialHoldings,
  stockCode: string,
): OfficialHolder[] {
  const out: OfficialHolder[] = []
  for (const p of persons) {
    if (p.type !== 'official') continue
    // 보유 내역은 별도 파일에 시점별로 있다. **가장 최근 공개 시점**만 쓴다 —
    // 과거 시점까지 합치면 이미 판 종목이 '보유'로 잡힌다
    const latestAsOf = p.officialAssets?.[0]?.asOf
    const lotsRaw = latestAsOf ? (holdings[p.id]?.[latestAsOf] ?? []) : []
    // 같은 명의가 여러 줄로 나뉘어 오는 경우가 있다 (관보에 상장주식 행이 둘일 때).
    // 그대로 두면 '본인 177주 · 본인 2주' 처럼 읽혀 오해를 부른다 → 명의별로 합친다
    const byOwner = new Map<string | null, number>()
    for (const h of lotsRaw) {
      if (h.stockCode !== stockCode) continue
      const owner = h.owner ?? null
      byOwner.set(owner, (byOwner.get(owner) ?? 0) + h.quantity)
    }
    if (!byOwner.size) continue
    const lots = [...byOwner]
      .map(([owner, quantity]) => ({ owner, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
    out.push({ person: p, lots, total: lots.reduce((s, l) => s + l.quantity, 0) })
  }
  return out.sort((a, b) => b.total - a.total)
}

/** 가장 최근 공개일 (여러 공고가 섞여 있을 수 있다) */
export function latestOfficialAsOf(persons: Person[]): string | null {
  let latest: string | null = null
  for (const p of persons) {
    const asOf = p.officialAssets?.[0]?.asOf
    if (asOf && (!latest || asOf > latest)) latest = asOf
  }
  return latest
}

/** 상장주식 평가액이 큰 순. 평가액을 모르는 사람은 제외한다(0 으로 취급하지 않는다) */
export function officialsByStockValue(persons: Person[]): Person[] {
  return persons
    .filter((p) => p.type === 'official' && (p.officialAssets?.[0]?.stockValue ?? null) !== null)
    .sort(
      (a, b) =>
        (b.officialAssets![0]!.stockValue ?? 0) - (a.officialAssets![0]!.stockValue ?? 0),
    )
}
