/**
 * explore.ts — STEP 2-A 소스 탐색. 수집 구현 전에 "무엇이 실제로 오는지"만 확인한다.
 *
 * 실행: npm --prefix pipeline run explore -- <phase>
 * 결과는 화면에 요약만 찍고, 원본 샘플은 pipeline/.explore/ 에 저장한다(gitignore).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const KEY = process.env.DART_KEY
if (!KEY) {
  console.error('DART_KEY 가 없습니다. pipeline/.env 를 확인하세요.')
  process.exit(1)
}

const OUT = join(import.meta.dirname, '..', '.explore')
mkdirSync(OUT, { recursive: true })

const BASE = 'https://opendart.fss.or.kr/api'

/** DART 는 상태코드를 본문 status 필드로 준다. 000=정상, 013=데이터없음, 020=한도초과 등 */
async function dart(endpoint: string, params: Record<string, string>): Promise<any> {
  const url = new URL(`${BASE}/${endpoint}`)
  url.searchParams.set('crtfc_key', KEY!)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} ${endpoint}`)
  return res.json()
}

function save(name: string, data: unknown) {
  writeFileSync(join(OUT, name), JSON.stringify(data, null, 2), 'utf8')
}

/** yyyymmdd */
/** DART 조회용 'YYYYMMDD' (한국 날짜). UTC 로 만들면 하루 어긋난다 */
function ymd(d: Date): string {
  const k = new Date(d.getTime() + (9 * 60 + d.getTimezoneOffset()) * 60000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${k.getFullYear()}${p(k.getMonth() + 1)}${p(k.getDate())}`
}

const today = new Date()
const daysAgo = (n: number) => new Date(today.getTime() - n * 86400000)

// ─────────────────────────────────────────────────────────────────────────────

async function phase1_keyAndReportCensus() {
  console.log('\n### Phase 1 — 키 확인 + 지분공시(D) 보고서 종류 조사\n')

  const bgn = ymd(daysAgo(14))
  const end = ymd(today)

  // pblntf_ty=D 는 지분공시 전체
  const first = await dart('list.json', {
    bgn_de: bgn,
    end_de: end,
    pblntf_ty: 'D',
    page_no: '1',
    page_count: '100',
  })

  console.log(`status=${first.status} message=${first.message}`)
  if (first.status !== '000') {
    console.log('→ 데이터 없음 또는 오류. 기간을 넓혀 재시도합니다.')
    return { ok: false as const, status: first.status }
  }

  console.log(`기간 ${bgn}~${end} · 총 ${first.total_count}건 · ${first.total_page}페이지`)

  // 보고서명 분포를 보면 어떤 유형이 우리 스키마에 해당하는지 알 수 있다
  const census = new Map<string, number>()
  const pages = Math.min(first.total_page, 5)
  let all: any[] = [...first.list]
  for (let p = 2; p <= pages; p++) {
    const r = await dart('list.json', {
      bgn_de: bgn,
      end_de: end,
      pblntf_ty: 'D',
      page_no: String(p),
      page_count: '100',
    })
    if (r.status === '000') all = all.concat(r.list)
  }
  for (const item of all) {
    // 보고서명에서 [기재정정] 같은 접두어를 분리해 유형만 센다
    const base = String(item.report_nm).replace(/\[[^\]]*\]/g, '').trim()
    census.set(base, (census.get(base) ?? 0) + 1)
  }

  console.log(`\n샘플 ${all.length}건의 보고서 유형 분포:`)
  ;[...census.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, n]) => console.log(`  ${String(n).padStart(4)}건  ${name}`))

  // 정정공시 비율 — upsert 설계 근거
  const amended = all.filter((i) => /정정/.test(i.report_nm)).length
  console.log(`\n정정 표기 포함: ${amended}건 (${((amended / all.length) * 100).toFixed(1)}%)`)

  console.log('\nlist.json 한 건의 필드:')
  console.log('  ' + Object.keys(all[0]).join(', '))
  console.log('\n샘플 1건:')
  console.log(JSON.stringify(all[0], null, 2).split('\n').map((l) => '  ' + l).join('\n'))

  save('phase1-list-D.json', all)
  return { ok: true as const, all }
}

