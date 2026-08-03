/**
 * explore-stocks.ts — 공공데이터포털 시세 API 탐색. 구현 전에 "무엇이 실제로 오는지"만 확인한다.
 *
 * 실행: npm --prefix pipeline run explore:stocks
 *
 * DART 때와 같은 방식이다. 포털 소개 문구에는 "시가·종가·고가·저가·거래량"까지만 적혀 있고
 * **시가총액·상장주식수가 오는지는 명세에 안 나온다.** 추측하지 않고 직접 호출해서 확인한다.
 *
 * 확인할 것:
 *   1) 키가 살아 있는가 (신청 직후엔 1시간쯤 걸리기도 한다)
 *   2) 응답 필드에 시가총액(mrktTotAmt)·상장주식수(lstgStCnt)가 있는가
 *      → 없으면 KRX상장종목정보의 상장주식수 x 종가로 계산해야 한다
 *   3) 52주 최고/최저를 주는가 → 없으면 과거 시계열을 직접 받아 계산해야 한다
 *   4) 종목코드로 바로 조회되는가, 아니면 단축코드(srtnCd)를 따로 써야 하는가
 *   5) 휴장일 응답 형태 (빈 배열인지 오류인지)
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const KEY = process.env.DATA_GO_KR_KEY
if (!KEY) {
  console.error(`
DATA_GO_KR_KEY 가 없습니다.

  1) https://www.data.go.kr 마이페이지 > 데이터활용 > Open API > 인증키 발급현황
  2) **일반 인증키 (Decoding)** 를 복사   ← Encoding 아님
  3) pipeline/.env 의 DATA_GO_KR_KEY= 뒤에 붙여넣기
`)
  process.exit(1)
}

const OUT = join(import.meta.dirname, '..', '.explore')
mkdirSync(OUT, { recursive: true })

const BASE = 'https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService'
const KRX_BASE = 'https://apis.data.go.kr/1160100/service/GetKrxListedInfoService'

/**
 * 포털은 인증키를 쿼리로 받는다.
 * URLSearchParams 가 값을 인코딩하므로 **Decoding 키를 그대로** 넣어야 한다.
 * Encoding 키를 넣으면 이중 인코딩돼서 SERVICE_KEY_IS_NOT_REGISTERED_ERROR 가 난다.
 */
async function call(base: string, op: string, params: Record<string, string>) {
  const url = new URL(`${base}/${op}`)
  url.searchParams.set('serviceKey', KEY!)
  url.searchParams.set('resultType', 'json')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) })
  const text = await res.text()

  // 오류는 JSON 이 아니라 XML 로 오는 경우가 많다
  if (!text.trim().startsWith('{')) {
    const code = /<returnReasonCode>(\d+)<\/returnReasonCode>/.exec(text)?.[1]
    const msg = /<returnAuthMsg>([^<]+)<\/returnAuthMsg>/.exec(text)?.[1]
    throw new Error(`JSON 아님 (HTTP ${res.status}) code=${code ?? '?'} ${msg ?? text.slice(0, 200)}`)
  }
  return JSON.parse(text)
}

/** 응답 껍데기를 벗겨 items 배열만 꺼낸다 */
function items(json: any): any[] {
  const body = json?.response?.body
  const raw = body?.items?.item ?? body?.items
  if (!raw) return []
  return Array.isArray(raw) ? raw : [raw]
}

function header(json: any) {
  const h = json?.response?.header
  return `${h?.resultCode ?? '?'} ${h?.resultMsg ?? ''}`
}

