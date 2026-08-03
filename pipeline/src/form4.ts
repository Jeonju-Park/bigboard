/**
 * form4.ts — SEC Form 4 (미국 내부자 거래) 수집 → app/public/data/us/*.json
 *
 * 실행: npm --prefix pipeline run form4
 *       npm --prefix pipeline run form4 -- --days 14
 *
 * 국장 fetch.ts 와 같은 원칙이다. 원문 그대로, 못 구한 값은 null, 스킵은 사유별 집계.
 *
 * ⚠️ 이 파일의 핵심 판단은 **거래 코드 필터**다.
 *
 * Form 4 의 `transactionCode` 는 이 거래가 무엇인지 말한다.
 *   P  공개시장 매수     ← 진짜 매수
 *   S  공개시장 매도     ← 진짜 매도
 *   A  주식 보상(grant)  ← 산 게 아니다. 회사가 준 것
 *   M  옵션 행사
 *   F  세금 납부용 원천징수  ← 판 게 아니다. 세금으로 떼인 것
 *   G  증여
 *
 * 실제 데이터를 열어보니 어떤 CEO 의 7일 연속 취득이 전부 `A`(보상)였다.
 * 이걸 "7일 연속 매수"로 표시하면 명백한 거짓이다. 그래서 **P/S 만 피드에 넣고**
 * 나머지는 사유별로 세어 meta.skipped 에 남긴다 — 조용한 누락을 만들지 않는다.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  accessionPath,
  daysBetween,

  loadTickers,
  normalizeDate,
  num,
  secFetch,
  tag,
  tagAll,
  tagValue,
  toIsoDate,
} from './sec.ts'
import { derivePersons, deriveRankings, deriveStocks } from './derive.ts'
import type { Direction, Disclosure, Meta, TradeDetail } from './types.ts'

const OUT_DIR = join(import.meta.dirname, '..', '..', 'app', 'public', 'data', 'us')

const argv = process.argv.slice(2)
const days = Number(argv[argv.indexOf('--days') + 1]) || 3

const skipped = { total: 0, reasons: {} as Record<string, number> }
function skip(reason: string) {
  skipped.total++
  skipped.reasons[reason] = (skipped.reasons[reason] ?? 0) + 1
}

/** 거래 코드 → 사람이 읽는 설명. 스킵 사유를 구체적으로 쓰기 위한 표 */
const CODE_LABEL: Record<string, string> = {
  A: '주식 보상(grant)',
  M: '옵션 행사',
  F: '세금 원천징수',
  G: '증여',
  C: '전환',
  D: '회사에 반납',
  X: '옵션 행사(만기)',
  J: '기타',
  V: '자발적 조기 신고',
}

interface IdxRow {
  cik: string
  company: string
  filedAt: string
  path: string
  /** 접수번호 — 신고서의 진짜 식별자. 인덱스 중복 제거의 기준이다 */
  accession: string
}

/** 일별 인덱스에서 Form 4 행만 뽑는다 */
function parseFormIdx(text: string): IdxRow[] {
  const rows: IdxRow[] = []
  for (const line of text.split('\n')) {
    if (!line.startsWith('4 ')) continue
    // 고정폭이 아니라 공백 정렬이다. 뒤에서부터 읽는 게 안전하다
    // (회사명에 공백이 있으므로 앞에서 자르면 깨진다)
    const m = /^4\s+(.+?)\s+(\d+)\s+(\d{8})\s+(edgar\/data\/\S+)\s*$/.exec(line)
    if (!m) continue
    const filedAt = normalizeDate(m[3])
    if (!filedAt) continue
    const accession = m[4].split('/').at(-1)!.replace('.txt', '')
    rows.push({ company: m[1].trim(), cik: m[2], filedAt, path: m[4], accession })
  }
  return rows
}

function quarterOf(iso: string): string {
  const month = Number(iso.slice(5, 7))
  return `QTR${Math.floor((month - 1) / 3) + 1}`
}

