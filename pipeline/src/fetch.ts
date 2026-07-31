/**
 * fetch.ts — DART 수집 → app/public/data/*.json
 *
 * 실행: npm run pipeline            (최근 30일)
 *       npm run pipeline -- --days 90
 *       npm run pipeline -- --incremental   (최근 3일만 — Actions cron 용)
 *
 * 원칙 (docs/04_dev/pipeline_design.md):
 *  - 실명 공시 데이터다. 원문 그대로 옮기고, 확보 못 한 값은 추정하지 않고 null 로 둔다
 *  - 개별 건 실패는 스킵+집계, 전체 중단 금지
 *  - 모든 건에 DART 원문 링크(dartUrl)를 붙인다
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  listDisclosures,
  elestock,
  fetchDocument,
  parseRows,
  num,
  toIsoDate,
  dartUrl,
  requireKey,
  type DartListItem,
  type ElestockItem,
} from './dart.ts'
import type { Disclosure, Direction, Meta, Person, Rankings, Stock, TradeDetail } from './types.ts'

const OUT_DIR = join(import.meta.dirname, '..', '..', 'app', 'public', 'data')

const REPORT_OWNERSHIP = '임원ㆍ주요주주특정증권등소유상황보고서'
const REPORT_PLAN = '임원ㆍ주요주주특정증권등거래계획보고서'
const REPORT_PLAN_WITHDRAW = '임원ㆍ주요주주특정증권등거래계획철회보고서'

const skipped = { total: 0, reasons: {} as Record<string, number> }
/** 한 보고서 안에 매수 행과 매도 행이 함께 있는 건수 — 오류가 아니라 관측 사실로 보고한다 */
let mixedReports = 0
/** 원문에 공시일보다 뒤인 변동일이 섞인 건수 — 제출자 오타로 보이며 대표 거래일에서만 제외한다 */
let suspiciousDates = 0
function skip(reason: string, detail?: string) {
  skipped.total++
  skipped.reasons[reason] = (skipped.reasons[reason] ?? 0) + 1
  if (detail) console.log(`  · 스킵 [${reason}] ${detail}`)
}

// ── 인자 ──────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
const incremental = argv.includes('--incremental')
const days = incremental ? 3 : Number(argv[argv.indexOf('--days') + 1]) || 30

