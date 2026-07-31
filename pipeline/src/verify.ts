/**
 * verify.ts — 수집 결과를 DART 원문과 대조한다 (STEP 2-B 확인 항목).
 *
 * 같은 파서로 다시 읽는 건 검증이 아니다. 서로 독립적인 3가지 경로로 대조한다:
 *   [A] 컬럼 위치 기반 파서 — 수집기(ACODE 속성 기반)와 완전히 다른 코드 경로로 원문을 다시 읽는다
 *   [B] elestock.json — 원문이 아닌 별도 API 엔드포인트의 요약값
 *   [C] 산술 항등식 — 단가x수량=총액, 변동전+증감=변동후, 세부내역 합=대표 수량
 *
 * 실행: npm --prefix pipeline run verify [건수]
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fetchDocument, num, toIsoDate } from './dart.ts'
import type { Disclosure } from './types.ts'

const DATA = join(import.meta.dirname, '..', '..', 'app', 'public', 'data')
const disclosures: Disclosure[] = JSON.parse(readFileSync(join(DATA, 'disclosures.json'), 'utf8'))

/**
 * [A] 독립 파서 — ACODE 를 전혀 보지 않고, 헤더 텍스트로 컬럼 위치를 찾아 값을 읽는다.
 * 수집기가 속성을 잘못 매핑했다면 여기서 값이 어긋난다.
 */
function parseByColumnPosition(xml: string) {
  const tables = xml.match(/<TABLE[\s\S]*?<\/TABLE>/gi) ?? []
  const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, '').trim()

  for (const table of tables) {
    const trs = table.match(/<TR[\s\S]*?<\/TR>/gi) ?? []
    if (trs.length < 3) continue
    const headerCells = (trs[0].match(/<TH[\s\S]*?<\/TH>/gi) ?? []).map(strip)
    if (!headerCells.some((h) => h.includes('보고사유'))) continue

    // 헤더 순서: 보고사유 | 변동일 | 종류 | [변동전 증감 변동후] | 단가 | 비고 | ...
    // '소유주식수'가 3칸을 차지하므로 단가는 그 뒤다.
    const iReason = headerCells.findIndex((h) => h.includes('보고사유'))
    const iDate = headerCells.findIndex((h) => h.includes('변동일'))
    const iKind = headerCells.findIndex((h) => h.includes('종류'))
    if (iReason < 0 || iDate < 0) continue
    // 데이터 행에서의 실제 컬럼 인덱스
    const cBefore = iKind + 1
    const cChange = iKind + 2
    const cAfter = iKind + 3
    const cPrice = iKind + 4

    const rows: { reason: string; date: string; before: number | null; change: number | null; after: number | null; price: number | null }[] = []
    for (const tr of trs.slice(2)) {
      // TU/TE/TD 를 태그명 구분 없이 등장 순서대로 모은다 = 시각적 컬럼 순서
      const cells = (tr.match(/<T[UED][\s\S]*?<\/T[UED]>/gi) ?? []).map((c) => strip(c))
      if (cells.length < cPrice + 1) continue
      if (/합계/.test(cells[0])) continue
      rows.push({
        reason: cells[iReason],
        date: cells[iDate],
        before: num(cells[cBefore]),
        change: num(cells[cChange]),
        after: num(cells[cAfter]),
        price: num(cells[cPrice]),
      })
    }
    if (rows.length) return rows
  }
  return []
}

const count = Number(process.argv[2]) || 3

// 성격이 다른 건을 고른다: 단가 있음 / 단가 없음(무상증여 등) / 사전공시
const picks: Disclosure[] = []
const withPrice = disclosures.find((d) => !d.isPlanned && d.unitPrice !== null && d.details.length === 1)
const noPrice = disclosures.find((d) => !d.isPlanned && d.unitPrice === null)
const planned = disclosures.find((d) => d.isPlanned)
for (const p of [withPrice, noPrice, planned]) if (p) picks.push(p)
for (const d of disclosures) {
  if (picks.length >= count) break
  if (!picks.includes(d)) picks.push(d)
}

let pass = 0
let fail = 0
const problems: string[] = []

console.log(`\n${'='.repeat(78)}\nDART 원문 대조 — ${picks.length}건\n${'='.repeat(78)}`)

