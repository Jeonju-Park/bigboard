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
/** 소규모 확인용. 52분짜리 작업을 통째로 돌리기 전에 로직을 검증한다 */
const limit = Number(process.argv[process.argv.indexOf('--limit') + 1]) || Infinity

/**
 * 무료 티어는 분당 60회다. 안전하게 분당 50회(=1.2초 간격)로 잡는다.
 * 초과하면 429 가 오고, 그 상태로 계속 두드리면 키가 잠긴다.
 */
const INTERVAL_MS = 1200

const stats = { quote: 0, metric: 0, profile: 0, failed: 0, rateLimited: 0, foreignCap: 0 }

async function call<T>(path: string): Promise<T | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    // ⚠️ fetch 를 try 로 감싸지 않았다가 866종목 중 400번째에서 죽었다.
    //    AbortSignal.timeout 은 **예외를 던진다.** 한 번의 네트워크 딸꾹질이
    //    8분치 작업을 통째로 날렸다. 개별 실패는 세고 넘어가야 한다.
    try {
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
    } catch {
      await sleep(2000 * (attempt + 1))
    }
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
  /** 백만 단위. **통화가 달러라는 보장이 없다** — 아래 검산 참고 */
  marketCapitalization?: number
  /** 백만 주 */
  shareOutstanding?: number
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

  const targets = stocks.slice(0, limit === Infinity ? stocks.length : limit)
  const perSymbol = full ? 3 : 1
  const estMin = Math.ceil((targets.length * perSymbol * INTERVAL_MS) / 60_000)
  console.log(`\n미국 시세 수집 — ${targets.length}종목 · ${full ? '전체(시세+지표+기업정보)' : '시세만'}`)
  console.log(`예상 소요 약 ${estMin}분 (분당 50회 제한)\n`)

  const save = () => writeFileSync(stocksPath, JSON.stringify(stocks, null, 1) + '\n', 'utf8')

  let done = 0
  for (const s of targets) {
    done++
    if (done % 50 === 0) {
      // 중간 저장. 끝에서 한 번만 쓰면 도중에 죽었을 때 전부 잃는다
      save()
      const got = stocks.filter((x) => x.prevClose !== null).length
      console.log(`  ${done}/${targets.length} … (시세 확보 ${got})`)
    }

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
      s.market = p.exchange ?? null

      // ── 시가총액은 **검산해서** 받는다 ──────────────────────────────────────
      //
      // ⚠️ VTMX(Vesta, 멕시코 리츠)의 시총이 52,993(백만) 으로 와서 그대로 쓰면
      //    "\$53.0B" 가 된다. 실제 가치는 약 \$2.6B 다.
      //    처음엔 profile2 의 `currency` 로 거르려 했는데 **Finnhub 은 이 종목에도
      //    currency='USD' 라고 답한다.** 통화 필드로는 못 잡는다.
      //
      //    대신 스스로 검산한다: 시가총액 ≈ 상장주식수 x 주가.
      //    ISRG·MBIN 은 비율이 정확히 1.00 인데 VTMX 는 1.74 다 (ADR 과 원주가 섞인다).
      //    숫자끼리 안 맞으면 어느 쪽이 맞는지 알 수 없으므로 **보여주지 않는다**.
      //    환율을 끌어와 환산하지도 않는다 — 우리가 만든 수를 원문인 척 보여주게 된다(규칙 2).
      const cap = num(p.marketCapitalization)
      const shares = num(p.shareOutstanding)
      const price = s.prevClose
      const implied = shares !== null && price !== null ? shares * price : null
      const consistent = cap !== null && implied !== null && Math.abs(cap / implied - 1) <= 0.15

      if (cap !== null && consistent) {
        s.marketCap = Math.round(cap * 1_000_000)
      } else {
        if (cap !== null) stats.foreignCap++
        s.marketCap = null
      }
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

  save()

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
  if (stats.foreignCap) {
    console.log(
      `시가총액 제외 ${stats.foreignCap}종목 — 시총과 (주식수 x 주가)가 안 맞아 신뢰할 수 없습니다`,
    )
  }
  if (stats.rateLimited) console.log(`호출 제한에 걸려 대기 ${stats.rateLimited}회`)
  if (stats.failed) console.log(`실패 ${stats.failed}건 (해당 항목은 null 로 남습니다)`)
  console.log(`\n※ 스파크라인은 무료 티어에 과거 시계열이 없어 제공하지 않습니다.`)
  console.log(`   화면은 차트를 그리지 않고 숨깁니다 (0 으로 채운 가짜 차트를 만들지 않습니다).`)
}

await main()