function ymd(d: Date) {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

// ── 방향 판정 ─────────────────────────────────────────────────────────────────

/**
 * 보고사유·변동방법 문자열의 (+)/(-) 접미가 매수/매도를 인코딩한다.
 * 예: "장내매수(+)", "장내매도(-)", "기타(-)"
 */
function directionFromLabel(label: string | undefined): Direction | null {
  if (!label) return null
  if (/\(-\)|매도|처분/.test(label)) return 'sell'
  if (/\(\+\)|매수|취득/.test(label)) return 'buy'
  return null
}

/**
 * 단가 정규화.
 * 실데이터에 0원(무상취득·무상증여를 0으로 기재)과 음수(정정 상쇄쌍)가 섞여 들어온다.
 * 0 을 진짜 단가로 쓰면 총액이 0 이 되어 거짓이 되므로 "단가 없음"(null)으로 본다.
 */
function normalizePrice(v: number | null): number | null {
  return v === null || v <= 0 ? null : v
}

/**
 * 행 하나의 부호 있는 증감수량.
 * 표의 증감 칸은 크기만 적히고 방향은 보고사유가 알려주는 경우가 많다.
 * 라벨이 방향을 안 주면 표에 적힌 부호를 그대로 쓴다.
 */
function signedRowQty(rawQty: number, label: string | undefined): number {
  const dir = directionFromLabel(label)
  if (dir === 'sell') return -Math.abs(rawQty)
  if (dir === 'buy') return Math.abs(rawQty)
  return rawQty
}

// ── 소유상황보고서 파싱 ────────────────────────────────────────────────────────

function buildFromOwnership(item: DartListItem, xml: string, ele?: ElestockItem): Disclosure | null {
  // ROWSPAN 병합으로 비는 보고사유·변동일은 앞 행 값으로 채운다
  const rows = parseRows(xml, ['RPT_RSN', 'MDF_DM'])
  const dataRows = rows.filter((r) => 'MDF_STK_CNT' in r && num(r.MDF_STK_CNT) !== null)
  if (!dataRows.length) {
    skip('세부변동내역 없음', `${item.rcept_no} ${item.corp_name}`)
    return null
  }

  const details: TradeDetail[] = []
  let signedQty = 0
  let totalAmount: number | null = 0
  const prices = new Set<number>()

  let sawBuyRow = false
  let sawSellRow = false

  for (const r of dataRows) {
    const qtyRaw = num(r.MDF_STK_CNT)
    if (qtyRaw === null) continue
    const signed = signedRowQty(qtyRaw, r.RPT_RSN)
    signedQty += signed
    if (signed > 0) sawBuyRow = true
    if (signed < 0) sawSellRow = true

    const price = normalizePrice(num(r.ACI_AMT2))
    const date = toIsoDate(r.MDF_DM__v ?? r.MDF_DM)
    // 세부내역의 수량은 부호를 유지한다 — 화면이 행별 매수/매도를 그대로 보여줘야 한다
    // 증감 0 행은 표시할 내용이 없어 넣지 않는다
    if (date && signed !== 0) details.push({ date, price, qty: signed })

    if (price === null) totalAmount = null
    else {
      if (totalAmount !== null) totalAmount += price * Math.abs(qtyRaw)
      prices.add(price)
    }
  }

  if (!details.length) {
    skip('변동일 파싱 실패', `${item.rcept_no} ${item.corp_name}`)
    return null
  }

  // 순증감이 0 이면 한 보고서 안에서 매수·매도가 완전히 상쇄된 건이다.
  // 수량 0 을 화면에 띄울 방법이 없고 방향도 의미가 없으므로 스킵한다.
  if (signedQty === 0) {
    skip('순증감 0 (매수·매도 상쇄)')
    return null
  }
  const direction: Direction = signedQty > 0 ? 'buy' : 'sell'
  if (sawBuyRow && sawSellRow) mixedReports++

  const totalRow = rows.find((r) => 'AFR_STK_SUM' in r)
  const holdingAfter = num(totalRow?.AFR_STK_SUM) ?? num(dataRows.at(-1)!.AFR_STK_CNT) ?? 0
  const holdingBefore = num(dataRows[0].BFR_STK_CNT) ?? 0

  // 단가는 모든 행이 같은 값일 때만 확정값으로 쓴다.
  // 여러 단가가 섞이면 평균을 만들어내지 않고 null 로 두고 화면이 세부내역을 보여준다.
  const unitPrice = prices.size === 1 ? [...prices][0] : null

  // elestock 요약과 교차검증 — 어긋나면 로그만 남기고 원문 값을 신뢰한다
  if (ele) {
    const eleQty = num(ele.sp_stock_lmp_irds_cnt)
    if (eleQty !== null && Math.abs(eleQty) !== Math.abs(signedQty)) {
      console.log(
        `  · 교차검증 불일치 ${item.rcept_no}: 원문 증감=${signedQty} 요약API=${eleQty} (원문 채택)`,
      )
    }
  }

  // 대표 거래일 고르기.
  //
  // ① 한 보고서가 수개월치 변동(우리사주 적립 등)을 한꺼번에 담는 일이 흔해서
  //    가장 이른 날을 쓰면 "2022년 거래"처럼 보인다 → 가장 최근 날을 쓴다.
  // ② 그런데 제출자 오타로 미래 날짜가 섞이는 실제 사례가 있다.
  //    (예: rcpNo 20260731000802 — 앞뒤 행은 전부 2026.07.30 인데 한 행만 2030.07.30)
  //    소유상황보고서는 '이미 일어난' 변동을 알리는 문서이므로 공시일보다 뒤인 날짜는
  //    대표값에서 제외한다. 원문은 고치지 않고 details 에 그대로 남긴다.
  // ③ 결제일 기준으로 공시일보다 하루이틀 뒤가 찍히는 정상 건도 있어서,
  //    후보가 하나도 없으면 그때는 원문 값을 그대로 쓴다.
  const discloseDate = toIsoDate(item.rcept_dt) ?? ''
  const sortedDates = details.map((d) => d.date).sort()
  const notFuture = sortedDates.filter((d) => !discloseDate || d <= discloseDate)
  if (notFuture.length !== sortedDates.length) suspiciousDates++
  const tradeDate = notFuture.at(-1) ?? sortedDates[0]

  return {
    id: item.rcept_no,
    personName: item.flr_nm || ele?.repror || '',
    personType: 'insider', // M1 은 DART 내부자만. 공직자는 M2(부록 A-1)
    title: ele?.isu_exctv_ofcps && ele.isu_exctv_ofcps !== '-' ? ele.isu_exctv_ofcps : '',
    company: item.corp_name,
    stockCode: item.stock_code,
    direction,
    unitPrice,
    quantity: Math.abs(signedQty),
    totalAmount,
    tradeDate,
    discloseDate,
    reportReason: (dataRows[0].RPT_RSN ?? '').replace(/\([-+]\)/g, '').trim(),
    isPlanned: false,
    dDay: null,
    holdingBefore,
    holdingAfter,
    details,
    dartUrl: dartUrl(item.rcept_no),
    isAmended: /정정/.test(item.report_nm),
  }
}

// ── 거래계획 사전공시 파싱 ─────────────────────────────────────────────────────

function buildFromPlan(item: DartListItem, xml: string, todayIso: string): Disclosure | null {
  const rows = parseRows(xml)
  const find = (code: string) => rows.find((r) => r[code] !== undefined && r[code] !== '-')?.[code]
  const findV = (code: string) => rows.find((r) => r[`${code}__v`] !== undefined)?.[`${code}__v`]

  const startDate = toIsoDate(findV('MDF_STR_DT') ?? find('MDF_STR_DT'))
  const qty = num(find('PLN_STR_STK'))
  if (!startDate || qty === null) {
    skip('계획 필수값 없음', `${item.rcept_no} ${item.corp_name}`)
    return null
  }

  // 매도 계획은 수량·금액이 음수로 기재된다. 방향은 direction 필드가 따로 들고 있으므로 크기만 쓴다.
  const price = normalizePrice(num(find('PLN_ACI_AMT2')))
  const rawAmount = num(find('PLN_TRAN_AMT'))
  const amount = rawAmount === null ? null : Math.abs(rawAmount)
  const method = find('MDF_MT')
  const direction = directionFromLabel(method) ?? 'sell'

  // 예정일까지 남은 일수. 지나갔으면 음수가 되므로 0 이하는 null 처리한다
  const dDayRaw = Math.round(
    (new Date(startDate + 'T00:00:00Z').getTime() - new Date(todayIso + 'T00:00:00Z').getTime()) / 86400000,
  )

  return {
    id: item.rcept_no,
    personName: item.flr_nm,
    personType: 'insider',
    title: '',
    company: item.corp_name,
    stockCode: item.stock_code,
    direction,
    unitPrice: price,
    quantity: Math.abs(qty),
    totalAmount: amount,
    tradeDate: startDate, // 예정 거래 시작일
    discloseDate: toIsoDate(item.rcept_dt) ?? '',
    reportReason: (find('TRAN_PPS') ?? '거래계획 사전공시').trim(),
    isPlanned: true,
    dDay: dDayRaw >= 0 ? dDayRaw : null,
    holdingBefore: 0,
    holdingAfter: 0,
    details: [{ date: startDate, price, qty: Math.abs(qty) }],
    dartUrl: dartUrl(item.rcept_no),
    isAmended: /정정/.test(item.report_nm),
  }
}

// ── 정정 upsert ───────────────────────────────────────────────────────────────

/**
 * DART 정정은 새 접수번호로 별도 접수되므로 rcept_no 로는 원본과 못 묶는다.
 * (회사, 인물, 거래일)을 논리 키로 삼아 접수일이 늦은 건으로 대체한다.
 * 한계: 같은 인물이 같은 날 별건을 두 번 보고하면 오탐 가능 (설계 문서 §4에 기록).
 */
let mergedDuplicates = 0

function upsertAmendments(list: Disclosure[]): Disclosure[] {
  const byKey = new Map<string, Disclosure>()
  for (const d of list) {
    const key = `${d.stockCode}|${d.personName}|${d.tradeDate}|${d.isPlanned}`
    const prev = byKey.get(key)
    if (!prev) {
      byKey.set(key, d)
      continue
    }
    const winner = d.discloseDate >= prev.discloseDate ? d : prev
    const loser = winner === d ? prev : d
    // 중복 병합 자체가 정정을 뜻하지는 않는다. 정정 여부는 보고서명의 '[기재정정]' 표기로만 판단한다.
    byKey.set(key, { ...winner, isAmended: winner.isAmended || loser.isAmended })
    mergedDuplicates++
  }
  return [...byKey.values()]
}

// ── 파생 집계 ─────────────────────────────────────────────────────────────────

function personId(name: string, company: string): string {
  return `${company}-${name}`.replace(/\s+/g, '')
}

function derivePersons(list: Disclosure[]): Person[] {
  const map = new Map<string, Person>()
  const cutoff = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10)

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
    if (!h) p.holdings.push({ stockCode: d.stockCode, stockName: d.company, quantity: d.holdingAfter })
    else h.quantity = d.holdingAfter

    if (d.tradeDate >= cutoff && d.totalAmount !== null) {
      p.totalNetBuy12m += d.direction === 'buy' ? d.totalAmount : -d.totalAmount
    }
  }
  return [...map.values()]
}