/**
 * 최근 **영업일 N일치** 인덱스를 모은다.
 *
 * 달력 N일이 아니라 '실제로 존재하는 인덱스 N개'를 센다. 이유가 두 가지 있다.
 *   1) 주말·공휴일엔 인덱스가 아예 없다
 *   2) SEC 는 **하루 늦게 발행한다.** KST 8/4 시점의 최신 인덱스가 7/31(금)이었다.
 * 달력 기준으로 세면 금요일~월요일 사이엔 0건을 받고도 정상처럼 보인다.
 *
 * 날짜는 **미국 동부 기준**이다. KST 로 세면 하루 앞서서 없는 파일만 찌른다.
 */
async function collectIndex(): Promise<IdxRow[]> {
  const rows: IdxRow[] = []
  const seenPaths = new Set<string>()
  let found = 0
  // 발행 지연 + 연휴를 견디도록 넉넉히 뒤로 간다
  const MAX_LOOKBACK = days + 12

  for (let back = 0; back < MAX_LOOKBACK && found < days; back++) {
    // UTC-4(미 동부 서머타임) 기준 날짜. 서머타임 경계에서 하루 어긋나도
    // 하루 더 뒤를 보므로 누락되지 않는다
    const d = new Date(Date.now() - 4 * 3600_000 - back * 86_400_000)
    const iso = toIsoDate(d)
    const ymd = iso.replace(/-/g, '')
    const url = `https://www.sec.gov/Archives/edgar/daily-index/${iso.slice(0, 4)}/${quarterOf(iso)}/form.${ymd}.idx`
    const text = await secFetch(url, { allowMissing: true })
    if (!text) continue

    found++
    const parsed = parseFormIdx(text)
    // ⚠️ 같은 신고서가 **발행사 CIK + 보고자 CIK 마다 한 줄씩** 인덱스에 오른다.
    //    실제로 한 접수번호가 최대 8줄까지 중복됐다. 경로로 걸러도 CIK 가 달라
    //    안 걸리므로 **접수번호**로 막는다. 안 그러면 같은 거래를 8번 센다.
    //    집합에 넣는 시점이 중요하다. filter 를 다 돌린 **뒤에** 넣으면
    //    같은 배치 안의 중복은 전부 통과한다 (실제로 712건이 그대로 통과했다).
    //    한 건씩 검사하면서 바로 넣어야 한다.
    const fresh = parsed.filter((r) => {
      if (seenPaths.has(r.accession)) return false
      seenPaths.add(r.accession)
      return true
    })
    rows.push(...fresh)
    console.log(`  ${iso} Form 4 ${fresh.length}건`)
  }

  if (!found) {
    // 0건은 '조용한 성공'으로 넘기면 안 된다. 소스가 바뀐 신호일 수 있다
    throw new Error(
      `최근 ${MAX_LOOKBACK}일 안에 일별 인덱스를 하나도 찾지 못했습니다. SEC 경로가 바뀌었을 수 있습니다.`,
    )
  }
  return rows
}

/** 보고자의 직위 — 임원 직함이 있으면 그것, 없으면 관계 */
function ownerTitle(xml: string): string {
  const officer = tag(xml, 'officerTitle')
  if (officer) return officer
  const roles: string[] = []
  if (/<isDirector>\s*(1|true)/.test(xml)) roles.push('Director')
  if (/<isTenPercentOwner>\s*(1|true)/.test(xml)) roles.push('10% Owner')
  if (/<isOfficer>\s*(1|true)/.test(xml)) roles.push('Officer')
  return roles.join(' · ')
}

interface Built {
  disclosure: Disclosure | null
  /** 코드가 P/S 가 아니어서 제외된 거래 수 (사유 집계용) */
  nonMarket: Record<string, number>
}

