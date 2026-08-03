/**
 * gazette.ts — 재산공개 **관보 색인** 수집 (행정안전부_관보_공직자 재산 공개, 15109164)
 *
 * ⚠️ 이 API 는 개인별 재산 금액을 주지 않는다. 실제로 호출해 확인한 응답 필드는
 *    관보번호·제목·발행일자·발행기관·근거법령·정정여부·**PDF 원문링크** 뿐이고,
 *    인물 이름도 금액도 없다. "홍길동 총재산 12억"은 관보 PDF 안에 있다.
 *
 * 그래서 이 스크립트가 만드는 건 **"언제 어떤 재산공개가 있었고 원문은 여기"** 라는 색인이다.
 * 금액 데이터는 officials.ts(공개 자료 파일)가 담당한다.
 *
 * 그럼에도 색인이 쓸모 있는 이유:
 *   · 최신 재산공개일을 자동으로 알 수 있다 (meta.officialsAsOf 의 근거)
 *   · 이용자가 원문을 직접 확인할 링크가 생긴다 (실명 데이터 책임)
 *   · 수시공개(퇴직·신규)까지 잡혀 "연 1회"보다 실제 리듬을 보여준다
 *
 * 실행: npm --prefix pipeline run gazette
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { GazetteNotice, Meta } from './types.ts'

const DATA_DIR = join(import.meta.dirname, '..', '..', 'app', 'public', 'data', 'kr')
const ENDPOINT = 'https://apis.data.go.kr/1741000/ApiPetyService/getApiPetyList'
/** pdfFilePath 가 상대경로로 와서 붙여야 한다 (open.gwanbo.go.kr 은 404, gwanbo.go.kr 이 정답) */
const GWANBO_BASE = 'https://gwanbo.go.kr'
const SOURCE_NOTE = '행정안전부 관보 — 공직자 재산 공개'

const KEY = process.env.DATA_GO_KR_KEY
if (!KEY) {
  console.error('DATA_GO_KR_KEY 가 없습니다. pipeline/.env 를 확인하세요.')
  process.exit(1)
}

interface ApiRow {
  cntntSeqNo?: string
  cntntSj?: string
  hopePblictDt?: string
  pblcnInstNm?: string
  basisLawNm?: string
  crtnYn?: string
  pdfFilePath?: string
}

/** '2026.07.24' → '2026-07-24' */
function toIso(v: string | undefined): string | null {
  if (!v) return null
  const d = v.replace(/\D/g, '')
  return d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : null
}

async function fetchPage(pageNo: number, from: string, to: string): Promise<{ rows: ApiRow[]; total: number }> {
  const url = new URL(ENDPOINT)
  url.searchParams.set('serviceKey', KEY!)
  url.searchParams.set('pageNo', String(pageNo))
  url.searchParams.set('pageSize', '100')
  url.searchParams.set('reqFrom', from)
  url.searchParams.set('reqTo', to)
  url.searchParams.set('type', '1')

  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  const text = await res.text()
  if (!text.trim().startsWith('{')) {
    const msg = /<returnAuthMsg>([^<]+)<\/returnAuthMsg>/.exec(text)?.[1] ?? text.slice(0, 160)
    throw new Error(msg)
  }
  const json = JSON.parse(text)
  const raw = json?.response?.items?.item ?? []
  return { rows: Array.isArray(raw) ? raw : [raw], total: Number(json?.response?.totalCount ?? 0) }
}

async function main() {
  // 최근 3년치면 최신 정기공개 + 수시공개를 충분히 덮는다
  const now = new Date(Date.now() + 9 * 3600_000) // KST
  const to = `${now.getUTCFullYear()}1231`
  const from = `${now.getUTCFullYear() - 2}0101`
  console.log(`\n관보 색인 수집 ${from} ~ ${to}\n`)

  const rows: ApiRow[] = []
  let page = 1
  let total = 0
  do {
    const r = await fetchPage(page, from, to)
    total = r.total
    rows.push(...r.rows)
    page++
    if (page > 30) break
  } while (rows.length < total)

  const skipped: Record<string, number> = {}
  const notices: GazetteNotice[] = []

  for (const r of rows) {
    const publishedAt = toIso(r.hopePblictDt)
    if (!r.cntntSeqNo || !r.cntntSj) { skipped['필수값 없음'] = (skipped['필수값 없음'] ?? 0) + 1; continue }
    if (!publishedAt) { skipped['발행일 파싱 실패'] = (skipped['발행일 파싱 실패'] ?? 0) + 1; continue }
    // 재산공개와 무관한 관보가 섞여 오면 걸러낸다
    if (!/재산/.test(r.cntntSj)) { skipped['재산공개 아님'] = (skipped['재산공개 아님'] ?? 0) + 1; continue }

    notices.push({
      id: r.cntntSeqNo,
      title: r.cntntSj.trim(),
      publishedAt,
      institution: r.pblcnInstNm?.trim() ?? '',
      law: r.basisLawNm?.trim() ?? '',
      isCorrection: r.crtnYn === '예',
      // 상대경로를 절대 URL 로. 링크가 깨지면 '원문 확인' 약속이 무너진다
      sourceUrl: r.pdfFilePath ? `${GWANBO_BASE}${r.pdfFilePath}` : `${GWANBO_BASE}/`,
    })
  }

  notices.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  writeFileSync(join(DATA_DIR, 'gazette.json'), JSON.stringify(notices, null, 1) + '\n', 'utf8')

  // meta 갱신 — 실제 금액 자료(officials.ts)가 없을 때도 '최근 공개일'은 알 수 있다
  const metaPath = join(DATA_DIR, 'meta.json')
  const meta: Meta = JSON.parse(readFileSync(metaPath, 'utf8'))
  if (!meta.sources.includes(SOURCE_NOTE)) meta.sources.push(SOURCE_NOTE)
  writeFileSync(metaPath, JSON.stringify(meta, null, 1) + '\n', 'utf8')

  const byInst = new Map<string, number>()
  notices.forEach((n) => byInst.set(n.institution, (byInst.get(n.institution) ?? 0) + 1))

  console.log(`─── 결과 ───`)
  console.log(`관보 ${notices.length}건 (API 총 ${total}건 중)`)
  console.log(`최근 공개  ${notices[0]?.publishedAt ?? '없음'} · ${notices[0]?.title ?? ''}`)
  console.log(`기관별     ${[...byInst].map(([k, v]) => `${k} ${v}`).join(' · ')}`)
  if (Object.keys(skipped).length) {
    console.log(`스킵`)
    Object.entries(skipped).forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`))
  }
  console.log(`\n⚠️ 이 목록은 **문서 색인**입니다. 개인별 재산 금액은 API 응답에 없고 관보 원문에 있습니다.`)
  console.log(`   금액 데이터는 'npm --prefix pipeline run officials' 로 공개 자료 파일을 넣어야 채워집니다.`)
}

await main()