function deriveRankings(list: Disclosure[]): Rankings {
  const periods = ['7', '30', '90'] as const
  const out: Rankings = { netBuy: { 7: [], 30: [], 90: [] }, netSell: { 7: [], 30: [], 90: [] } } as Rankings

  for (const period of periods) {
    const cutoff = new Date(Date.now() - Number(period) * 86400000).toISOString().slice(0, 10)
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
 * 시세(전일종가·시총·PER 등)는 공공데이터포털 키가 없어 전부 null 이며,
 * 화면은 null 인 행을 숨긴다. 값을 지어내지 않는다.
 */
function deriveStocks(list: Disclosure[]): Stock[] {
  const map = new Map<string, Stock>()
  for (const d of list) {
    if (!d.stockCode || map.has(d.stockCode)) continue
    map.set(d.stockCode, {
      code: d.stockCode,
      name: d.company,
      prevClose: null,
      change: null,
      marketCap: null,
      volume: null,
      per: null,
      pbr: null,
      divYield: null,
      high52: null,
      low52: null,
      sparkline: { m1: [], m3: [], y1: [] },
    })
  }
  return [...map.values()]
}

// ── 메인 ──────────────────────────────────────────────────────────────────────

async function main() {
  requireKey()
  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  const bgn = ymd(new Date(today.getTime() - days * 86400000))
  const end = ymd(today)

  console.log(`\n빅보드 수집 — ${bgn} ~ ${end} (${days}일${incremental ? ', 증분' : ''})\n`)

  // 1. 공시 목록 수집
  const items: DartListItem[] = []
  let page = 1
  let totalPage = 1
  do {
    const r = await listDisclosures({ bgn_de: bgn, end_de: end, pblntf_ty: 'D', page_no: page, page_count: 100 })
    if (r.status === '013') break // 데이터 없음
    if (r.status !== '000') throw new Error(`list.json 오류 ${r.status}: ${r.message}`)
    totalPage = r.total_page
    items.push(...r.list)
    page++
  } while (page <= totalPage)

  const targets = items.filter((i) => {
    const nm = i.report_nm.replace(/\[[^\]]*\]/g, '').trim()
    return nm === REPORT_OWNERSHIP || nm === REPORT_PLAN
  })
  const withdrawals = items.filter((i) => i.report_nm.includes(REPORT_PLAN_WITHDRAW))

  console.log(`지분공시 ${items.length}건 중 대상 ${targets.length}건 (계획 철회 ${withdrawals.length}건은 제외 처리)`)

  // 2. 원문 파싱
  const eleCache = new Map<string, ElestockItem[]>()
  const collected: Disclosure[] = []

  for (const [idx, item] of targets.entries()) {
    if (!item.stock_code) {
      skip('비상장(종목코드 없음)')
      continue
    }
    if (idx % 50 === 0 && idx) console.log(`  ... ${idx}/${targets.length}`)

    let xml: string
    try {
      xml = await fetchDocument(item.rcept_no)
    } catch (e) {
      skip('원문 수신 실패', `${item.rcept_no} ${(e as Error).message.slice(0, 80)}`)
      continue
    }

    try {
      const isPlan = item.report_nm.includes('거래계획')
      let d: Disclosure | null
      if (isPlan) {
        d = buildFromPlan(item, xml, todayIso)
      } else {
        if (!eleCache.has(item.corp_code)) eleCache.set(item.corp_code, await elestock(item.corp_code))
        const ele = eleCache.get(item.corp_code)!.find((e) => e.rcept_no === item.rcept_no)
        d = buildFromOwnership(item, xml, ele)
      }
      if (d) collected.push(d)
    } catch (e) {
      skip('파싱 예외', `${item.rcept_no} ${(e as Error).message.slice(0, 80)}`)
    }
  }

  // 3. 철회된 거래계획 제거
  const withdrawnKeys = new Set(withdrawals.map((w) => `${w.stock_code}|${w.flr_nm}`))
  const afterWithdrawal = collected.filter((d) => {
    if (d.isPlanned && withdrawnKeys.has(`${d.stockCode}|${d.personName}`)) {
      skip('거래계획 철회됨')
      return false
    }
    return true
  })

  // 4. 정정 upsert + 최신순 정렬
  const disclosures = upsertAmendments(afterWithdrawal).sort((a, b) =>
    b.discloseDate === a.discloseDate ? b.id.localeCompare(a.id) : b.discloseDate.localeCompare(a.discloseDate),
  )

  const persons = derivePersons(disclosures)
  const stocks = deriveStocks(disclosures)
  const rankings = deriveRankings(disclosures)

  const meta: Meta = {
    lastUpdated: new Date().toISOString(),
    sources: [
      '금융감독원 전자공시시스템(DART) OpenAPI — 임원·주요주주 특정증권등 소유상황보고서, 거래계획보고서',
    ],
    counts: { disclosures: disclosures.length, persons: persons.length, stocks: stocks.length },
    priceDataAvailable: Boolean(process.env.DATA_GO_KR_KEY),
    skipped,
  }

  mkdirSync(OUT_DIR, { recursive: true })
  const write = (name: string, data: unknown) =>
    writeFileSync(join(OUT_DIR, name), JSON.stringify(data, null, 1) + '\n', 'utf8')
  write('disclosures.json', disclosures)
  write('persons.json', persons)
  write('stocks.json', stocks)
  write('rankings.json', rankings)
  write('meta.json', meta)

  // 5. 보고
  console.log(`\n─── 수집 결과 ───`)
  console.log(`공시     ${disclosures.length}건 (계획 ${disclosures.filter((d) => d.isPlanned).length}건 포함)`)
  console.log(`인물     ${persons.length}명`)
  console.log(`종목     ${stocks.length}개`)
  console.log(`단가 확보 ${disclosures.filter((d) => d.unitPrice !== null).length}건 / 총액 확보 ${disclosures.filter((d) => d.totalAmount !== null).length}건`)
  console.log(`정정 표시 ${disclosures.filter((d) => d.isAmended).length}건 · 중복키 병합 ${mergedDuplicates}건`)
  console.log(`매수·매도 혼합 보고서 ${mixedReports}건 (대표 방향은 순증감 부호로 판정)`)
  console.log(`원문에 공시일 이후 변동일이 섞인 건 ${suspiciousDates}건 (제출자 오타 추정 — details 에는 원문 그대로 보존)`)
  console.log(`\n스킵 ${skipped.total}건`)
  for (const [reason, n] of Object.entries(skipped.reasons).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${reason}`)
  }
  if (!meta.priceDataAvailable) {
    console.log(`\n⚠ 공공데이터포털 키가 없어 시세 항목은 전부 null 입니다. 화면은 해당 행을 숨깁니다.`)
  }
  console.log(`\n→ ${OUT_DIR}`)
}

await main()