async function phase2_summaryApis() {
  console.log('\n### Phase 2 — 요약 API 에 단가·수량이 있는가\n')

  const bgn = ymd(daysAgo(7))
  const end = ymd(today)

  // D002 = 임원ㆍ주요주주 특정증권등 소유상황보고서
  const list = await dart('list.json', {
    bgn_de: bgn,
    end_de: end,
    pblntf_ty: 'D',
    pblntf_detail_ty: 'D002',
    page_no: '1',
    page_count: '20',
  })
  if (list.status !== '000') {
    console.log(`D002 목록 조회 실패: ${list.status} ${list.message}`)
    return
  }
  console.log(`D002 최근 ${list.list.length}건 확보 (총 ${list.total_count}건)`)

  const sample = list.list[0]
  console.log(`\n샘플 대상: ${sample.corp_name}(${sample.corp_code}) / 보고자 ${sample.flr_nm} / 접수 ${sample.rcept_no}`)

  // ── elestock.json — 임원·주요주주 소유상황보고 주요정보
  const ele = await dart('elestock.json', { corp_code: sample.corp_code })
  console.log(`\n[elestock.json] status=${ele.status} ${ele.message ?? ''}`)
  if (ele.status === '000' && ele.list?.length) {
    console.log(`  건수: ${ele.list.length}`)
    console.log('  필드: ' + Object.keys(ele.list[0]).join(', '))
    const hit = ele.list.find((r: any) => r.rcept_no === sample.rcept_no) ?? ele.list[0]
    console.log('  해당 접수번호 레코드:')
    console.log(JSON.stringify(hit, null, 2).split('\n').map((l) => '    ' + l).join('\n'))
    save('phase2-elestock.json', ele.list)

    // 우리 스키마가 요구하는 값이 있는지 직접 확인
    const keys = Object.keys(hit).join(' ')
    console.log('\n  ▸ 단가(unitPrice) 필드 존재:', /unt|price|단가|취득.*가/i.test(keys) ? 'YES' : 'NO')
    console.log('  ▸ 증감수량 필드 존재:', /irds/i.test(keys) ? 'YES (sp_stock_lmp_irds_cnt)' : 'NO')
    console.log('  ▸ 거래일(tradeDate) 필드 존재:', /trd|거래일|chg_de/i.test(keys) ? 'YES' : 'NO')
  }

  // ── majorstock.json — 대량보유 상황보고
  const major = await dart('majorstock.json', { corp_code: sample.corp_code })
  console.log(`\n[majorstock.json] status=${major.status} ${major.message ?? ''}`)
  if (major.status === '000' && major.list?.length) {
    console.log('  필드: ' + Object.keys(major.list[0]).join(', '))
    console.log(JSON.stringify(major.list[0], null, 2).split('\n').map((l) => '    ' + l).join('\n'))
    save('phase2-majorstock.json', major.list)
  }

  save('phase2-list-D002.json', list.list)
  return sample
}

/**
 * DART 원문(document.xml)은 ZIP 바이너리로 온다.
 * 의존성을 늘리지 않으려고 최소 ZIP 리더를 직접 만든다 —
 * 필요한 건 "저장(0)"과 "deflate(8)" 두 압축방식뿐이고 zlib 은 내장이다.
 */
async function unzip(buf: Buffer): Promise<{ name: string; data: Buffer }[]> {
  const { inflateRawSync } = await import('node:zlib')
  const files: { name: string; data: Buffer }[] = []
  // End of Central Directory 를 뒤에서부터 찾는다
  let eocd = -1
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('ZIP EOCD 를 찾지 못했습니다')
  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)

  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('중앙 디렉터리 시그니처 불일치')
    const method = buf.readUInt16LE(p + 10)
    const compSize = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const localOff = buf.readUInt32LE(p + 42)
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8')

    // 로컬 헤더에서 실제 데이터 시작 위치를 다시 계산한다(extra 길이가 다를 수 있음)
    const lNameLen = buf.readUInt16LE(localOff + 26)
    const lExtraLen = buf.readUInt16LE(localOff + 28)
    const dataStart = localOff + 30 + lNameLen + lExtraLen
    const raw = buf.subarray(dataStart, dataStart + compSize)
    files.push({ name, data: method === 0 ? raw : inflateRawSync(raw) })

    p += 46 + nameLen + extraLen + commentLen
  }
  return files
}

