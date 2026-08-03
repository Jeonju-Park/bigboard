/**
 * dart.ts — DART OpenAPI 클라이언트 + 원문 파서.
 *
 * 설계 근거는 docs/04_dev/pipeline_design.md (STEP 2-A). 요약:
 * 단가·거래일·세부변동내역이 요약 API 에 없어서 원문 XML 을 파싱한다.
 * 원문은 ACODE/AUNIT 의미 코드로 태깅돼 있어 컬럼 위치에 의존하지 않는다.
 */
import { inflateRawSync } from 'node:zlib'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const BASE = 'https://opendart.fss.or.kr/api'
const CACHE_DIR = join(import.meta.dirname, '..', '.cache')

export function requireKey(): string {
  const key = process.env.DART_KEY
  if (!key) {
    throw new Error('DART_KEY 가 없습니다. pipeline/.env 또는 GitHub Secrets 를 확인하세요.')
  }
  return key
}

/** 네트워크 실패는 지수 백오프로 3회까지 재시도한다. 그래도 실패하면 호출부가 스킵 처리 */
async function fetchWithRetry(url: URL, attempts = 3): Promise<Response> {
  let lastError: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
      if (res.ok) return res
      // 5xx 는 재시도, 4xx 는 즉시 포기
      if (res.status < 500) throw new Error(`HTTP ${res.status}`)
      lastError = new Error(`HTTP ${res.status}`)
    } catch (e) {
      lastError = e
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 500 * 2 ** i))
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export interface DartListItem {
  corp_code: string
  corp_name: string
  stock_code: string
  corp_cls: string
  report_nm: string
  rcept_no: string
  flr_nm: string
  rcept_dt: string
  rm: string
}

/** 공시검색. DART 는 오류를 HTTP 가 아니라 본문 status 로 준다 (000=정상, 013=데이터없음) */
export async function listDisclosures(params: {
  bgn_de: string
  end_de: string
  pblntf_ty?: string
  pblntf_detail_ty?: string
  page_no: number
  page_count: number
}): Promise<{ status: string; message: string; total_count: number; total_page: number; list: DartListItem[] }> {
  const url = new URL(`${BASE}/list.json`)
  url.searchParams.set('crtfc_key', requireKey())
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  const res = await fetchWithRetry(url)
  const json = (await res.json()) as any
  return { ...json, list: json.list ?? [] }
}

export interface ElestockItem {
  rcept_no: string
  rcept_dt: string
  corp_code: string
  corp_name: string
  repror: string
  isu_exctv_rgist_at: string
  isu_exctv_ofcps: string
  isu_main_shrholdr: string
  sp_stock_lmp_cnt: string
  sp_stock_lmp_irds_cnt: string
  sp_stock_lmp_rate: string
  sp_stock_lmp_irds_rate: string
}

/** 임원·주요주주 소유상황 요약. 직위·등기여부와 교차검증용 수량을 여기서 얻는다 */
export async function elestock(corpCode: string): Promise<ElestockItem[]> {
  const url = new URL(`${BASE}/elestock.json`)
  url.searchParams.set('crtfc_key', requireKey())
  url.searchParams.set('corp_code', corpCode)
  const res = await fetchWithRetry(url)
  const json = (await res.json()) as any
  return json.status === '000' ? (json.list ?? []) : []
}

// ── 원문(document.xml) ────────────────────────────────────────────────────────

/**
 * ZIP 최소 리더. 필요한 압축방식은 저장(0)과 deflate(8) 둘뿐이고 zlib 은 내장이라
 * 외부 의존성을 추가하지 않는다.
 */
export function unzip(buf: Buffer): { name: string; data: Buffer }[] {
  const files: { name: string; data: Buffer }[] = []
  let eocd = -1
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('ZIP EOCD 없음')
  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)

  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('ZIP 중앙디렉터리 시그니처 불일치')
    const method = buf.readUInt16LE(p + 10)
    const compSize = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const localOff = buf.readUInt32LE(p + 42)
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8')
    const lNameLen = buf.readUInt16LE(localOff + 26)
    const lExtraLen = buf.readUInt16LE(localOff + 28)
    const start = localOff + 30 + lNameLen + lExtraLen
    const raw = buf.subarray(start, start + compSize)
    files.push({ name, data: method === 0 ? raw : inflateRawSync(raw) })
    p += 46 + nameLen + extraLen + commentLen
  }
  return files
}

