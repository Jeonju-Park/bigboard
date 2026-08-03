/**
 * thirteenf.ts — SEC 13F-HR (기관 분기 보유) 수집 → app/public/data/us/institutions.json
 *
 * 실행: npm --prefix pipeline run 13f
 *
 * ⚠️ **13F 는 "지금 들고 있는 것"이 아니다.**
 *    분기 종료 후 45일 이내 제출이라 우리가 보는 건 최대 4.5개월 묵은 스냅샷이고,
 *    공매도 포지션·채권·해외 상장 주식은 아예 신고 대상이 아니다.
 *    그래서 periodOfReport(기준일)와 filedAt(제출일)을 **둘 다** 들고 가고,
 *    화면은 둘을 반드시 함께 보여준다. 공직자 재산공개에 "연 1회 공개"를 붙인 것과 같은 이유다.
 *
 * 실데이터에서 확인한 함정 2개:
 *   1) `value` 단위 — 2023년 이전엔 천 달러였으나 지금은 **달러 그대로**다.
 *      옛 규칙으로 읽으면 1000배 틀린다. (버크셔 AMEX \$45,087,984,892 = 450억달러가 맞다)
 *   2) 같은 종목이 **여러 행**으로 온다 — 운용 재량(discretion)별로 나뉘어 신고된다.
 *      버크셔 응답에서 APPLE INC 이 두 행이었다. CUSIP 기준으로 합치지 않으면 보유 순위가 틀어진다.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { accessionPath, num, secFetch, secJson, tag, tagAll } from './sec.ts'
import type { Institution, InstitutionHolding, Meta } from './types.ts'

const OUT_DIR = join(import.meta.dirname, '..', '..', 'app', 'public', 'data', 'us')

/**
 * 추적 대상 기관. 13F 제출자는 약 6,000곳이라 전부 받는 건 의미가 없고,
 * '이름을 아는 큰손'만 고른다. CIK 는 EDGAR 회사검색으로 1건씩 확인한 값이다.
 */
const INSTITUTIONS: { cik: string; label: string }[] = [
  { cik: '0001067983', label: '버크셔 해서웨이' },
  { cik: '0001697748', label: 'ARK Invest' },
  { cik: '0001350694', label: '브리지워터' },
  { cik: '0001423053', label: '시타델' },
  { cik: '0001037389', label: '르네상스 테크놀로지스' },
  { cik: '0001649339', label: '사이언 (마이클 버리)' },
  { cik: '0001336528', label: '퍼싱 스퀘어' },
  { cik: '0001167483', label: '타이거 글로벌' },
  { cik: '0001029160', label: '소로스 펀드' },
  { cik: '0001135730', label: '코투 매니지먼트' },
  { cik: '0001656456', label: '아팔루사' },
  { cik: '0001273087', label: '밀레니엄' },
  { cik: '0001536411', label: '듀케인 패밀리오피스' },
]

interface Submissions {
  name: string
  filings: {
    recent: {
      form: string[]
      accessionNumber: string[]
      filingDate: string[]
      reportDate: string[]
    }
  }
}

/**
 * 13F 는 **축약된 회사명**을 쓴다. company_tickers.json 의 정식명과 그대로는 안 맞는다.
 * 실제 미매칭 사례에서 규칙을 뽑았다:
 *   MOODYS CORP          ↔ Moody's Corporation      (아포스트로피)
 *   VERISIGN INC         ↔ VERISIGN INC/CA          (EDGAR 주(州) 접미)
 *   OCCIDENTAL PETE CORP ↔ Occidental Petroleum     (축약)
 *   CAPITAL ONE FINL     ↔ Capital One Financial    (축약)
 *   BANK AMERICA CORP    ↔ Bank of America          (전치사 생략)
 */