async function phase3_documentParsing() {
  console.log('\n### Phase 3 — 원문 파싱으로 단가·거래일·세부변동내역 확보 가능한가\n')

  const list = JSON.parse(
    await import('node:fs').then((fs) => fs.readFileSync(join(OUT, 'phase2-list-D002.json'), 'utf8')),
  )
  const sample = list[0]
  console.log(`대상: ${sample.corp_name} / ${sample.flr_nm} / rcept_no=${sample.rcept_no}`)

  const url = new URL(`${BASE}/document.xml`)
  url.searchParams.set('crtfc_key', KEY!)
  url.searchParams.set('rcept_no', sample.rcept_no)
  const res = await fetch(url)
  const buf = Buffer.from(await res.arrayBuffer())
  console.log(`응답 ${res.status} · ${buf.length.toLocaleString()} bytes · content-type=${res.headers.get('content-type')}`)

  if (buf.subarray(0, 2).toString() !== 'PK') {
    console.log('ZIP 이 아닙니다. 앞부분:', buf.subarray(0, 300).toString('utf8'))
    return
  }

  const files = await unzip(buf)
  console.log(`\nZIP 내부 파일 ${files.length}개:`)
  files.forEach((f) => console.log(`  ${f.name} — ${f.data.length.toLocaleString()} bytes`))

  const doc = files[0]
  // DART 원문은 EUC-KR 이 많다. 선언을 보고 결정한다
  const head = doc.data.subarray(0, 200).toString('latin1')
  const encMatch = /encoding=["']([^"']+)["']/i.exec(head)
  const enc = (encMatch?.[1] ?? 'utf-8').toLowerCase()
  console.log(`\nXML 선언 인코딩: ${enc}`)
  const text = new TextDecoder(enc === 'euc-kr' ? 'euc-kr' : enc).decode(doc.data)

  writeFileSync(join(OUT, 'phase3-document.xml'), text, 'utf8')
  console.log(`디코딩 후 ${text.length.toLocaleString()}자 → .explore/phase3-document.xml`)

  // 우리가 필요한 값이 문서 안에 실제로 있는지 키워드로 확인
  const probes: [string, RegExp][] = [
    ['세부변동내역', /세부\s*변동\s*내역/],
    ['취득/처분 단가', /단\s*가/],
    ['변동일', /변동\s*일/],
    ['보고사유', /보고\s*사유/],
    ['취득/처분 방법', /취득\s*[·\/]?\s*처분\s*방법/],
    ['특정증권등의 종류', /특정증권등의?\s*종류/],
  ]
  console.log('\n원문 내 키워드 존재 여부:')
  for (const [label, re] of probes) console.log(`  ${re.test(text) ? '✓' : '✗'} ${label}`)

  // 표 구조 파악
  const tables = text.match(/<TABLE[\s\S]*?<\/TABLE>/gi) ?? []
  console.log(`\n<TABLE> ${tables.length}개`)
  const detailTable = tables.find((t) => /단\s*가/.test(t) && /변동\s*일/.test(t))
  if (detailTable) {
    const rows = detailTable.match(/<TR[\s\S]*?<\/TR>/gi) ?? []
    console.log(`세부변동내역으로 보이는 표: ${rows.length}행`)
    console.log('\n앞 5행을 셀 단위로:')
    rows.slice(0, 5).forEach((tr, i) => {
      const cells = (tr.match(/<T[DH][\s\S]*?<\/T[DH]>/gi) ?? []).map((c) =>
        c.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(),
      )
      console.log(`  [${i}] ${JSON.stringify(cells)}`)
    })
    writeFileSync(join(OUT, 'phase3-detail-table.html'), detailTable, 'utf8')
  } else {
    console.log('단가+변동일을 동시에 가진 표를 못 찾았습니다. 표 헤더들을 나열합니다:')
    tables.slice(0, 8).forEach((t, i) => {
      const firstRow = (t.match(/<TR[\s\S]*?<\/TR>/i) ?? [''])[0]
      const cells = (firstRow.match(/<T[DH][\s\S]*?<\/T[DH]>/gi) ?? []).map((c) =>
        c.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
      )
      console.log(`  표${i}: ${JSON.stringify(cells.slice(0, 8))}`)
    })
  }
}

