/**
 * gazette-pdf.ts — 재산공개 **관보 원문 PDF** 에서 개인별 보유 주식을 뽑는다.
 *                  → app/public/data/kr/persons.json (공직자)
 *
 * 실행: npm --prefix pipeline run gazette:pdf
 *       npm --prefix pipeline run gazette:pdf -- --all      (처리한 관보도 다시)
 *       npm --prefix pipeline run gazette:pdf -- --limit 3  (소규모 확인)
 *
 * 배경 — 이 파일이 존재하는 이유
 *   행정안전부 관보 API(15109164)는 문서 목록만 준다. 개인별 금액도 이름도 없다.
 *   그래서 한동안 "공직자 재산은 못 가져온다"고 결론지었는데, 유저가 관보 PDF 를
 *   직접 열어보고 **본문에 종목명과 주식수가 다 있다**는 걸 찾아냈다.
 *   API 응답만 보고 원문을 안 열어본 게 잘못이었다.
 *
 * 이제 PDF 도 자동으로 받는다. 관보 뷰어가 쓰는 다운로드 엔드포인트를 그대로 쓴다
 * (POST /user/common/ofcttCntntDownload.do, cntnt_seq_no=관보ID).
 * 유저가 손으로 받은 파일과 바이트 수까지 일치하는 걸 확인하고 붙였다.
 *
 * 원문 구조 (텍스트 추출 가능한 PDF 다):
 *   소속 교육부 국가평생교육진흥원 직위 원장 성명 김월용
 *   (단위 : 천원)
 *   ▶ 증권(소계) 5,135,930
 *   본인 상장주식
 *   SKC 2,000주, 삼성전자 6,500주, 한국전력 9,000주
 *   3,382,626                       ← 이 행의 가액
 *   배우자 상장주식 디지털대성 612주, 원익QnC 400주 16,954
 *
 * ⚠️ 지키는 것
 *   1) **상장주식만** 담는다. 같은 블록의 '기타(채권)'도 "140,000주"처럼 적히는데
 *      그건 주식이 아니다. 비상장주식도 종목 화면으로 연결할 수 없다.
 *   2) **명의(본인·배우자·장남)를 보존한다.** 공직자 재산공개는 가족 재산까지
 *      함께 공개한다. 배우자 보유를 본인 것으로 쓰면 실명 데이터에서 오보다.
 *   3) 종목명을 코드로 못 이으면 코드를 null 로 두고 링크를 걸지 않는다.
 *   4) 금액 단위는 **천원**이다. 원 단위로 환산해서 저장한다.
 *   5) 공고마다 스냅샷을 **쌓는다**. 덮어쓰면 추이가 사라진다.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { extractText, getDocumentProxy } from 'unpdf'
import { sleep } from './sec.ts'
import type {
  GazetteNotice,
  Meta,
  OfficialAssetYear,
  OfficialHoldings,
  Person,
  PersonHolding,
} from './types.ts'

const DATA_DIR = join(import.meta.dirname, '..', '..', 'app', 'public', 'data', 'kr')
/** 손으로 넣은 PDF 도 계속 읽는다 (색인에 없는 과거 관보를 넣을 수 있게) */
const PDF_DIR = join(import.meta.dirname, '..', 'data')

/**
 * 받은 PDF 를 캐시한다 (gitignore 대상).
 * 296건을 다시 받는 데 25분이 걸린다. 파서를 고쳐 재파싱할 때마다 관보 서버를
 * 다시 두드릴 이유가 없다 — 공개 문서지만 남의 서버다.
 */
const CACHE_DIR = join(import.meta.dirname, '..', '.gazette-cache')

const UA = 'bigboard/0.1 (jjsa6316@ajou.ac.kr)'
const DOWNLOAD = 'https://gwanbo.go.kr/user/common/ofcttCntntDownload.do'

/** 관보 금액은 천원 단위로 적힌다 */
const THOUSAND = 1000

