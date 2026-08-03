/**
 * sec.ts — SEC EDGAR 공용 클라이언트. form4.ts / thirteenf.ts 가 함께 쓴다.
 *
 * SEC 는 API 키가 없는 대신 두 가지를 요구한다. 둘 다 어기면 **IP 차단**이다.
 *   1) User-Agent 에 연락 가능한 이메일
 *   2) 초당 10회 이하
 *
 * 그래서 여기에 레이트리미터를 두고, 수집 스크립트가 직접 fetch 하지 못하게 한다.
 * (직접 부르기 시작하면 상한이 스크립트 수만큼 곱해진다)
 */

/** SEC 공지에 따른 연락처. 차단 시 SEC 가 연락할 수 있어야 한다 */
const USER_AGENT = 'bigboard/0.1 (jjsa6316@ajou.ac.kr)'

/** 공식 상한은 초당 10회. 여유를 둬서 8회로 잡는다 — 차단당하면 복구가 번거롭다 */
const MAX_PER_SEC = 8
const WINDOW_MS = 1000

/** 최근 1초 안에 보낸 요청 시각들 */
const recent: number[] = []

async function throttle(): Promise<void> {
  for (;;) {
    const now = Date.now()
    // 창 밖으로 나간 기록은 버린다
    while (recent.length && now - recent[0] > WINDOW_MS) recent.shift()
    if (recent.length < MAX_PER_SEC) {
      recent.push(now)
      return
    }
    // 가장 오래된 요청이 창을 벗어날 때까지 기다린다
    await sleep(WINDOW_MS - (now - recent[0]) + 10)
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export interface SecFetchOptions {
  /** 404 를 오류가 아니라 null 로 받고 싶을 때 (없는 파일 탐색용) */
  allowMissing?: boolean
}

/**
 * SEC 에 GET. 레이트리밋·재시도·User-Agent 를 여기서만 처리한다.
 * 404 는 `allowMissing` 일 때 null, 아니면 throw.
 */
export async function secFetch(url: string, opts: SecFetchOptions = {}): Promise<string | null> {
  let lastError: unknown
  for (let attempt = 0; attempt < 4; attempt++) {
    await throttle()
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          // SEC 는 gzip 을 권장한다. 하루 수백 MB 를 받으므로 의미가 있다
          'Accept-Encoding': 'gzip, deflate',
        },
        signal: AbortSignal.timeout(45_000),
      })

      // SEC 는 **없는 Archives 경로에 403 을 준다** (404 가 아니다).
      // 아직 생성되지 않은 당일 일별 인덱스가 여기 걸린다.
      // 그래서 403 도 '없음'으로 취급한다 — 재시도해도 절대 생기지 않으므로.
      if (res.status === 404 || res.status === 403) {
        if (opts.allowMissing) return null
        throw new Error(`404 ${url} (HTTP ${res.status})`)
      }
      // 429(과다요청)·5xx 는 기다렸다 다시. 그 외 4xx 는 재시도해도 같다
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status}`)
        await sleep(2000 * (attempt + 1))
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
      return await res.text()
    } catch (e) {
      // 404 는 재시도 대상이 아니다 — 여기서 걸러내지 않으면 4번 반복한다
      if (e instanceof Error && e.message.startsWith('404 ')) throw e
      lastError = e
      await sleep(1500 * (attempt + 1))
    }
  }
  throw new Error(`SEC 요청 실패 (4회 시도): ${url} — ${String(lastError)}`)
}

export async function secJson<T>(url: string): Promise<T> {
  const text = await secFetch(url)
  return JSON.parse(text!) as T
}

// ── 티커 매핑 ────────────────────────────────────────────────────────────────

export interface TickerEntry {
  cik: string
  ticker: string
  name: string
}

/**
 * CIK → 티커. Form 4·13F 는 CIK/CUSIP 으로 오는데 화면엔 티커를 보여야 한다.
 * 10,412 종목 · 약 800KB. 한 번 받아 메모리에 둔다.
 */
export async function loadTickers(): Promise<Map<string, TickerEntry>> {
  const raw = await secJson<Record<string, { cik_str: number; ticker: string; title: string }>>(
    'https://www.sec.gov/files/company_tickers.json',
  )
  const byCik = new Map<string, TickerEntry>()
  for (const v of Object.values(raw)) {
    // CIK 는 10자리 0채움이 표준 표기다
    const cik = String(v.cik_str).padStart(10, '0')
    // 한 회사에 복수 클래스(BRK.A/BRK.B)가 있으면 먼저 온 것을 대표로 둔다
    if (!byCik.has(cik)) byCik.set(cik, { cik, ticker: v.ticker, name: v.title })
  }
  return byCik
}

// ── 공용 유틸 ────────────────────────────────────────────────────────────────

/** SEC 문서 경로에 쓰는 형태 (하이픈 없는 accession) */
export function accessionPath(cik: string, accession: string): string {
  return `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession.replace(/-/g, '')}`
}

/** 사람이 볼 원문 링크 — 모든 상세에 붙는다 (실명 데이터 책임) */
export function filingUrl(cik: string, accession: string): string {
  return `${accessionPath(cik, accession)}/${accession}-index.htm`
}

/** 태그 1개의 텍스트. 네임스페이스 접두(ns1: 등)를 허용한다 */
export function tag(xml: string, name: string): string | null {
  const m = new RegExp(`<(?:\\w+:)?${name}>([\\s\\S]*?)</(?:\\w+:)?${name}>`).exec(xml)
  return m ? decodeXml(m[1].trim()) : null
}

/** `<x><value>..</value></x>` 형태 — Form 4 가 이 모양을 쓴다 */
export function tagValue(xml: string, name: string): string | null {
  const block = new RegExp(`<(?:\\w+:)?${name}>([\\s\\S]*?)</(?:\\w+:)?${name}>`).exec(xml)
  if (!block) return null
  const v = /<value>([\s\S]*?)<\/value>/.exec(block[1])
  return decodeXml((v ? v[1] : block[1]).trim())
}

export function tagAll(xml: string, name: string): string[] {
  return [...xml.matchAll(new RegExp(`<(?:\\w+:)?${name}>([\\s\\S]*?)</(?:\\w+:)?${name}>`, 'g'))].map(
    (m) => m[1],
  )
}

export function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 숫자 파싱. 빈 값·비수치는 null (0 으로 대체하면 집계가 거짓이 된다) */
export function num(v: string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(/[$,\s]/g, ''))
  return Number.isFinite(n) ? n : null
}

// ── KST 날짜 (화면·집계 기준을 국장과 맞춘다) ────────────────────────────────

export function kstNow(): Date {
  return new Date(Date.now() + 9 * 3600_000)
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** 'YYYYMMDD' 또는 'YYYY-MM-DD' → 'YYYY-MM-DD'. 실패하면 null */
export function normalizeDate(v: string | null | undefined): string | null {
  if (!v) return null
  const digits = v.replace(/\D/g, '')
  if (digits.length !== 8) return null
  const iso = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
  return Number.isNaN(Date.parse(iso)) ? null : iso
}

/** 두 날짜의 일수 차. 거래일→신고일 지연을 재는 데 쓴다 */
export function daysBetween(from: string, to: string): number | null {
  const a = Date.parse(from)
  const b = Date.parse(to)
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.round((b - a) / 86_400_000)
}