function buildFromForm4(xml: string, row: IdxRow, tickers: Map<string, string>): Built {
  const nonMarket: Record<string, number> = {}

  const issuerName = tag(xml, 'issuerName') ?? row.company
  const issuerCik = (tag(xml, 'issuerCik') ?? row.cik).padStart(10, '0')
  // 티커는 신고서에 적힌 값이 1순위. 비어 있으면 CIK 매핑으로 보완한다
  const symbol = tag(xml, 'issuerTradingSymbol') ?? tickers.get(issuerCik) ?? null
  // 한 신고서에 보고자가 여럿일 수 있다 (펀드 + 운용사 + GP 가 같은 주식을 함께 신고).
  // 이때 사람 수만큼 건을 만들면 **같은 거래를 N배로 세게 된다.** 한 건으로 두고 이름만 합친다.
  const owners = tagAll(xml, 'reportingOwner')
    .map((b) => tag(b, 'rptOwnerName'))
    .filter((v): v is string => Boolean(v))
  const personName =
    owners.length > 1 ? `${owners[0]} 외 ${owners.length - 1}인` : (owners[0] ?? '')

  if (!symbol) {
    // 티커가 없으면 종목 화면으로 연결할 수 없다. 비상장·펀드 신고 등
    return { disclosure: null, nonMarket }
  }

  const details: TradeDetail[] = []
  const prices = new Set<number>()
  let signedQty = 0
  let totalAmount: number | null = 0
  let sawBuy = false
  let sawSell = false
  let codes = new Set<string>()

  for (const block of tagAll(xml, 'nonDerivativeTransaction')) {
    const code = tagValue(block, 'transactionCode') ?? ''
    // ⚠️ 여기가 이 파일의 핵심. P/S 만 시장 거래다
    if (code !== 'P' && code !== 'S') {
      const label = CODE_LABEL[code] ?? `코드 ${code || '없음'}`
      nonMarket[label] = (nonMarket[label] ?? 0) + 1
      continue
    }
    const qty = num(tagValue(block, 'transactionShares'))
    const date = normalizeDate(tagValue(block, 'transactionDate'))
    if (qty === null || qty <= 0 || !date) continue

    const signed = code === 'P' ? qty : -qty
    signedQty += signed
    if (signed > 0) sawBuy = true
    else sawSell = true
    codes.add(code)

    // 단가 0 은 실제로 값이 없다는 뜻이다 (무상 이전 등). 0 으로 곱하면 총액이 거짓이 된다
    const priceRaw = num(tagValue(block, 'transactionPricePerShare'))
    const price = priceRaw !== null && priceRaw > 0 ? priceRaw : null
    if (price === null) totalAmount = null
    else {
      if (totalAmount !== null) totalAmount += price * qty
      prices.add(price)
    }
    details.push({ date, price, qty: signed })
  }

  if (!details.length) return { disclosure: null, nonMarket }

  if (signedQty === 0) {
    skip('순증감 0 (매수·매도 상쇄)')
    return { disclosure: null, nonMarket }
  }

  // 한 신고서에 매수·매도가 섞이면 순증감 수량과 총 거래대금의 단위가 어긋난다.
  // 국장에서 겪은 것과 같은 문제라 같은 규칙으로 처리한다 — 대표값을 만들지 않는다.
  const isMixed = sawBuy && sawSell
  if (isMixed) totalAmount = null

  // ── 제출자 오타로 보이는 단가 이상치 ────────────────────────────────────────
  //
  // 실제 사례: NMM 신고서 한 건에서 3행 중 1행만 단가가 `748119` 였고
  // 나머지 두 행은 `79.019`, `77.6356` 이었다. 그대로 곱하면 총액이 $846M 이 되어
  // **피드 1위**로 올라온다. 3,268주에 $846M — 주당 $259,000 이라는 뜻이라 명백히 틀렸다.
  //
  // 국장에서 거래일에 2030년 오타가 섞였던 것과 같은 종류의 문제다.
  // 원문(details)은 손대지 않고, 우리가 만들어낸 **대표값만** 버린다.
  //
  // 한계: 행이 하나뿐인 신고서는 비교 대상이 없어 못 잡는다. 시세를 붙인 뒤
  //       52주 최고가와 대조하는 것이 다음 방어선이다.
  if (totalAmount !== null && prices.size > 1) {
    const sorted = [...prices].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    const outlier = sorted[sorted.length - 1] / median > 10 || median / sorted[0] > 10
    if (outlier) {
      skip('단가 이상치 (제출자 오타 의심)')
      totalAmount = null
      // prices 에 이상치가 남아 있으면 unitPrice 도 오염되므로 함께 비운다
      prices.clear()
    }
  }

  const holdingAfter =
    num(tagValue(xml, 'sharesOwnedFollowingTransaction')) ??
    // 여러 행이면 마지막 행의 값이 최종 보유량이다
    num(
      tagValue(
        tagAll(xml, 'nonDerivativeTransaction').at(-1) ?? '',
        'sharesOwnedFollowingTransaction',
      ),
    ) ??
    0

  const tradeDates = details.map((d) => d.date).sort()
  // 대표 거래일은 신고일 이하 중 가장 최근 (국장과 같은 규칙)
  const notFuture = tradeDates.filter((d) => d <= row.filedAt)
  const tradeDate = notFuture.at(-1) ?? tradeDates[0]

  const accession = row.accession

  return {
    nonMarket,
    disclosure: {
      id: accession,
      personName,
      personType: 'insider',
      title: ownerTitle(xml),
      company: issuerName,
      stockCode: symbol,
      direction: (signedQty > 0 ? 'buy' : 'sell') as Direction,
      unitPrice: !isMixed && prices.size === 1 ? [...prices][0] : null,
      quantity: Math.abs(signedQty),
      totalAmount,
      tradeDate,
      discloseDate: row.filedAt,
      reportReason: isMixed
        ? '공개시장 매수·매도'
        : codes.has('P')
          ? '공개시장 매수'
          : '공개시장 매도',
      isPlanned: false,
      dDay: null,
      holdingBefore: Math.max(0, holdingAfter - signedQty),
      holdingAfter,
      details,
      sourceUrl: `${accessionPath(row.cik, accession)}/${accession}-index.htm`,
      isAmended: false,
      // 미장 전용 — 국장에는 없는 값
      transactionCode: [...codes].sort().join('/'),
      filingLagDays: daysBetween(tradeDate, row.filedAt),
      amountRange: null,
      ownerType: 'self',
      assetType: null,
    },
  }
}