const argv = process.argv.slice(2)
const redoAll = argv.includes('--all')
const limitArg = argv.indexOf('--limit')
const limit = limitArg >= 0 ? Number(argv[limitArg + 1]) : Infinity

const skipped = { total: 0, reasons: {} as Record<string, number> }
function skip(reason: string, n = 1) {
  skipped.total += n
  skipped.reasons[reason] = (skipped.reasons[reason] ?? 0) + n
}

// ── 종목명 → 종목코드 ────────────────────────────────────────────────────────

/**
 * 관보 표기를 KRX 약칭에 맞춘다.
 * 실제 미매칭에서 뽑은 규칙 — '삼성전자보통주', '에스케이하이닉스보통주',
 * '현대자동차보통주' 처럼 정식명·주식종류가 붙어 오는 경우가 많다.
 */
const NAME_ALIAS: Record<string, string> = {
  에스케이하이닉스: 'SK하이닉스',
  현대자동차: '현대차',
  포스코홀딩스: 'POSCO홀딩스',
  네이버: 'NAVER',
  에스케이이노베이션: 'SK이노베이션',
  에스케이텔레콤: 'SK텔레콤',
  엘지전자: 'LG전자',
  엘지화학: 'LG화학',
  엘지에너지솔루션: 'LG에너지솔루션',
  기아자동차: '기아',
  케이비금융: 'KB금융',
  신한금융지주: '신한지주',
}

/** 이름 비교용 정규화 — 공백·구두점을 지우고 주식 종류 접미를 떼낸다 */
function normStock(name: string): string {
  const base = name
    .replace(/\s|·|\(주\)|주식회사/g, '')
    .replace(/(보통주|기명식보통주|무기명식보통주)$/, '')
    .replace(/우선주$/, '우')
    .trim()
  return NAME_ALIAS[base] ?? base
}

async function buildTickerMap(): Promise<Map<string, string>> {
  const key = process.env.DATA_GO_KR_KEY
  if (!key) {
    console.log('  DATA_GO_KR_KEY 없음 — 종목코드 매핑 없이 이름만 저장합니다')
    return new Map()
  }
  for (let back = 1; back <= 10; back++) {
    const d = new Date(Date.now() + 9 * 3600_000 - back * 86_400_000)
    const ymd = d.toISOString().slice(0, 10).replace(/-/g, '')
    const url = new URL(
      'https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo',
    )
    url.searchParams.set('serviceKey', key)
    url.searchParams.set('resultType', 'json')
    url.searchParams.set('basDt', ymd)
    url.searchParams.set('numOfRows', '20000')
    url.searchParams.set('pageNo', '1')
    const text = await fetch(url, { signal: AbortSignal.timeout(60_000) }).then((r) => r.text())
    if (!text.trim().startsWith('{')) continue
    const items = JSON.parse(text)?.response?.body?.items?.item
    if (!Array.isArray(items) || !items.length) continue
    const map = new Map<string, string>()
    for (const it of items) {
      if (!it.itmsNm || !it.srtnCd) continue
      if (!map.has(it.itmsNm)) map.set(it.itmsNm, it.srtnCd)
      const k = normStock(it.itmsNm)
      if (!map.has(k)) map.set(k, it.srtnCd)
    }
    console.log(`  종목 매핑 ${map.size}건 (${ymd} 기준)`)
    return map
  }
  console.log('  시세 API 응답 없음 — 종목코드 매핑 없이 진행합니다')
  return new Map()
}

// ── 파싱 ─────────────────────────────────────────────────────────────────────

/** 관계(명의) 토큰 — 이 단어로 시작하는 줄이 새 행이다 */
const OWNER =
  '본인|배우자|장남|차남|삼남|장녀|차녀|삼녀|부|모|조부|조모|외조부|외조모|자녀|며느리|사위|손자|손녀|형|제|누나|동생'

/** 재산의 종류 */
const ASSET_KIND = '상장주식|비상장주식|출자지분|출자증권|수익증권|기타\\([^)]*\\)|기타'

const ROW_START = new RegExp(`^(${OWNER})\\s+(${ASSET_KIND})\\s*(.*)$`)