/** rcept_no → 디코딩된 원문 XML */
async function fetchDocument(rceptNo: string): Promise<string> {
  const url = new URL(`${BASE}/document.xml`)
  url.searchParams.set('crtfc_key', KEY!)
  url.searchParams.set('rcept_no', rceptNo)
  const res = await fetch(url)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.subarray(0, 2).toString() !== 'PK') throw new Error(`ZIP 아님: ${buf.subarray(0, 120).toString()}`)
  const files = await unzip(buf)
  const doc = files.find((f) => f.name.toLowerCase().endsWith('.xml')) ?? files[0]
  const head = doc.data.subarray(0, 200).toString('latin1')
  const enc = (/encoding=["']([^"']+)["']/i.exec(head)?.[1] ?? 'utf-8').toLowerCase()
  return new TextDecoder(enc).decode(doc.data)
}

/** 세부변동내역 행을 ACODE/AUNIT 속성 기준으로 뽑는다 — 컬럼 순서에 의존하지 않는다 */
function parseDetailRows(xml: string) {
  const rows: Record<string, string>[] = []
  for (const tr of xml.match(/<TR[\s\S]*?<\/TR>/gi) ?? []) {
    const row: Record<string, string> = {}
    // <TE ACODE="X">값</TE>
    for (const m of tr.matchAll(/<TE[^>]*\bACODE="([^"]+)"[^>]*>([\s\S]*?)<\/TE>/gi)) {
      row[m[1]] = m[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
    }
    // <TU AUNIT="X" AUNITVALUE="Y">표시값</TU> — 기계값(AUNITVALUE)을 우선 보관
    for (const m of tr.matchAll(/<TU[^>]*\bAUNIT="([^"]+)"[^>]*>([\s\S]*?)<\/TU>/gi)) {
      const tag = m[0]
      const val = /\bAUNITVALUE="([^"]*)"/i.exec(tag)?.[1] ?? ''
      row[m[1]] = m[2].replace(/<[^>]+>/g, '').trim()
      if (val) row[`${m[1]}__v`] = val
    }
    if (Object.keys(row).length) rows.push(row)
  }
  return rows
}