async function main() {
  console.log(`\nSEC Form 4 수집 — 최근 ${days}일\n`)

  const tickerMap = await loadTickers()
  const tickers = new Map([...tickerMap].map(([cik, e]) => [cik, e.ticker]))
  console.log(`티커 매핑 ${tickers.size}종목 로드\n`)

  const index = await collectIndex()
  console.log(`\n총 ${index.length}건 다운로드 시작 (초당 8회 제한)\n`)

  const disclosures: Disclosure[] = []
  const nonMarketTotal: Record<string, number> = {}
  let done = 0

  for (const row of index) {
    done++
    if (done % 100 === 0) console.log(`  ${done}/${index.length} …`)
    let text: string | null
    try {
      text = await secFetch(`https://www.sec.gov/Archives/${row.path}`, { allowMissing: true })
    } catch (e) {
      skip('다운로드 실패')
      continue
    }
    if (!text) {
      skip('문서 없음(404)')
      continue
    }
    const doc = /<ownershipDocument>[\s\S]*?<\/ownershipDocument>/.exec(text)
    if (!doc) {
      skip('ownershipDocument 없음')
      continue
    }
    const built = buildFromForm4(doc[0], row, tickers)
    for (const [k, v] of Object.entries(built.nonMarket)) {
      nonMarketTotal[k] = (nonMarketTotal[k] ?? 0) + v
    }
    if (built.disclosure) disclosures.push(built.disclosure)
    else if (!Object.keys(built.nonMarket).length) skip('시장 거래(P/S) 없음')
  }

  // 시장 거래가 아닌 것들도 '건너뛴 이유'로 남긴다 — 조용한 누락 금지
  for (const [label, count] of Object.entries(nonMarketTotal)) {
    skipped.total += count
    skipped.reasons[`시장 거래 아님 — ${label}`] = count
  }

  disclosures.sort((a, b) =>
    b.discloseDate === a.discloseDate
      ? b.id.localeCompare(a.id)
      : b.discloseDate.localeCompare(a.discloseDate),
  )

  mkdirSync(OUT_DIR, { recursive: true })
  // 기존 데이터와 합친다 (하루치만 받아도 누적되도록)
  const existingPath = join(OUT_DIR, 'disclosures.json')
  let merged = disclosures
  try {
    const prev = JSON.parse(readFileSync(existingPath, 'utf8')) as Disclosure[]
    const byId = new Map(prev.map((d) => [d.id, d]))
    // 새 수집분이 이긴다 — 같은 accession 을 다시 받았다면 그쪽이 최신이다
    disclosures.forEach((d) => byId.set(d.id, d))
    merged = [...byId.values()].sort((a, b) => b.discloseDate.localeCompare(a.discloseDate))
  } catch {
    // 첫 실행
  }

  const write = (name: string, data: unknown) =>
    writeFileSync(join(OUT_DIR, name), JSON.stringify(data, null, 1) + '\n', 'utf8')

  write('disclosures.json', merged)
  // 파생물은 **누적 전체**로 다시 계산한다. 이번 수집분만으로 만들면
  // 하루치만 받은 날 인물·랭킹이 통째로 사라진다
  const persons = derivePersons(merged)
  const stocks = deriveStocks(merged)
  write('persons.json', persons)
  write('rankings.json', deriveRankings(merged))

  // 종목은 시세 스크립트(us-stocks.ts)가 덮어쓰므로 **기존 시세를 보존**한다.
  // 그냥 덮으면 매번 시세가 null 로 되돌아간다
  let mergedStocks = stocks
  try {
    const prevStocks = JSON.parse(readFileSync(join(OUT_DIR, 'stocks.json'), 'utf8')) as typeof stocks
    const prevByCode = new Map(prevStocks.map((s) => [s.code, s]))
    mergedStocks = stocks.map((s) => {
      const prev = prevByCode.get(s.code)
      return prev ? { ...prev, name: s.name } : s
    })
  } catch {
    // 첫 실행
  }
  write('stocks.json', mergedStocks)

  const meta: Meta = {
    market: 'us',
    lastUpdated: new Date().toISOString(),
    sources: ['미국 증권거래위원회(SEC) EDGAR — Form 4 임원·주요주주 소유변동 신고'],
    counts: { disclosures: merged.length, persons: persons.length, stocks: mergedStocks.length },
    officialsAsOf: null,
    priceDataAvailable: mergedStocks.some((s) => s.prevClose !== null),
    // Finnhub 무료 티어는 candle(과거 시계열)이 403 이다. 없는 걸 없다고 말한다
    sparklineAvailable: false,
    skipped,
  }
  // 다른 미장 스크립트(13F·하원)가 이미 써 둔 출처·건수를 지우지 않는다
  try {
    const prevMeta = JSON.parse(readFileSync(join(OUT_DIR, 'meta.json'), 'utf8')) as Meta
    meta.sources = [...new Set([...prevMeta.sources, ...meta.sources])]
    meta.skipped = {
      total: prevMeta.skipped.total + skipped.total,
      reasons: { ...prevMeta.skipped.reasons, ...skipped.reasons },
    }
  } catch {
    // 첫 실행
  }
  write('meta.json', meta)

  const buys = merged.filter((d) => d.direction === 'buy').length
  console.log(`\n─── 결과 ───`)
  console.log(`이번 수집 ${disclosures.length}건 · 누적 ${merged.length}건`)
  console.log(`매수 ${buys} · 매도 ${merged.length - buys}`)
  const lags = merged.map((d) => d.filingLagDays).filter((v): v is number => v !== null)
  if (lags.length) {
    const med = lags.sort((a, b) => a - b)[Math.floor(lags.length / 2)]
    console.log(`거래→신고 지연 중앙값 ${med}일 (법정 기한 2영업일)`)
  }
  if (skipped.total) {
    console.log(`\n건너뜀 ${skipped.total}건`)
    Object.entries(skipped.reasons)
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => console.log(`  ${String(v).padStart(5)}  ${k}`))
  }
  console.log(`\n※ P(공개시장 매수)/S(공개시장 매도) 만 피드에 넣습니다.`)
  console.log(`   보상·옵션행사·세금원천징수는 '샀다/팔았다'가 아니므로 제외했습니다.`)
}

await main()
