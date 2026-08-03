/**
 * us-stocks.ts — 미국 시세 수집 (Finnhub) → app/public/data/us/stocks.json
 *
 * 실행: npm --prefix pipeline run us:stocks
 *       npm --prefix pipeline run us:stocks -- --full   (기업정보·지표까지 전부 갱신)
 *
 * 국장(stocks.ts)과 호출 구조가 다르다.
 *   국장  공공데이터포털은 **날짜 하나로 전 종목**을 준다 → 하루 3회면 끝
 *   미장  Finnhub 무료 티어는 **심볼당 1회**다 → 종목 수만큼 호출해야 한다
 *
 * 그래서 우리 데이터에 실제로 등장한 종목만 받는다. 그리고 호출을 나눈다:
 *   quote      매일   (종가·등락률)                    · 심볼당 1회
 *   metric     주 1회 (52주 최고/최저·PER·PBR·배당)     · 심볼당 1회
 *   profile2   주 1회 (시가총액·거래소)                 · 심볼당 1회
 * --full 이 아니면 metric·profile2 는 기존 값을 그대로 둔다.
 *
 * ⚠️ 스파크라인은 없다.
 *    Finnhub 무료 티어의 `stock/candle`(과거 시계열)은 403 이다. 직접 호출해 확인했다.
 *    0 으로 채운 가짜 차트를 그리지 않고 meta.sparklineAvailable=false 로 두어
 *    화면이 차트를 통째로 숨기게 한다.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { sleep } from './sec.ts'
import type { Meta, Stock } from './types.ts'

const DATA_DIR = join(import.meta.dirname, '..', '..', 'app', 'public', 'data', 'us')

const KEY = process.env.FINNHUB_KEY
if (!KEY) {
  console.error(`
FINNHUB_KEY 가 없습니다.
  1) https://finnhub.io/register — 이메일만으로 가입 (카드 불필요)
  2) Dashboard 의 API Key 복사
  3) pipeline/.env 에  FINNHUB_KEY=...  추가
`)
  process.exit(1)
}

const full = process.argv.includes('--full')

/**
 * 무료 티어는 분당 60회다. 안전하게 분당 50회(=1.2초 간격)로 잡는다.
 * 초과하면 429 가 오고, 그 상태로 계속 두드리면 키가 잠긴다.
 */
const INTERVAL_MS = 1200

const stats = { quote: 0, metric: 0, profile: 0, failed: 0, rateLimited: 0 }

async function call<T>(path: string): Promise<T | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://finnhub.io/api/v1/${path}&token=${KEY}`, {
      signal: AbortSignal.timeout(30_000),
    })
    if (res.status === 429) {
      stats.rateLimited++
      // 분당 창이 지나갈 때까지 기다린다
      await sleep(20_000)
      continue
    }
    if (res.status === 403) {
      // 무료 티어에서 막힌 엔드포인트. 재시도해도 같다
      return null
    }
    if (!res.ok) {
      await sleep(2000)
      continue
    }
    return (await res.json()) as T
  }
  stats.failed++
  return null
}

interface Quote {
  c: number // 현재가
  d: number | null // 전일 대비
  dp: number | null // 등락률(%)
  pc: number // 전일 종가
  t: number // 타임스탬프(초)
}

interface Profile {
  marketCapitalization?: number // 백만 달러
  exchange?: string
  currency?: string
}

interface Metric {
  metric?: Record<string, number | null>
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v !== 0 ? v : null
}

async function main() {
  const stocksPath = join(DATA_DIR, 'stocks.json')
  const stocks = JSON.parse(readFileSync(stocksPath, 'utf8')) as Stock[]
  if (!stocks.length) {
    console.error('us/stocks.json 이 비어 있습니다 — form4·house 를 먼저 돌리세요')
    process.exit(1)
  }

  const perSymbol = full ? 3 : 1
  const estMin = Math.ceil((stocks.length * perSymbol * INTERVAL_MS) / 60_000)
  console.log(`\n미국 시세 수집 — ${stocks.length}종목 · ${full ? '전체(시세+지표+기업정보)' : '시세만'}`)
  console.log(`예상 소요 약 ${estMin}분 (분당 50회 제한)\n`)

  let done = 0
  for (const s of stocks) {
    done++
    if (done % 50 === 0) console.log(`  ${done}/${stocks.length} …`)

    const q = await call<Quote>(`quote?symbol=${encodeURIComponent(s.code)}`)
    await sleep(INTERVAL_MS)
    if (q && num(q.pc) !== null) {
      stats.quote++
      s.prevClose = num(q.pc)
      s.change = typeof q.dp === 'number' && Number.isFinite(q.dp) ? q.dp : null
      // Finnhub 타임스탬프는 초 단위. 시세가 언제 것인지 화면이 말해야 한다(규칙 2)
      s.priceAsOf = q.t ? new Date(q.t * 1000).toISOString().slice(0, 10) : null
    }

    if (!full) continue

    const p = await call<Profile>(`stock/profile2?symbol=${encodeURIComponent(s.code)}`)
    await sleep(INTERVAL_MS)
    if (p) {
      stats.profile++
      // marketCapitalization 은 **백만 달러** 단위다. 달러로 환산한다
      const cap = num(p.marketCapitalization)
      s.marketCap = cap === null ? null : Math.round(cap * 1_000_000)
      s.market = p.exchange ?? null
    }

    const m = await call<Metric>(`stock/metric?symbol=${encodeURIComponent(s.code)}&metric=all`)
    await sleep(INTERVAL_MS)
    if (m?.metric) {
      stats.metric++
      const mm = m.metric
      s.high52 = num(mm['52WeekHigh'])
      s.low52 = num(mm['52WeekLow'])
      s.per = num(mm['peTTM'])
      s.pbr = num(mm['pbQuarterly']) ?? num(mm['pbAnnual'])
      s.divYield = num(mm['currentDividendYieldTTM'])
    }
  }

  writeFileSync(stocksPath, JSON.stringify(stocks, null, 1) + '\n', 'utf8')

  const metaPath = join(DATA_DIR, 'meta.json')
  const meta: Meta = JSON.parse(readFileSync(metaPath, 'utf8'))
  meta.priceDataAvailable = stocks.some((s) => s.prevClose !== null)
  // 무료 티어에 과거 시계열이 없다. 없는 걸 없다고 말한다
  meta.sparklineAvailable = false
  const src = 'Finnhub — 미국 주식 시세·기업정보 (PER·PBR 은 Finnhub 산출값)'
  if (!meta.sources.includes(src)) meta.sources.push(src)
  writeFileSync(metaPath, JSON.stringify(meta, null, 1) + '\n', 'utf8')

  const withPrice = stocks.filter((s) => s.prevClose !== null).length
  console.log(`\n─── 결과 ───`)
  console.log(`시세 확보 ${withPrice}/${stocks.length}종목 (${((withPrice / stocks.length) * 100).toFixed(0)}%)`)
  if (full) {
    console.log(`지표 ${stats.metric}종목 · 기업정보 ${stats.profile}종목`)
  }
  if (stats.rateLimited) console.log(`호출 제한에 걸려 대기 ${stats.rateLimited}회`)
  if (stats.failed) console.log(`실패 ${stats.failed}건 (해당 항목은 null 로 남습니다)`)
  console.log(`\n※ 스파크라인은 무료 티어에 과거 시계열이 없어 제공하지 않습니다.`)
  console.log(`   화면은 차트를 그리지 않고 숨깁니다 (0 으로 채운 가짜 차트를 만들지 않습니다).`)
}

await main()