/**
 * 인물 헤더.
 *
 * ⚠️ 발행 기관마다 라벨 표기가 다르다. 정부공직자윤리위원회는 `소속 X 직위 Y 성명 Z`,
 *    대법원은 **`소 속 … 직 위 … 성 명 조 희 대`** 처럼 글자 사이에 공백을 넣는다.
 *    `소속` 으로만 찾으면 대법원 공고는 인물이 0명으로 잡힌다 (실제로 그랬다).
 *    그래서 라벨의 글자 사이 공백을 허용하고, 이름의 공백은 나중에 지운다.
 */
const PERSON_HEAD = /소\s*속\s*(.+?)\s+직\s*위\s*(.+?)\s+성\s*명\s*([^\n]+)/g

interface GazetteRow {
  owner: string
  kind: string
  body: string
}

interface GazettePerson {
  name: string
  office: string
  title: string
  rows: GazetteRow[]
  /** 총 재산 (천원) */
  total: number | null
}

function splitPersons(text: string): GazettePerson[] {
  const heads = [...text.matchAll(PERSON_HEAD)]
  const out: GazettePerson[] = []

  for (let i = 0; i < heads.length; i++) {
    const h = heads[i]!
    const block = text.slice(h.index + h[0].length, heads[i + 1]?.index ?? text.length)
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.replace(/[ -]/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean)

    const start = lines.findIndex((l) => /^▶\s*증권\(소계\)/.test(l))
    const total = /총\s*계\s*([\d,]+)/.exec(block)
    const person: GazettePerson = {
      // '조 희 대' → '조희대'. 대법원 표기는 글자 사이에 공백이 있다
      name: h[3]!.replace(/\s+/g, '').trim(),
      office: h[1]!.replace(/\s+/g, ' ').trim(),
      title: h[2]!.replace(/\s+/g, ' ').trim(),
      rows: [],
      total: total ? Number(total[1]!.replace(/,/g, '')) : null,
    }
    if (start < 0) {
      out.push(person)
      continue
    }

    let cur: GazetteRow | null = null
    for (let j = start + 1; j < lines.length; j++) {
      const line = lines[j]!
      if (/^▶/.test(line) || /^총\s*계/.test(line)) break
      const m = ROW_START.exec(line)
      if (m) {
        if (cur) person.rows.push(cur)
        cur = { owner: m[1]!, kind: m[2]!, body: m[3] ?? '' }
      } else if (cur) {
        cur.body += ' ' + line
      }
    }
    if (cur) person.rows.push(cur)
    out.push(person)
  }
  return out
}

/**
 * "SKC 2,000주, 삼성전자 6,500주 3,382,626" → 종목 목록 + 그 행의 **현재** 가액(천원).
 *
 * ⚠️ 기관마다 표 모양이 다르다. 실제 원문에서 확인한 두 형태:
 *
 *   정부 수시공개 — 가액 한 칸
 *     본인 상장주식 디지털대성 612주, 원익QnC 400주 16,954
 *
 *   대법원 변동사항 — 괄호에 변동, 가액 네 칸 + 비고
 *     장남 상장주식
 *     WALTDISNEYCOMPANY 0주(7주 감소), SNDLINC 0주(11주 감소)
 *     2,766 0 2,766 0 매도          ← 종전 · 증가 · 감소 · **현재** · 비고
 *
 * 이 형식을 몰랐을 때 대법원 공고의 주식 평가액이 전부 0원으로 나왔다.
 * 비고('매도')가 끝에 붙어 마지막 숫자를 못 찾았기 때문이다.
 *
 * 규칙:
 *  · 변동 괄호 `(7주 감소)` 는 지운다. 안 지우면 '7주'를 별도 종목으로 센다
 *    (숫자로 시작하는 괄호만 지운다 — '(주)경일' 같은 상호는 살려야 한다)
 *  · **현재 수량이 0주면 담지 않는다.** 다 판 종목까지 '보유'로 쓰면 거짓이다
 *  · 가액은 꼬리의 **마지막 숫자**. 한 칸이면 그 값, 네 칸이면 현재가액이다
 */