const ABBREV: Record<string, string> = {
  PETE: 'PETROLEUM', FINL: 'FINANCIAL', FIN: 'FINANCIAL', INTL: 'INTERNATIONAL',
  AMER: 'AMERICAN', TECHNOL: 'TECHNOLOGY', TECH: 'TECHNOLOGY', PHARM: 'PHARMACEUTICALS',
  PHARMACEUT: 'PHARMACEUTICALS', COMMUNICATNS: 'COMMUNICATIONS', COMMUN: 'COMMUNICATIONS',
  ELECTR: 'ELECTRIC', SVCS: 'SERVICES', SVC: 'SERVICES', IND: 'INDUSTRIES', INDS: 'INDUSTRIES',
  RES: 'RESOURCES', PPTYS: 'PROPERTIES', SYS: 'SYSTEMS', GP: 'GROUP', MTLS: 'MATERIALS',
  ENTMT: 'ENTERTAINMENT', HLTH: 'HEALTH', LABS: 'LABORATORIES', MFG: 'MANUFACTURING',
  NATL: 'NATIONAL', PAC: 'PACIFIC', STHN: 'SOUTHERN', NTHN: 'NORTHERN', ENRGY: 'ENERGY',
}

/** 의미를 거의 안 담는 토큰 — 법인격·주식클래스·전치사 */
const NOISE =
  /\b(INC|INCORPORATED|CORP|CORPORATION|CO|COMPANY|LTD|LIMITED|PLC|LLC|LP|NV|SA|AG|HLDGS|HOLDINGS|HOLDING|TRUST|THE|NEW|COM|CL|CLASS|SHS|SHARES|ADR|ADS|ORD|OF|AND|MTN|BE|DEL|DE|REIT|SPONSORED)\b/g