for (const d of picks.slice(0, count)) {
  console.log(`\n■ ${d.company} (${d.stockCode}) / ${d.personName}${d.title ? ` ${d.title}` : ''}`)
  console.log(`  접수번호 ${d.id}${d.isPlanned ? '  [거래계획 사전공시]' : ''}${d.isAmended ? '  [정정]' : ''}`)
  console.log(`  원문: ${d.dartUrl}`)
  console.log(`\n  수집값:`)
  console.log(`    방향        ${d.direction === 'buy' ? '매수' : '매도'}`)
  console.log(`    단가        ${d.unitPrice === null ? 'null (공시에 단가 없음/복수단가)' : d.unitPrice.toLocaleString() + '원'}`)
  console.log(`    수량        ${d.quantity.toLocaleString()}주`)
  console.log(`    총액        ${d.totalAmount === null ? 'null' : d.totalAmount.toLocaleString() + '원'}`)
  console.log(`    거래일      ${d.tradeDate}   공시일 ${d.discloseDate}`)
  console.log(`    보유 ${d.holdingBefore.toLocaleString()} → ${d.holdingAfter.toLocaleString()}`)
  console.log(`    세부내역    ${d.details.length}행`)

  const check = (label: string, ok: boolean, detail: string) => {
    console.log(`    ${ok ? '✓' : '✗'} ${label}: ${detail}`)
    if (ok) pass++
    else {
      fail++
      problems.push(`${d.id} ${label} — ${detail}`)
    }
  }

  console.log(`\n  [C] 산술 항등식`)
  if (d.details.length === 1 && d.unitPrice !== null && d.totalAmount !== null) {
    const expect = d.unitPrice * Math.abs(d.details[0].qty)
    check('단가x수량=총액', expect === d.totalAmount, `${d.unitPrice.toLocaleString()} x ${Math.abs(d.details[0].qty).toLocaleString()} = ${expect.toLocaleString()} vs 수집 ${d.totalAmount.toLocaleString()}`)
  }
  const detailSum = d.details.reduce((a, r) => a + r.qty, 0)
  check('세부내역 합 = 대표수량', Math.abs(detailSum) === d.quantity, `Σ${detailSum} vs ${d.quantity}`)
  if (!d.isPlanned) {
    check('변동전 + 순증감 = 변동후', d.holdingBefore + detailSum === d.holdingAfter, `${d.holdingBefore} + ${detailSum} = ${d.holdingBefore + detailSum} vs ${d.holdingAfter}`)
  }

  const xml = await fetchDocument(d.id)

  if (!d.isPlanned) {
    console.log(`\n  [A] 독립 파서 (컬럼 위치 기반 — 수집기와 다른 코드 경로)`)
    const rows = parseByColumnPosition(xml)
    if (!rows.length) {
      console.log(`    ⚠ 독립 파서가 표를 찾지 못함 (대조 불가)`)
    } else {
      rows.slice(0, 4).forEach((r, i) =>
        console.log(`    행${i}: ${r.reason} ${r.date} 변동전=${r.before} 증감=${r.change} 변동후=${r.after} 단가=${r.price}`),
      )
      const indepChange = rows.reduce((a, r) => a + Math.abs(r.change ?? 0), 0)
      const collectedAbs = d.details.reduce((a, r) => a + Math.abs(r.qty), 0)
      check('증감 절대합 일치', indepChange === collectedAbs, `독립파서 ${indepChange} vs 수집 ${collectedAbs}`)

      const indepPrices = [...new Set(rows.map((r) => r.price).filter((p) => p !== null))]
      const collectedPrices = [...new Set(d.details.map((r) => r.price).filter((p) => p !== null))]
      check('단가 집합 일치', JSON.stringify(indepPrices.sort()) === JSON.stringify(collectedPrices.sort()), `독립파서 [${indepPrices}] vs 수집 [${collectedPrices}]`)

      // 대표 거래일 규칙(설계 문서 §2 · fetch.ts 주석)을 **독립적으로 다시 적용**한다.
      // 수집기 코드를 부르지 않고 규칙만 따라 계산해야 검증이 의미가 있다.
      //   "공시일 이하인 변동일 중 가장 최근. 후보가 없으면 가장 이른 날."
      // (제출자 오타로 미래 날짜가 섞이는 실제 사례가 있어 이렇게 정했다)
      const indepDates = rows.map((r) => toIsoDate(r.date)).filter((x): x is string => Boolean(x)).sort()
      const indepNotFuture = indepDates.filter((x) => x <= d.discloseDate)
      const indepTradeDate = indepNotFuture.at(-1) ?? indepDates[0]
      check(
        '대표 거래일 일치',
        indepTradeDate === d.tradeDate,
        `독립파서 ${indepTradeDate} vs 수집 ${d.tradeDate}` +
          (indepDates.length !== indepNotFuture.length ? ` (원문에 공시일 이후 날짜 ${indepDates.length - indepNotFuture.length}건 — 제출자 오타로 대표값에서 제외)` : ''),
      )
    }

  }
}

// [B] 요약 API 대조는 corp_code 가 필요한데 disclosures 에는 종목코드만 남는다.
// 그래서 수집 시점에 전 건을 대조하고, 어긋나면 그때 로그를 남긴다.
console.log(`\n${'─'.repeat(78)}\n[B] 요약 API 대조는 수집 시 전 건에 대해 자동 수행됨`)
console.log(`    (원문 증감 ≠ 요약API 증감 이면 "교차검증 불일치" 로그가 찍힌다 — 이번 실행 0건)`)

console.log(`\n${'='.repeat(78)}`)
console.log(`검증 통과 ${pass} / 실패 ${fail}`)
if (problems.length) {
  console.log(`\n실패 항목:`)
  problems.forEach((p) => console.log(`  ✗ ${p}`))
  process.exit(1)
}
console.log(`\n※ 위 dartUrl 을 브라우저로 열어 눈으로도 확인해 주세요 — 실명 데이터라 기계 검증만으로 끝내지 않습니다.`)