function parseHoldingsBody(body: string): {
  items: { name: string; qty: number }[]
  value: number | null
} {
  // 변동 표기를 걷어낸다. 숫자로 시작하는 괄호만 — 상호의 괄호는 남긴다
  const clean = body.replace(/\(\s*\d[^)]*\)/g, ' ')

  const items: { name: string; qty: number }[] = []
  for (const m of clean.matchAll(/([^,]+?)\s+([\d,]+)\s*주/g)) {
    const name = m[1]!.replace(/^[\s,]+/, '').trim()
    const qty = Number(m[2]!.replace(/,/g, ''))
    // 0주는 '더는 안 갖고 있다'는 뜻이다. 보유 목록에 넣으면 거짓이 된다
    if (!name || !Number.isFinite(qty) || qty <= 0) continue
    items.push({ name, qty })
  }

  // 마지막 '주' 뒤가 가액 칸이다. 비고(한글)가 붙을 수 있어 숫자만 훑는다
  const tail = clean.slice(clean.lastIndexOf('주') + 1)
  const nums = [...tail.matchAll(/([\d,]+)/g)].map((m) => Number(m[1]!.replace(/,/g, '')))
  let value = nums.length ? nums[nums.length - 1]! : null
  if (!Number.isFinite(value as number)) value = null

  // ⚠️ 종목을 들고 있는데 가액이 0이면 **우리가 잘못 읽은 것**이다.
  //    변동사항 표는 기관마다 칸 수와 순서가 달라 마지막 숫자가 늘 현재가액이라는
  //    보장이 없다 (대법원 공고에서 5종목 보유인데 0원으로 나왔다).
  //    0을 그대로 쓰면 "주식 0원"이라는 거짓이 되고 랭킹까지 오염된다.
  //    모르면 null 로 두고 화면이 금액을 숨기게 한다 (규칙 2).
  if (items.length > 0 && (value === null || value === 0)) value = null

  return { items, value }
}

/**
 * 공고 라벨과 공개일.
 *
 * ⚠️ 라벨은 **파일마다 유일해야 한다.** 이걸로 '이미 처리한 공고'를 판별하기 때문이다.
 *    정기공개는 같은 공고번호가 **기관별로 쪼개져** 나온다:
 *      정부공직자윤리위원회공고제2026-4호(2026년도 정기재산변동신고사항 공개, 감사원)
 *      정부공직자윤리위원회공고제2026-4호(…, 국가정보원)   ← 242개 파일이 같은 번호
 *    번호만 쓰면 첫 파일을 처리한 뒤 나머지 241개가 전부 '이미 처리'로 건너뛰어진다.
 *    그래서 괄호 안 꼬리(기관명)를 라벨에 함께 넣는다.
 */
function noticeInfo(title: string, text: string): { label: string; publishedAt: string | null } {
  const no = /제\s*(\d{4})-(\d+)\s*호/.exec(title) ?? /제\s*(\d{4})-(\d+)\s*호/.exec(text)
  const date = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/.exec(text)
  const org = /(정부공직자윤리위원회|대법원공직자윤리위원회|중앙선거관리위원회[가-힣]*|헌법재판소[가-힣]*|국회공직자윤리위원회)/.exec(
    text,
  )
  // 제목 괄호 안의 마지막 조각이 기관명이다. '…공개, 감사원)' → '감사원'
  const paren = /\(([^()]*)\)\s*$/.exec(title.trim())?.[1] ?? ''
  const suffix = paren.includes(',') ? paren.split(',').pop()!.trim() : ''

  const base = no ? `${org?.[1] ?? '공직자윤리위원회'}공고 제${no[1]}-${no[2]}호` : title
  return {
    label: suffix ? `${base} (${suffix})` : base,
    publishedAt: date
      ? `${date[1]}-${date[2]!.padStart(2, '0')}-${date[3]!.padStart(2, '0')}`
      : null,
  }
}