/** 회사명을 티커 매칭용으로 정규화 */
function normalizeName(s: string): string {
  return s
    .toUpperCase()
    .replace(/&AMP;/g, ' AND ')
    // EDGAR 는 이름 뒤에 주(州) 코드를 붙인다: "VERISIGN INC/CA" → 잘라낸다
    .replace(/\/[A-Z]{2,3}\b.*$/, ' ')
    // 아포스트로피는 **지운다**. 공백으로 바꾸면 MOODYS 가 "MOODY S" 로 쪼개진다
    .replace(/['\u2019]/g, '')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(NOISE, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ABBREV[w] ?? w)
    // 한 글자 토큰(주식 클래스 A/B 등)은 식별에 도움이 안 된다
    .filter((w) => w.length > 1)
    .join(' ')
    .trim()
}

/**
 * CUSIP→티커 매핑표가 SEC 에 없다. 13F 는 CUSIP 으로만 신고하고
 * company_tickers.json 은 CIK↔티커만 준다. 그래서 **회사명**으로 잇는다.
 * 확실하지 않으면 null 로 두고 종목 링크를 걸지 않는다 — 엉뚱한 종목으로 보내는 것보다 낫다.
 */
async function buildNameIndex(): Promise<Map<string, string>> {
  const raw = await secJson<Record<string, { ticker: string; title: string }>>(
    'https://www.sec.gov/files/company_tickers.json',
  )
  const index = new Map<string, string>()
  // 앞 2토큰 보조키. "BANK AMERICA" 처럼 뒷말이 잘린 13F 이름을 잇는다.
  // **여러 회사가 같은 앞 2토큰을 가지면 버린다** — 엉뚱한 종목으로 보내느니 링크를 안 거는 게 낫다
  const prefix = new Map<string, string | null>()

  for (const v of Object.values(raw)) {
    const key = normalizeName(v.title)
    if (!key) continue
    // 같은 정규화 이름에 여러 티커(클래스주)가 걸리면 먼저 온 것을 쓴다
    if (!index.has(key)) index.set(key, v.ticker)

    const p = key.split(' ').slice(0, 2).join(' ')
    if (p.includes(' ')) prefix.set(p, prefix.has(p) ? null : v.ticker)
  }

  // 정확 매칭에 없는 접두키만 보조로 넣는다
  for (const [p, ticker] of prefix) {
    if (ticker && !index.has(p)) index.set(p, ticker)
  }
  return index
}

/** 제출 디렉터리에서 정보표 XML 파일명을 찾는다 (primary_doc 은 표지라 제외) */
async function findInfoTable(cik: string, accession: string): Promise<string | null> {
  const base = accessionPath(cik, accession)
  const listing = await secJson<{ directory: { item: { name: string }[] } }>(`${base}/index.json`)
  const xmls = listing.directory.item
    .map((i) => i.name)
    .filter((n) => n.endsWith('.xml') && !n.includes('primary_doc'))
  for (const name of xmls) {
    const text = await secFetch(`${base}/${name}`, { allowMissing: true })
    // ⚠️ 네임스페이스 접두가 붙는 제출이 있다 (`<ns1:infoTable>`).
    //    `includes('<infoTable>')` 로 찾으면 그런 파일을 통째로 놓친다 —
    //    실제로 브리지워터·밀레니엄이 이것 때문에 '13F 없음'으로 빠졌다.
    if (text && /<(?:\w+:)?infoTable[\s>]/.test(text)) return text
  }
  return null
}

/**
 * value 가 달러인지 **천 달러**인지 판별한다.
 *
 * 2023년 규칙 변경으로 대부분 달러로 신고하지만 아직 천 달러로 내는 곳이 있다.
 * 듀케인 패밀리오피스가 그랬다 — 그대로 읽으면 총 보유가 \$0.0B 으로 찍혔다.
 * 명세를 믿는 대신 **함의 단가**로 판별한다: value/shares 가 주당 \$1 도 안 되면
 * 그 단위는 달러일 수 없다 (그런 주식만 70종목을 들고 있을 리 없다).
 */
function detectThousands(rows: { value: number; shares: number }[]): boolean {
  const implied = rows
    .filter((r) => r.shares > 0 && r.value > 0)
    .map((r) => r.value / r.shares)
    .sort((a, b) => a - b)
  if (implied.length < 3) return false
  return implied[Math.floor(implied.length / 2)]! < 1
}

/** 한 기관당 실을 종목 수 상한. 전체 수는 holdingCount 로 따로 남긴다 */
const MAX_HOLDINGS = 50

async function collectOne(
  inst: { cik: string; label: string },
  nameIndex: Map<string, string>,
): Promise<{ result: Institution | null; unmatched: string[] }> {
  const sub = await secJson<Submissions>(`https://data.sec.gov/submissions/CIK${inst.cik}.json`)
  const r = sub.filings.recent
  const i = r.form.indexOf('13F-HR')
  if (i < 0) return { result: null, unmatched: [] }

  const accession = r.accessionNumber[i]!
  const xml = await findInfoTable(inst.cik, accession)
  if (!xml) throw new Error('정보표 XML 을 찾지 못했습니다 (형식이 바뀌었을 수 있습니다)')

  // ── CUSIP 기준 합산 ────────────────────────────────────────────────────────
  // 같은 종목이 운용 재량별로 여러 행에 나뉘어 온다. 합치지 않으면 순위가 틀어진다.
  const byCusip = new Map<string, InstitutionHolding>()
  const unmatched: string[] = []

  for (const row of tagAll(xml, 'infoTable')) {
    const cusip = tag(row, 'cusip')
    const name = tag(row, 'nameOfIssuer')
    const value = num(tag(row, 'value'))
    const shares = num(tag(row, 'sshPrnamt'))
    if (!cusip || !name || value === null) continue

    const putCallRaw = tag(row, 'putCall')?.toLowerCase()
    const putCall = putCallRaw === 'put' ? 'put' : putCallRaw === 'call' ? 'call' : null

    // 옵션 포지션은 현물 보유와 성격이 달라 같은 키로 합치지 않는다
    const key = `${cusip}:${putCall ?? 'share'}`
    const prev = byCusip.get(key)
    if (prev) {
      prev.value += value
      prev.shares += shares ?? 0
      continue
    }

    const nameKey = normalizeName(name)
    const ticker =
      nameIndex.get(nameKey) ?? nameIndex.get(nameKey.split(' ').slice(0, 2).join(' ')) ?? null
    if (!ticker) unmatched.push(name)

    byCusip.set(key, { ticker, cusip, name, value, shares: shares ?? 0, putCall })
  }

  let all = [...byCusip.values()]
  if (!all.length) return { result: null, unmatched }

  // 천 달러 단위로 신고한 제출은 달러로 맞춘다
  if (detectThousands(all)) {
    all = all.map((h) => ({ ...h, value: h.value * 1000 }))
    console.log(`    (천 달러 단위 신고 — 달러로 환산)`)
  }

  all.sort((a, b) => b.value - a.value)
  const totalValue = all.reduce((s, h) => s + h.value, 0)
  // 상위 N 만 싣는다. 자른 사실은 holdingCount 로 남는다
  const holdings = all.slice(0, MAX_HOLDINGS)
  // 매칭률은 **실제로 보여줄 종목** 기준으로 센다. 안 보여줄 꼬리까지 세면
  // 숫자가 실제 화면 품질과 무관해진다
  const shownUnmatched = holdings.filter((h) => !h.ticker).map((h) => h.name)

  return {
    unmatched: shownUnmatched,
    result: {
      id: inst.cik,
      // 라벨은 우리가 붙인 한국어 이름. 원문 이름은 sourceUrl 에서 확인 가능
      name: inst.label,
      periodOfReport: r.reportDate[i] || '',
      filedAt: r.filingDate[i] || '',
      totalValue,
      holdingCount: all.length,
      holdings,
      sourceUrl: `${accessionPath(inst.cik, accession)}/${accession}-index.htm`,
    },
  }
}

async function main() {
  console.log(`\n13F 기관 보유 수집 — ${INSTITUTIONS.length}곳\n`)

  const nameIndex = await buildNameIndex()
  console.log(`회사명 색인 ${nameIndex.size}건\n`)

  const results: Institution[] = []
  let unmatchedTotal = 0
  let holdingsTotal = 0

  for (const inst of INSTITUTIONS) {
    try {
      const { result, unmatched } = await collectOne(inst, nameIndex)
      if (!result) {
        console.log(`  ${inst.label.padEnd(18)} 13F 없음`)
        continue
      }
      results.push(result)
      unmatchedTotal += unmatched.length
      holdingsTotal += result.holdings.length
      const lagDays = Math.round(
        (Date.parse(result.filedAt) - Date.parse(result.periodOfReport)) / 86_400_000,
      )
      console.log(
        `  ${inst.label.padEnd(18)} ${result.holdingCount}종목(상위 ${result.holdings.length} 수록) · ` +
          `$${(result.totalValue / 1e9).toFixed(1)}B · ` +
          `${result.periodOfReport} 기준 (제출 ${result.filedAt}, +${lagDays}일)` +
          (unmatched.length ? ` · 티커 미매칭 ${unmatched.length}` : ''),
      )
    } catch (e) {
      // 한 곳이 실패해도 나머지는 살린다
      console.log(`  ${inst.label.padEnd(18)} 실패: ${(e as Error).message.slice(0, 70)}`)
    }
  }

  // 최신 기준일이 위로 오게. 같은 분기면 규모 순
  results.sort((a, b) =>
    b.periodOfReport === a.periodOfReport
      ? b.totalValue - a.totalValue
      : b.periodOfReport.localeCompare(a.periodOfReport),
  )

  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, 'institutions.json'), JSON.stringify(results, null, 1) + '\n', 'utf8')

  // meta 에 출처를 더한다 (form4.ts 가 쓴 내용을 지우지 않는다)
  const metaPath = join(OUT_DIR, 'meta.json')
  try {
    const meta: Meta = JSON.parse(readFileSync(metaPath, 'utf8'))
    const src = '미국 증권거래위원회(SEC) EDGAR — 13F-HR 기관투자자 분기 보유 신고'
    if (!meta.sources.includes(src)) meta.sources.push(src)
    writeFileSync(metaPath, JSON.stringify(meta, null, 1) + '\n', 'utf8')
  } catch {
    console.log('  meta.json 이 아직 없습니다 — form4 를 먼저 돌리세요')
  }

  const matchRate = holdingsTotal ? (1 - unmatchedTotal / holdingsTotal) * 100 : 0
  console.log(`\n─── 결과 ───`)
  const declared = results.reduce((s, r) => s + r.holdingCount, 0)
  console.log(`기관 ${results.length}곳 · 신고 ${declared.toLocaleString()}종목 중 상위 ${holdingsTotal}종목 수록`)
  console.log(`티커 매칭 ${matchRate.toFixed(1)}% (미매칭 ${unmatchedTotal}종목 — 종목 링크 없이 이름만 표시)`)
  console.log(`\n⚠️ 13F 는 분기말 스냅샷이고 제출까지 최대 45일 걸립니다.`)
  console.log(`   '지금 보유'가 아니며, 공매도·채권·해외주식은 신고 대상이 아닙니다.`)
  console.log(`   화면은 기준일과 제출일을 반드시 함께 보여줘야 합니다.`)
}

await main()