async function phase4_robustness() {
  console.log('\n### Phase 4 — 여러 건에서 ACODE 파싱이 견디는가 + 엣지 케이스 분포\n')

  const bgn = ymd(daysAgo(10))
  const list = await dart('list.json', {
    bgn_de: bgn,
    end_de: ymd(today),
    pblntf_ty: 'D',
    pblntf_detail_ty: 'D002',
    page_no: '1',
    page_count: '25',
  })

  const stats = {
    docs: 0,
    parsed: 0,
    detailRows: 0,
    withPrice: 0,
    priceDash: 0,
    reasons: new Map<string, number>(),
    remarks: new Map<string, number>(),
    sumMismatch: [] as string[],
  }

  for (const item of list.list.slice(0, 20)) {
    stats.docs++
    let xml: string
    try {
      xml = await fetchDocument(item.rcept_no)
    } catch (e) {
      console.log(`  ✗ ${item.rcept_no} 원문 실패: ${(e as Error).message.slice(0, 60)}`)
      continue
    }
    const rows = parseDetailRows(xml)
    // 데이터 행 = 증감수량 코드를 가진 행 (합계행은 MDF_STK_SUM 을 쓴다)
    const dataRows = rows.filter((r) => 'MDF_STK_CNT' in r)
    const totalRow = rows.find((r) => 'MDF_STK_SUM' in r)
    if (!dataRows.length) {
      console.log(`  ⚠ ${item.rcept_no} (${item.corp_name}) 세부변동 행 0개`)
      continue
    }
    stats.parsed++
    stats.detailRows += dataRows.length

    for (const r of dataRows) {
      const price = r.ACI_AMT2 ?? ''
      if (price && price !== '-') stats.withPrice++
      else stats.priceDash++
      const reason = r.RPT_RSN ?? '(없음)'
      stats.reasons.set(reason, (stats.reasons.get(reason) ?? 0) + 1)
      const rmk = r.RMK ?? '(없음)'
      stats.remarks.set(rmk, (stats.remarks.get(rmk) ?? 0) + 1)
    }

    // 합계행과 개별행 증감 합이 맞는지 = 파싱 자체 검증
    if (totalRow) {
      const num = (s: string) => Number(String(s).replace(/[,\s]/g, '')) || 0
      const sum = dataRows.reduce((a, r) => a + num(r.MDF_STK_CNT), 0)
      const declared = num(totalRow.MDF_STK_SUM)
      if (sum !== declared) stats.sumMismatch.push(`${item.rcept_no} 계산=${sum} 공시합계=${declared}`)
    }
  }

  console.log(`원문 ${stats.docs}건 중 파싱 성공 ${stats.parsed}건`)
  console.log(`세부변동 행 총 ${stats.detailRows}개`)
  console.log(`  단가 있음: ${stats.withPrice} · 단가 '-' (무상증여·상속 등): ${stats.priceDash}`)
  console.log(`\n합계 검증 불일치: ${stats.sumMismatch.length}건`)
  stats.sumMismatch.slice(0, 5).forEach((s) => console.log(`  ${s}`))

  console.log('\n보고사유 분포:')
  ;[...stats.reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
    .forEach(([k, v]) => console.log(`  ${String(v).padStart(3)}  ${k}`))
  console.log('\n비고(RMK) 분포:')
  ;[...stats.remarks.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
    .forEach(([k, v]) => console.log(`  ${String(v).padStart(3)}  ${k}`))
}

async function phase5_tradePlan() {
  console.log('\n### Phase 5 — 거래계획 사전공시(isPlanned·dDay 소스)\n')

  // 전용 상세유형 코드가 있는지 먼저 확인한다 (있으면 수집이 훨씬 싸진다)
  for (const code of ['D005', 'D006']) {
    const r = await dart('list.json', {
      bgn_de: ymd(daysAgo(30)),
      end_de: ymd(today),
      pblntf_ty: 'D',
      pblntf_detail_ty: code,
      page_no: '1',
      page_count: '5',
    })
    const names = r.status === '000' ? [...new Set(r.list.map((i: any) => String(i.report_nm).replace(/\[[^\]]*\]/g, '').trim()))] : []
    console.log(`  ${code}: status=${r.status} total=${r.total_count ?? 0} ${names.length ? '→ ' + names.join(' / ') : ''}`)
  }

  // Phase 1 이 저장한 500건에서 거래계획 건을 찾는다
  const cached = JSON.parse(
    await import('node:fs').then((fs) => fs.readFileSync(join(OUT, 'phase1-list-D.json'), 'utf8')),
  )
  const plans = cached.filter((i: any) => /거래계획/.test(i.report_nm))
  console.log(`\nPhase1 캐시 ${cached.length}건 중 거래계획 관련 ${plans.length}건`)
  plans.slice(0, 8).forEach((p: any) => console.log(`  ${p.rcept_dt} ${p.corp_name} / ${p.flr_nm} / ${p.report_nm}`))

  const target = plans.find((p: any) => !/철회/.test(p.report_nm))
  if (!target) {
    console.log('\n계획보고서 샘플이 없습니다.')
    return
  }
  console.log(`\n원문 확인: ${target.corp_name} / ${target.flr_nm} / ${target.rcept_no}`)
  const xml = await fetchDocument(target.rcept_no)
  writeFileSync(join(OUT, 'phase5-plan.xml'), xml, 'utf8')

  const rows = parseDetailRows(xml)
  const codes = new Set<string>()
  rows.forEach((r) => Object.keys(r).forEach((k) => !k.endsWith('__v') && codes.add(k)))
  console.log(`\n계획보고서에 등장하는 코드: ${[...codes].join(', ')}`)
  console.log('\n데이터로 보이는 행:')
  rows.filter((r) => Object.keys(r).length >= 3).slice(0, 6)
    .forEach((r, i) => console.log(`  [${i}] ${JSON.stringify(r)}`))
}

const phase = process.argv[2] ?? '1'
if (phase === '1') await phase1_keyAndReportCensus()
if (phase === '2') await phase2_summaryApis()
if (phase === '3') await phase3_documentParsing()
if (phase === '4') await phase4_robustness()
if (phase === '5') await phase5_tradePlan()