// ── 관보 PDF 확보 ────────────────────────────────────────────────────────────

interface Source {
  /** 중복 처리 방지 키 */
  key: string
  label: string
  bytes: Uint8Array
  /**
   * 색인이 알려준 발행일.
   *
   * ⚠️ PDF 본문에서 'YYYY년 M월 D일' 을 뽑는 게 1순위지만, 정기공개 본편에는
   *    그 문장이 없는 파일이 많다. 그때 공개일이 빈 문자열이 되고,
   *    같은 사람의 여러 공고가 전부 asOf='' 로 겹쳐 보유 내역이 덮어써졌다
   *    (실제로 스냅샷의 절반 가까이가 그랬다).
   *    색인(gazette.json)에는 발행일이 늘 있으므로 그걸 받아 둔다.
   */
  publishedAt: string | null
}

async function downloadNotice(n: GazetteNotice): Promise<Uint8Array | null> {
  const cached = join(CACHE_DIR, `${n.id}.pdf`)
  if (existsSync(cached)) return new Uint8Array(readFileSync(cached))

  const res = await fetch(DOWNLOAD, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: new URLSearchParams({ cntnt_seq_no: n.id }),
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) return null
  const buf = new Uint8Array(await res.arrayBuffer())
  // 뷰어 HTML 이 돌아오는 경우가 있다. PDF 가 아니면 파싱하지 않는다
  if (String.fromCharCode(...buf.subarray(0, 4)) !== '%PDF') return null
  mkdirSync(CACHE_DIR, { recursive: true })
  writeFileSync(cached, buf)
  return buf
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n재산공개 관보 수집\n`)

  const personsPath = join(DATA_DIR, 'persons.json')
  const officialsPath = join(DATA_DIR, 'officials.json')
  const holdingsPath = join(DATA_DIR, 'officials-holdings.json')

  const doneListPath = join(DATA_DIR, 'officials-notices.json')

  const persons = JSON.parse(readFileSync(personsPath, 'utf8')) as Person[]
  // 예전엔 공직자가 persons.json 에 섞여 있었다. 남아 있으면 걷어낸다
  const insiders = persons.filter((p) => p.type !== 'official')
  let existing: Person[] = []
  let existingHoldings: OfficialHoldings = {}
  try {
    existing = JSON.parse(readFileSync(officialsPath, 'utf8')) as Person[]
    existingHoldings = JSON.parse(readFileSync(holdingsPath, 'utf8')) as OfficialHoldings
  } catch {
    // 첫 실행
  }

  // 이미 처리한 관보는 다시 받지 않는다.
  //
  // ⚠️ 판정 기준은 **관보 고유 id** 다. 처음엔 공고 라벨로 판정했는데,
  //    정기공개가 같은 공고번호로 기관별 242개 파일로 쪼개져 나오고
  //    (제2026-4호(…, 감사원) / (…, 국가정보원) …), 서로 다른 위원회가
  //    같은 번호를 쓰는 경우까지 있어 라벨은 유일하지 않다.
  //    라벨로 판정하면 첫 파일만 처리하고 나머지를 통째로 건너뛴다.
  let doneIds = new Set<string>()
  if (!redoAll) {
    try {
      doneIds = new Set(JSON.parse(readFileSync(doneListPath, 'utf8')) as string[])
    } catch {
      // 첫 실행
    }
  }

  const sources: Source[] = []

  // ① 색인(gazette.json)의 재산공개 관보를 자동으로 받는다
  let notices: GazetteNotice[] = []
  try {
    notices = JSON.parse(readFileSync(join(DATA_DIR, 'gazette.json'), 'utf8')) as GazetteNotice[]
  } catch {
    console.log('  gazette.json 이 없습니다 — 먼저 `npm --prefix pipeline run gazette` 를 돌리세요')
  }
  // ⚠️ 처음엔 `/재산공개|재산등록/` 로 좁혀 놨다가 **정기공개 본편을 통째로 빼먹었다.**
  //    매년 3월 공고 제목이 '정기재산변동신고사항 공개' 라 저 두 단어에 안 걸린다.
  //    296건 중 244건이 그렇게 빠졌고, 그게 수시공개보다 훨씬 큰 자료였다.
  //    색인(gazette.ts)이 이미 '재산' 으로 걸러 두므로 여기서 더 좁힐 이유가 없다.
  const assetNotices = notices
    .filter((n) => /재산/.test(n.title))
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))

  console.log(`색인의 재산 관보 ${assetNotices.length}건 · 이미 처리 ${doneIds.size}건`)

  let fetched = 0
  const processedIds = new Set<string>(doneIds)
  for (const n of assetNotices) {
    if (fetched >= limit) break
    if (!redoAll && doneIds.has(n.id)) continue
    try {
      const bytes = await downloadNotice(n)
      if (!bytes) {
        skip('PDF 다운로드 실패')
        continue
      }
      const fromCache = existsSync(join(CACHE_DIR, `${n.id}.pdf`))
      sources.push({ key: n.id, label: n.title, bytes, publishedAt: n.publishedAt })
      processedIds.add(n.id)
      fetched++
      if (fromCache) continue // 캐시에서 읽었으면 서버를 안 두드렸으므로 쉴 이유가 없다
      console.log(`  ↓ ${n.publishedAt} ${n.title.slice(0, 44)} (${(bytes.length / 1024 / 1024).toFixed(2)}MB)`)
    } catch {
      skip('PDF 다운로드 실패')
    }
    // 관보 서버에 부담을 주지 않는다. 공개 문서지만 연달아 두드릴 이유가 없다
    await sleep(1500)
  }

  // ② 손으로 넣은 PDF 도 읽는다 (색인에 없는 과거 관보용)
  try {
    for (const f of readdirSync(PDF_DIR).filter((x) => x.toLowerCase().endsWith('.pdf'))) {
      sources.push({
        key: `file:${f}`,
        label: f,
        bytes: new Uint8Array(readFileSync(join(PDF_DIR, f))),
        publishedAt: null,
      })
    }
  } catch {
    // pipeline/data 가 없으면 그냥 넘어간다
  }

  if (!sources.length) {
    console.log('\n새로 처리할 관보가 없습니다.')
    return
  }

  const tickers = await buildTickerMap()

  // ── 파싱 ──────────────────────────────────────────────────────────────────
  /** (공고, 인물) 단위 스냅샷. 인물 id 는 이름 유일성이 정해진 뒤에 붙인다 */
  interface Snap {
    name: string
    office: string
    title: string
    asOf: string
    noticeLabel: string
    totalAssets: number
    stockValue: number | null
    holdings: PersonHolding[]
  }
  const snaps: Snap[] = []
  const unmatched = new Set<string>()

  for (const src of sources) {
    const pdf = await getDocumentProxy(src.bytes)
    const { text, totalPages } = await extractText(pdf, { mergePages: true })
    const parsedNotice = noticeInfo(src.label, text)
    // 본문에서 못 뽑으면 색인의 발행일을 쓴다. 공개일 없는 스냅샷은 쌓을 수가 없다
    const notice = { ...parsedNotice, publishedAt: parsedNotice.publishedAt ?? src.publishedAt }
    const parsed = splitPersons(text)
    let withStock = 0

    for (const p of parsed) {
      const holdings: PersonHolding[] = []
      let listedValue = 0
      let sawListed = false
      let valueUnknown = false

      for (const row of p.rows) {
        if (row.kind !== '상장주식') {
          skip(`증권 종류 ${row.kind}`)
          continue
        }
        const { items, value } = parseHoldingsBody(row.body)
        if (!items.length) {
          skip('종목 파싱 실패')
          continue
        }
        sawListed = true
        // 한 행이라도 가액을 모르면 합계를 만들지 않는다.
        // 아는 것만 더하면 '있는 것보다 적은 금액'을 사실처럼 보여주게 된다
        if (value === null) valueUnknown = true
        else listedValue += value
        for (const it of items) {
          const code = tickers.get(it.name) ?? tickers.get(normStock(it.name)) ?? null
          if (!code) unmatched.add(it.name)
          holdings.push({ stockCode: code, stockName: it.name, quantity: it.qty, owner: row.owner })
        }
      }

      if (!holdings.length) continue
      const asOf = notice.publishedAt
      if (!asOf) {
        // 시점을 모르면 추이에 놓을 자리가 없다. 억지로 넣으면 다른 시점과 겹쳐 덮어쓴다
        skip('공개일을 알 수 없음')
        continue
      }
      withStock++
      snaps.push({
        name: p.name,
        office: p.office,
        title: p.title,
        asOf,
        noticeLabel: notice.label,
        totalAssets: (p.total ?? 0) * THOUSAND,
        stockValue: sawListed && !valueUnknown ? listedValue * THOUSAND : null,
        holdings,
      })
    }

    console.log(
      `  ✓ ${notice.label} · ${totalPages}쪽 · 인물 ${parsed.length}명 중 주식 보유 ${withStock}명`,
    )
  }

  // ── 인물 id 정하기 ────────────────────────────────────────────────────────
  //
  // 소속은 시간이 지나면 바뀐다(승진·이동). id 에 소속을 넣으면 같은 사람이
  // 공고마다 다른 사람으로 갈라져 **추이가 끊긴다**.
  // 그렇다고 이름만 쓰면 동명이인이 한 사람으로 합쳐진다.
  // 그래서 이름이 유일하면 이름만, 겹치면 소속을 덧붙인다.
  const nameOffices = new Map<string, Set<string>>()
  for (const s of snaps) {
    if (!nameOffices.has(s.name)) nameOffices.set(s.name, new Set())
    nameOffices.get(s.name)!.add(s.office)
  }
  const ambiguous = new Set(
    [...nameOffices].filter(([, offices]) => offices.size > 1).map(([name]) => name),
  )
  const idOf = (s: Snap) =>
    (ambiguous.has(s.name) ? `official-${s.office}-${s.name}` : `official-${s.name}`).replace(
      /\s+/g,
      '',
    )

  // ── 인물별로 시점 스냅샷을 쌓는다 ──────────────────────────────────────────
  const byId = new Map<string, Person>()
  /** 인물 → 시점 → 보유. 목록 파일과 분리해 따로 저장한다 */
  const holdingsById: OfficialHoldings = {}
  // 기존 공직자를 먼저 넣어 예전 공고 결과를 잃지 않는다.
  // 단 --all 은 **처음부터 다시 쌓는다** — id 체계가 바뀌면(소속 포함 → 이름만)
  // 같은 사람이 옛 id 와 새 id 로 갈라져 인원이 두 배가 된다. 실제로 그랬다.
  if (!redoAll) {
    for (const p of existing) byId.set(p.id, structuredClone(p))
    Object.assign(holdingsById, structuredClone(existingHoldings))
  }

  for (const s of snaps) {
    const id = idOf(s)
    const entry: OfficialAssetYear = {
      year: Number(s.asOf.slice(0, 4)) || new Date().getFullYear(),
      asOf: s.asOf,
      totalAssets: s.totalAssets,
      stockValue: s.stockValue,
      holdingCount: s.holdings.length,
      notice: s.noticeLabel,
    }
    holdingsById[idOf(s)] ??= {}
    holdingsById[idOf(s)]![s.asOf] = s.holdings
    const prev = byId.get(id)
    if (!prev) {
      byId.set(id, {
        id,
        name: s.name,
        type: 'official',
        title: s.title,
        company: s.office,
        // 목록 파일에는 보유 내역을 넣지 않는다 (officials-holdings.json 참고)
        holdings: [],
        officialAssets: [entry],
        officialOffice: `${s.office} ${s.title}`.trim(),
        sourceNote: `${s.noticeLabel}${s.asOf ? ` (${s.asOf} 공개)` : ''}`,
        totalNetBuy12m: 0,
      })
      continue
    }
    // 같은 공고를 다시 처리하면 덮어쓴다 (--all 로 재수집할 때)
    const assets = (prev.officialAssets ?? []).filter((a) => a.notice !== entry.notice)
    assets.push(entry)
    assets.sort((a, b) => b.asOf.localeCompare(a.asOf))
    prev.officialAssets = assets
    // 최신 공고가 인물의 대표값이 된다
    const latest = assets[0]!
    if (latest.notice === entry.notice) {
      prev.title = s.title
      prev.company = s.office
      prev.officialOffice = `${s.office} ${s.title}`.trim()
      prev.sourceNote = `${s.noticeLabel}${s.asOf ? ` (${s.asOf} 공개)` : ''}`
    }
  }

  const officials = [...byId.values()]
  // 공직자를 목록 파일과 보유 파일로 나눈다.
  // 합치면 4.85MB 라 홈·랭킹·탐색까지 그 무게를 지불하게 된다 (스파크라인과 같은 이유).
  //   officials.json           907KB → gzip 80KB   (목록·랭킹용)
  //   officials-holdings.json  2.3MB → gzip 299KB  (인물·종목 상세에서만)
  writeFileSync(personsPath, JSON.stringify(insiders, null, 1) + '\n', 'utf8')
  writeFileSync(officialsPath, JSON.stringify(officials, null, 1) + '\n', 'utf8')
  writeFileSync(holdingsPath, JSON.stringify(holdingsById, null, 1) + '\n', 'utf8')
  // 처리한 관보 id — 다음 실행이 여기서 증분을 판단한다
  writeFileSync(doneListPath, JSON.stringify([...processedIds].sort(), null, 1) + '\n', 'utf8')

  // ── meta ──────────────────────────────────────────────────────────────────
  const metaPath = join(DATA_DIR, 'meta.json')
  const meta: Meta = JSON.parse(readFileSync(metaPath, 'utf8'))
  const latestAsOf = officials
    .flatMap((p) => p.officialAssets ?? [])
    .map((a) => a.asOf)
    .filter(Boolean)
    .sort()
    .at(-1)
  meta.officialsAsOf = latestAsOf ?? null
  meta.counts.persons = insiders.length + officials.length
  const src = '행정안전부 관보 원문 — 공직자 재산공개 (증권 항목)'
  if (!meta.sources.includes(src)) meta.sources.push(src)
  meta.skipped = {
    total: meta.skipped.total + skipped.total,
    reasons: { ...meta.skipped.reasons, ...skipped.reasons },
  }
  writeFileSync(metaPath, JSON.stringify(meta, null, 1) + '\n', 'utf8')

  const multi = officials.filter((p) => (p.officialAssets?.length ?? 0) > 1)
  console.log(`\n─── 결과 ───`)
  console.log(`공직자 ${officials.length}명 · 공고 ${new Set(snaps.map((s) => s.noticeLabel)).size}건 처리`)
  console.log(`**추이가 있는(2회 이상 공개된) 공직자 ${multi.length}명**`)
  if (multi.length) {
    console.log(`  예: ${multi.slice(0, 3).map((p) => `${p.name}(${p.officialAssets!.length}회)`).join(' · ')}`)
  }
  console.log(`최근 공개일 ${meta.officialsAsOf ?? '알 수 없음'}`)
  console.log(`동명이인이라 소속을 붙인 인물 ${ambiguous.size}명`)
  console.log(`종목코드 매칭 실패 ${unmatched.size}종목 (이름만 표시, 링크 없음)`)
  if (skipped.total) {
    console.log(`\n담지 않은 항목 ${skipped.total}건`)
    Object.entries(skipped.reasons)
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => console.log(`  ${String(v).padStart(5)}  ${k}`))
  }
  console.log(`\n※ 상장주식만 담았습니다. 비상장주식·채권은 종목이 아니라 제외했습니다.`)
  console.log(`※ 명의(본인·배우자·자녀)를 보존합니다 — 가족 재산까지 함께 공개되는 자료입니다.`)
}

await main()