/** 최근 영업일을 찾을 때까지 하루씩 뒤로 간다 (주말·공휴일 대응) */
function ymdBack(daysBack: number): string {
  const d = new Date()
  const kst = new Date(d.getTime() + (9 * 60 + d.getTimezoneOffset()) * 60000)
  kst.setDate(kst.getDate() - daysBack)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${kst.getFullYear()}${p(kst.getMonth() + 1)}${p(kst.getDate())}`
}

async function main() {
  console.log('\n=== 공공데이터포털 시세 API 탐색 ===\n')

  // ── 1) 키 확인 + 최근 영업일 찾기 ──────────────────────────────────────────
  console.log('① 키 확인 / 최근 영업일 찾기')
  let tradeDate: string | null = null
  let sample: any = null

  for (let back = 1; back <= 10; back++) {
    const basDt = ymdBack(back)
    try {
      const json = await call(BASE, 'getStockPriceInfo', { basDt, numOfRows: '5', pageNo: '1' })
      const list = items(json)
      console.log(`   ${basDt}: header=${header(json)} items=${list.length}`)
      if (list.length) {
        tradeDate = basDt
        sample = list[0]
        break
      }
    } catch (e) {
      console.log(`   ${basDt}: ${(e as Error).message.slice(0, 140)}`)
      // 인증 오류면 더 시도해도 소용없다
      if (/SERVICE_KEY|등록되지|REGISTERED/i.test((e as Error).message)) {
        console.log(`
   → 키가 아직 활성화되지 않았거나 Encoding 키를 넣으셨을 수 있습니다.
     · 신청 직후라면 1시간쯤 뒤 다시 시도해 보세요
     · 마이페이지에서 **Decoding** 키인지 확인해 주세요
`)
        process.exit(1)
      }
    }
  }

  if (!tradeDate || !sample) {
    console.log('\n최근 10일 안에 데이터를 찾지 못했습니다. 장기 휴장이거나 파라미터가 다를 수 있습니다.')
    process.exit(1)
  }

  // ── 2) 응답 필드 확인 ──────────────────────────────────────────────────────
  console.log(`\n② 주식시세정보 응답 필드 (기준일 ${tradeDate})\n`)
  const keys = Object.keys(sample)
  keys.forEach((k) => console.log(`   ${k.padEnd(16)} = ${String(sample[k]).slice(0, 40)}`))

  const has = (re: RegExp) => keys.some((k) => re.test(k))
  console.log(`\n   우리 스키마가 필요한 값:`)
  console.log(`   ${has(/clpr/i) ? '✓' : '✗'} 종가        (Stock.prevClose)`)
  console.log(`   ${has(/fltRt|vs/i) ? '✓' : '✗'} 등락률      (Stock.change)`)
  console.log(`   ${has(/trqu/i) ? '✓' : '✗'} 거래량      (Stock.volume)`)
  console.log(`   ${has(/mrktTotAmt/i) ? '✓' : '✗'} 시가총액    (Stock.marketCap) ← 없으면 상장주식수 x 종가로 계산`)
  console.log(`   ${has(/lstgStCnt/i) ? '✓' : '✗'} 상장주식수`)
  console.log(`   ${has(/52|hgst|lwst/i) ? '✓' : '✗'} 52주 최고/최저 ← 없으면 과거 시계열을 직접 받아 계산`)
  console.log(`   ${has(/srtnCd|isinCd/i) ? '✓' : '✗'} 종목코드 계열`)

  writeFileSync(join(OUT, 'stocks-sample.json'), JSON.stringify(sample, null, 2), 'utf8')

  // ── 3) 종목코드로 단건 조회가 되는가 ───────────────────────────────────────
  console.log(`\n③ 우리가 가진 종목코드로 조회되는가`)
  const stocks = JSON.parse(
    readFileSync(join(import.meta.dirname, '..', '..', 'app', 'public', 'data', 'stocks.json'), 'utf8'),
  ) as { code: string; name: string }[]
  const targets = stocks.slice(0, 3)

  for (const s of targets) {
    try {
      const json = await call(BASE, 'getStockPriceInfo', {
        basDt: tradeDate,
        likeSrtnCd: s.code,
        numOfRows: '3',
        pageNo: '1',
      })
      const list = items(json)
      const hit = list.find((x) => x.srtnCd === s.code || x.srtnCd === `A${s.code}`) ?? list[0]
      console.log(
        `   ${s.code} ${s.name.padEnd(12)} → ${list.length}건` +
          (hit ? ` · ${hit.itmsNm ?? '?'} 종가 ${hit.clpr ?? '?'}` : ''),
      )
    } catch (e) {
      console.log(`   ${s.code} ${s.name}: ${(e as Error).message.slice(0, 100)}`)
    }
  }

  // ── 4) KRX 상장종목정보 ────────────────────────────────────────────────────
  console.log(`\n④ KRX상장종목정보 (종목 마스터)`)
  try {
    const json = await call(KRX_BASE, 'getItemInfo', { basDt: tradeDate, numOfRows: '3', pageNo: '1' })
    const list = items(json)
    console.log(`   header=${header(json)} items=${list.length}`)
    if (list.length) {
      Object.keys(list[0]).forEach((k) => console.log(`   ${k.padEnd(16)} = ${String(list[0][k]).slice(0, 40)}`))
      writeFileSync(join(OUT, 'krx-sample.json'), JSON.stringify(list[0], null, 2), 'utf8')
    }
  } catch (e) {
    console.log(`   실패: ${(e as Error).message.slice(0, 160)}`)
    console.log(`   → 이 API 는 아직 활용신청이 승인되지 않았을 수 있습니다`)
  }

  // ── 5) 전 종목 페이지네이션 규모 ───────────────────────────────────────────
  console.log(`\n⑤ 하루치 전 종목을 한 번에 받을 수 있는가 (호출량 설계용)`)
  try {
    const json = await call(BASE, 'getStockPriceInfo', { basDt: tradeDate, numOfRows: '1', pageNo: '1' })
    const total = json?.response?.body?.totalCount
    console.log(`   ${tradeDate} 전 종목 ${total}건`)
    console.log(`   numOfRows 를 크게 잡으면 ${Math.ceil(Number(total) / 1000)}회(1000건씩)로 하루치를 다 받는다`)
    console.log(`   → 종목마다 1회씩 부르는 것(690회)보다 훨씬 싸다. 이 방식으로 구현할 것`)
  } catch (e) {
    console.log(`   실패: ${(e as Error).message.slice(0, 120)}`)
  }

  // 공직자 재산공개 관보 API(15109164) 탐색은 걷어냈다.
  // 엔드포인트를 추측해 3개를 찔러봤는데 전부 NO_OPENAPI_SERVICE_ERROR 였다 —
  // 근거 없는 추측이었고, 실패해도 왜 실패했는지 안 보이는 잡음만 남겼다.
  // 포털 '참고문서'에서 요청주소를 확인한 뒤 다시 넣을 것.

  console.log(`\n원본 샘플: pipeline/.explore/ (stocks-sample.json, krx-sample.json)\n`)
}

await main()