/**
 * 원문 XML 을 가져온다. 디스크 캐시가 있으면 네트워크를 타지 않는다 —
 * 재실행·디버깅 비용을 0으로 만들고 DART 일일 한도를 아낀다.
 */
export async function fetchDocument(rceptNo: string): Promise<string> {
  mkdirSync(CACHE_DIR, { recursive: true })
  const cached = join(CACHE_DIR, `${rceptNo}.xml`)
  if (existsSync(cached)) return readFileSync(cached, 'utf8')

  const url = new URL(`${BASE}/document.xml`)
  url.searchParams.set('crtfc_key', requireKey())
  url.searchParams.set('rcept_no', rceptNo)
  const res = await fetchWithRetry(url)
  const buf = Buffer.from(await res.arrayBuffer())

  if (buf.subarray(0, 2).toString() !== 'PK') {
    // 한도 초과·권한 오류 등은 ZIP 대신 XML 오류문서로 온다
    throw new Error(`ZIP 아님: ${buf.subarray(0, 200).toString('utf8').replace(/\s+/g, ' ')}`)
  }
  const files = unzip(buf)
  const doc = files.find((f) => f.name.toLowerCase().endsWith('.xml')) ?? files[0]
  const head = doc.data.subarray(0, 200).toString('latin1')
  const enc = (/encoding=["']([^"']+)["']/i.exec(head)?.[1] ?? 'utf-8').toLowerCase()
  const text = new TextDecoder(enc).decode(doc.data)

  writeFileSync(cached, text, 'utf8')
  return text
}

// ── 원문 파싱 ────────────────────────────────────────────────────────────────

export type CodeRow = Record<string, string>

/**
 * 표의 각 <TR> 을 { 코드: 값 } 으로 바꾼다.
 *
 * ROWSPAN 병합 셀 때문에 뒤따르는 행에는 보고사유·변동일이 비는 경우가 있다(실측 90행 중 10행).
 * 그래서 지정한 코드들은 직전 값으로 forward-fill 한다.
 */
export function parseRows(xml: string, forwardFill: string[] = []): CodeRow[] {
  const rows: CodeRow[] = []
  const carry: CodeRow = {}

  for (const tr of xml.match(/<TR[\s\S]*?<\/TR>/gi) ?? []) {
    const row: CodeRow = {}
    for (const m of tr.matchAll(/<TE[^>]*\bACODE="([^"]+)"[^>]*>([\s\S]*?)<\/TE>/gi)) {
      row[m[1]] = clean(m[2])
    }
    for (const m of tr.matchAll(/<TU[^>]*\bAUNIT="([^"]+)"[^>]*>([\s\S]*?)<\/TU>/gi)) {
      row[m[1]] = clean(m[2])
      const v = /\bAUNITVALUE="([^"]*)"/i.exec(m[0])?.[1]
      if (v && v !== '-') row[`${m[1]}__v`] = v // 기계값(yyyymmdd 등)을 우선 쓴다
    }
    if (!Object.keys(row).length) continue

    for (const code of forwardFill) {
      if (isEmpty(row[code]) && !isEmpty(carry[code])) {
        row[code] = carry[code]
        if (carry[`${code}__v`]) row[`${code}__v`] = carry[`${code}__v`]
      } else if (!isEmpty(row[code])) {
        carry[code] = row[code]
        if (row[`${code}__v`]) carry[`${code}__v`] = row[`${code}__v`]
      }
    }
    rows.push(row)
  }
  return rows
}

function clean(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function isEmpty(v: string | undefined): boolean {
  return v === undefined || v === '' || v === '-'
}

/** "1,234" → 1234 · "-"/"" → null. 공시에 없는 값을 0 으로 바꾸지 않는다(규칙 2) */
export function num(v: string | undefined): number | null {
  if (isEmpty(v)) return null
  const n = Number(String(v).replace(/[,\s원주]/g, ''))
  return Number.isFinite(n) ? n : null
}

/** "2026.07.27" 또는 AUNITVALUE "20260727" → "2026-07-27" */
export function toIsoDate(v: string | undefined): string | null {
  if (isEmpty(v)) return null
  const digits = String(v).replace(/\D/g, '')
  if (digits.length !== 8) return null
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

/** DART 원문 뷰어 링크. 실명 데이터라 모든 건에 원문 링크가 붙어야 한다 */
export function dartUrl(rceptNo: string): string {
  return `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${rceptNo}`
}
