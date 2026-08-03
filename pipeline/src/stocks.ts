/**
 * stocks.ts — 공공데이터포털 주식시세정보 수집 → app/public/data/stocks.json
 *
 * 실행:
 *   npm --prefix pipeline run stocks              최근 영업일 시세만 (3회 호출, 30분 cron 용)
 *   npm --prefix pipeline run stocks -- --history 1년치를 훑어 52주 최고/최저 + 스파크라인 (하루 1회)
 *
 * ── 호출량 설계 (탐색으로 확인한 사실 기반) ──────────────────────────────────
 *
 * 시세 API 는 **날짜별 전 종목**을 준다. 하루치 2,872건이 1,000건씩 3회면 끝난다.
 * 종목마다 부르면 692회지만 날짜로 부르면 3회다 — 230배 싸다.
 *
 *   · 일일 갱신   3회 x 18실행 =  54회/일
 *   · 1년치 훑기  약 250 영업일 x 3 + 휴일 115 x 1 = 약 865회 (하루 1회만)
 *   → 합계 약 920회/일. 개발계정 한도 10,000회의 9%
 *
 * 52주 최고/최저와 스파크라인은 **매번 1년치를 다시 계산**한다.
 * 과거 시계열을 저장소에 커밋하면 매일 수 MB 씩 히스토리가 불어나므로,
 * 한도에 여유가 있는 만큼 다시 받는 쪽을 택했다.
 *
 * ⚠️ 값을 지어내지 않는다(규칙 2). 휴장일·미상장 종목은 null 로 두고 화면이 행을 숨긴다.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Sparkline, Sparklines, Stock } from './types.ts'

const DATA_DIR = join(import.meta.dirname, '..', '..', 'app', 'public', 'data')
const CACHE_DIR = join(import.meta.dirname, '..', '.cache', 'prices')
const BASE = 'https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService'

const SOURCE_NOTE = '공공데이터포털 금융위원회_주식시세정보'

const KEY = process.env.DATA_GO_KR_KEY
if (!KEY) {
  console.error(`
DATA_GO_KR_KEY 가 없습니다.
  마이페이지 > 데이터활용 > Open API > 인증키 발급현황 > **일반 인증키 (Decoding)** 를
  pipeline/.env 의 DATA_GO_KR_KEY= 뒤에 넣어주세요. (Encoding 키 아님)
`)
  process.exit(1)
}

// ── 날짜 (한국 기준) ──────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')

function kstNow(): Date {
  const d = new Date()
  return new Date(d.getTime() + (9 * 60 + d.getTimezoneOffset()) * 60000)
}

/** 'YYYYMMDD' */
function ymd(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

/** 'YYYYMMDD' → 'YYYY-MM-DD' */
function toIso(v: string): string {
  return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`
}

// ── API ──────────────────────────────────────────────────────────────────────

/** 시세 응답 1행 중 우리가 쓰는 필드만 */
interface PriceRow {
  srtnCd: string
  itmsNm: string
  mrktCtg: string
  clpr: string
  fltRt: string
  hipr: string
  lopr: string
  trqu: string
  lstgStCnt: string
  mrktTotAmt: string
}

async function callApi(params: Record<string, string>, attempts = 3): Promise<any> {
  const url = new URL(`${BASE}/getStockPriceInfo`)
  // Decoding 키를 그대로 넣는다 — URLSearchParams 가 인코딩한다
  url.searchParams.set('serviceKey', KEY!)
  url.searchParams.set('resultType', 'json')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  let lastError: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
      const text = await res.text()
      if (!text.trim().startsWith('{')) {
        const msg = /<returnAuthMsg>([^<]+)<\/returnAuthMsg>/.exec(text)?.[1] ?? text.slice(0, 160)
        // 인증 오류는 재시도해도 소용없다
        if (/SERVICE_KEY|REGISTERED|LIMITED/i.test(msg)) throw Object.assign(new Error(msg), { fatal: true })
        throw new Error(msg)
      }
      return JSON.parse(text)
    } catch (e) {
      if ((e as any).fatal) throw e
      lastError = e
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 400 * 2 ** i))
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

function itemsOf(json: any): PriceRow[] {
  const raw = json?.response?.body?.items?.item
  if (!raw) return []
  return Array.isArray(raw) ? raw : [raw]
}

/**
 * 하루치 전 종목을 받는다. 휴장일이면 빈 배열.
 * 디스크 캐시가 있으면 네트워크를 타지 않는다 — 개발 중 재실행 비용을 0 으로 만든다.
 * (CI 는 캐시가 없으므로 매번 새로 받는다. 그만큼 호출량을 계산에 넣어 뒀다)
 */
async function fetchDay(basDt: string): Promise<PriceRow[]> {
  mkdirSync(CACHE_DIR, { recursive: true })
  const cached = join(CACHE_DIR, `${basDt}.json`)
  if (existsSync(cached)) return JSON.parse(readFileSync(cached, 'utf8'))

  const rows: PriceRow[] = []
  let page = 1
  for (;;) {
    const json = await callApi({ basDt, numOfRows: '1000', pageNo: String(page) })
    const list = itemsOf(json)
    rows.push(...list)
    const total = Number(json?.response?.body?.totalCount ?? 0)
    if (rows.length >= total || list.length === 0) break
    page++
    if (page > 20) break // 안전장치
  }

  // 캐시는 쓰는 필드만 남겨 용량을 줄인다
  const trimmed = rows.map((r) => ({
    srtnCd: r.srtnCd, itmsNm: r.itmsNm, mrktCtg: r.mrktCtg,
    clpr: r.clpr, fltRt: r.fltRt, hipr: r.hipr, lopr: r.lopr,
    trqu: r.trqu, lstgStCnt: r.lstgStCnt, mrktTotAmt: r.mrktTotAmt,
  }))
  writeFileSync(cached, JSON.stringify(trimmed), 'utf8')
  return trimmed
}

const num = (v: string | undefined): number | null => {
  if (v === undefined || v === '' || v === '-') return null
  const n = Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

/** 스파크라인은 작은 그래프라 점이 많을 필요가 없다. 균등 간격으로 줄여 payload 를 아낀다 */
function downsample(series: number[], target: number): number[] {
  if (series.length <= target) return series
  const step = (series.length - 1) / (target - 1)
  return Array.from({ length: target }, (_, i) => series[Math.round(i * step)])
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

const withHistory = process.argv.includes('--history')

async function main() {
  // 우리가 다루는 종목 = 공시에 등장한 종목
  const stocksPath = join(DATA_DIR, 'stocks.json')
  const existing: Stock[] = JSON.parse(readFileSync(stocksPath, 'utf8'))
  const codes = new Set(existing.map((s) => s.code))
  console.log(`\n대상 종목 ${codes.size}개 · 모드: ${withHistory ? '1년치(52주·스파크라인 포함)' : '최근 영업일만'}\n`)

  // ① 최근 영업일 찾기 (주말·공휴일 대응)
  let latest: { basDt: string; rows: PriceRow[] } | null = null
  for (let back = 0; back <= 10; back++) {
    const d = kstNow()
    d.setDate(d.getDate() - back)
    const basDt = ymd(d)
    const rows = await fetchDay(basDt)
    if (rows.length) {
      latest = { basDt, rows }
      console.log(`최근 영업일: ${basDt} (전 종목 ${rows.length}건)`)
      break
    }
  }
  if (!latest) {
    console.error('최근 10일 안에 시세 데이터를 찾지 못했습니다.')
    process.exit(1)
  }

  // ② 1년치 시계열 (--history 일 때만)
  //    종목코드 → 오래된 순 종가 배열
  const series = new Map<string, { date: string; close: number; hi: number; lo: number }[]>()
  let daysFetched = 0

  if (withHistory) {
    const dates: string[] = []
    for (let back = 365; back >= 0; back--) {
      const d = kstNow()
      d.setDate(d.getDate() - back)
      dates.push(ymd(d))
    }
    console.log(`1년치 훑는 중 (달력 ${dates.length}일, 휴장일은 1회로 끝남)...`)

    for (const [i, basDt] of dates.entries()) {
      if (i % 60 === 0 && i) console.log(`  ... ${i}/${dates.length}`)
      let rows: PriceRow[]
      try {
        rows = await fetchDay(basDt)
      } catch (e) {
        console.log(`  · ${basDt} 실패: ${(e as Error).message.slice(0, 80)}`)
        if ((e as any).fatal) throw e
        continue
      }
      if (!rows.length) continue // 휴장일
      daysFetched++
      for (const r of rows) {
        if (!codes.has(r.srtnCd)) continue
        const close = num(r.clpr)
        if (close === null) continue
        if (!series.has(r.srtnCd)) series.set(r.srtnCd, [])
        // 거래정지 종목은 고가·저가·거래량이 **0 으로** 온다 (종가만 직전 값이 유지됨).
        // 그 0 을 52주 최고/최저에 넣으면 high52 가 0 이 되어 거짓이 된다.
        // 거래가 없던 날은 고가·저가 관측이 없는 것으로 보고 종가를 쓴다.
        const hiRaw = num(r.hipr)
        const loRaw = num(r.lopr)
        series.get(r.srtnCd)!.push({
          date: toIso(basDt),
          close,
          hi: hiRaw !== null && hiRaw > 0 ? hiRaw : close,
          lo: loRaw !== null && loRaw > 0 ? loRaw : close,
        })
      }
    }
    console.log(`영업일 ${daysFetched}일치 확보`)
  }

  // ③ 병합 — 기존 stocks.json 을 갱신한다 (종목 목록 자체는 공시가 정한다)
  const byCode = new Map(latest.rows.filter((r) => codes.has(r.srtnCd)).map((r) => [r.srtnCd, r]))
  // 스파크라인은 별도 파일로 뺀다 — 상세 화면에서만 필요한 무게다
  const sparkPath = join(DATA_DIR, 'sparklines.json')
  const sparklines: Sparklines = existsSync(sparkPath) ? JSON.parse(readFileSync(sparkPath, 'utf8')) : {}
  const priceAsOf = toIso(latest.basDt)
  let matched = 0
  let missing = 0

  const updated: Stock[] = existing.map((raw) => {
    // 예전 스키마의 sparkline 필드가 남아 있으면 여기서 떨군다 (별도 파일로 옮겼다)
    const { sparkline: _legacy, ...s } = raw as Stock & { sparkline?: unknown }
    const row = byCode.get(s.code)
    const hist = series.get(s.code) ?? []

    if (!row) {
      missing++
      // 시세를 못 찾은 종목(상장폐지·비상장 등)은 이전 값을 지우고 null 로 둔다.
      // 오래된 값을 남겨 두면 '언제 것인지 모르는 숫자'가 화면에 남는다.
      if (withHistory) delete sparklines[s.code]
      return {
        ...s,
        market: s.market ?? null,
        prevClose: null, change: null, marketCap: null, volume: null,
        high52: null, low52: null, priceAsOf: null,
      }
    }
    matched++

    if (withHistory) {
      const closes = hist.map((h) => h.close)
      const spark: Sparkline = {
        m1: downsample(closes.slice(-22), 22),
        m3: downsample(closes.slice(-66), 40),
        y1: downsample(closes, 60),
      }
      if (spark.y1.length) sparklines[s.code] = spark
      else delete sparklines[s.code]
    }

    // 52주는 **원본 해상도**로 계산한다 (스파크라인용 다운샘플 이전 값)
    const high52 = withHistory && hist.length ? Math.max(...hist.map((h) => h.hi)) : s.high52
    const low52 = withHistory && hist.length ? Math.min(...hist.map((h) => h.lo)) : s.low52

    return {
      ...s,
      // 종목명은 시세 API 의 정식 표기를 쓴다 — 공시 서류의 회사명 표기보다 정확하다
      name: row.itmsNm || s.name,
      market: row.mrktCtg || null,
      prevClose: num(row.clpr),
      change: num(row.fltRt),
      marketCap: num(row.mrktTotAmt),
      volume: num(row.trqu),
      high52,
      low52,
      priceAsOf,
    }
  })

  writeFileSync(stocksPath, JSON.stringify(updated, null, 1) + '\n', 'utf8')
  // 스파크라인은 값이 많아 들여쓰기 없이 쓴다 (사람이 읽을 파일이 아니다)
  if (withHistory) writeFileSync(sparkPath, JSON.stringify(sparklines) + '\n', 'utf8')

  // ④ meta 갱신
  const metaPath = join(DATA_DIR, 'meta.json')
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
  meta.priceDataAvailable = true
  if (!meta.sources.includes(SOURCE_NOTE)) meta.sources.push(SOURCE_NOTE)
  writeFileSync(metaPath, JSON.stringify(meta, null, 1) + '\n', 'utf8')

  console.log(`\n─── 시세 수집 결과 ───`)
  console.log(`기준일        ${priceAsOf}`)
  console.log(`시세 확보     ${matched}종목 / 못 찾음 ${missing}종목`)
  if (withHistory) {
    const withSpark = Object.keys(sparklines).length
    const with52 = updated.filter((s) => s.high52 !== null).length
    console.log(`스파크라인    ${withSpark}종목 · 52주 ${with52}종목 (영업일 ${daysFetched}일치)`)
  }
  if (missing) {
    console.log(`\n못 찾은 종목은 상장폐지·비상장일 수 있습니다. 값을 남기지 않고 null 로 두어 화면이 행을 숨깁니다.`)
  }
}

await main()
