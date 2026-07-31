/**
 * officials.ts — 고위공직자 재산공개 자료를 persons.json 에 합친다.
 *
 * ⚠️ 크롤링하지 않는다. 공개된 자료 파일을 **유저가 내려받아 두면** 그것을 읽는다.
 *    (CLAUDE.md 규칙 5: 크롤링은 robots.txt·약관 확인 보고 후 승인제)
 *
 * ⚠️ 실명 공직자의 재산 자료다. 값을 만들어내지 않는다.
 *    - 파싱 못 한 행은 조용히 버리지 않고 스킵 목록에 남겨 보고한다
 *    - 자료에 없는 항목은 null 로 두고 화면이 숨긴다
 *    - 재산공개는 **연 1회**라 기준일(asOf)이 없으면 그 행 자체를 받지 않는다
 *
 * 입력: pipeline/data/officials.csv  (UTF-8, 헤더 포함)
 *   이름,소속기관,직위,공개연도,기준일,총재산,주식평가액
 *   홍길동,국회,국회의원,2026,2025-12-31,1234567890,234567890
 *
 * 실행: npm --prefix pipeline run officials
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Meta, OfficialAssetYear, Person } from './types.ts'

const DATA_DIR = join(import.meta.dirname, '..', '..', 'app', 'public', 'data')
const SOURCE = join(import.meta.dirname, '..', 'data', 'officials.csv')

const SOURCE_NOTE = '공직자윤리위원회 정기 재산공개 (관보)'

const skipped: string[] = []

/** 따옴표를 존중하는 최소 CSV 파서 — 기관명에 쉼표가 들어가는 경우가 있다 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ }
        else quoted = false
      } else cell += c
      continue
    }
    if (c === '"') { quoted = true; continue }
    if (c === ',') { row.push(cell); cell = ''; continue }
    if (c === '\n') {
      row.push(cell.replace(/\r$/, ''))
      if (row.some((v) => v.trim())) rows.push(row)
      row = []
      cell = ''
      continue
    }
    cell += c
  }
  row.push(cell)
  if (row.some((v) => v.trim())) rows.push(row)
  return rows
}

function num(v: string | undefined): number | null {
  if (!v) return null
  const n = Number(v.replace(/[,\s원]/g, ''))
  return Number.isFinite(n) ? n : null
}

function isoDate(v: string | undefined): string | null {
  if (!v) return null
  const d = v.trim().replace(/[./]/g, '-')
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null
}

function main() {
  if (!existsSync(SOURCE)) {
    console.log(`
공직자 재산공개 자료가 없습니다: ${SOURCE}

  이 스크립트는 크롤링하지 않습니다. 공개 자료를 직접 내려받아 두면 읽습니다.

  1) 공직자윤리위원회 정기 재산공개(관보) 또는 공공데이터포털의 재산공개 자료를 내려받습니다
  2) 아래 헤더로 CSV 를 만들어 pipeline/data/officials.csv 로 저장합니다

     이름,소속기관,직위,공개연도,기준일,총재산,주식평가액
     홍길동,국회,국회의원,2026,2025-12-31,1234567890,234567890

  · 기준일이 없는 행은 받지 않습니다 — 연 1회 자료라 '언제 시점인지'가 데이터의 일부입니다
  · 주식평가액이 자료에 없으면 비워 두세요. 0 으로 채우면 화면이 거짓을 말합니다
`)
    process.exitCode = 1
    return
  }

  const rows = parseCsv(readFileSync(SOURCE, 'utf8'))
  const [header, ...body] = rows
  console.log(`입력 ${body.length}행 · 헤더: ${header.join(' | ')}`)

  // 이름+소속으로 묶어 연도별 이력을 만든다
  const byPerson = new Map<string, { name: string; office: string; title: string; years: OfficialAssetYear[] }>()

  for (const [i, r] of body.entries()) {
    const [name, office, title, yearRaw, asOfRaw, totalRaw, stockRaw] = r.map((c) => c.trim())
    const year = num(yearRaw)
    const asOf = isoDate(asOfRaw)
    const totalAssets = num(totalRaw)

    if (!name) { skipped.push(`${i + 2}행: 이름 없음`); continue }
    if (!year) { skipped.push(`${i + 2}행(${name}): 공개연도 없음`); continue }
    // 기준일이 없으면 받지 않는다 — 연 1회 자료의 핵심이 '언제 시점인지'다
    if (!asOf) { skipped.push(`${i + 2}행(${name}): 기준일 없음`); continue }
    if (totalAssets === null) { skipped.push(`${i + 2}행(${name}): 총재산 파싱 실패`); continue }

    const key = `${office || '-'}-${name}`.replace(/\s+/g, '')
    const cur = byPerson.get(key) ?? { name, office: office || '', title: title || '', years: [] }
    cur.years.push({ year, asOf, totalAssets, stockValue: num(stockRaw) })
    byPerson.set(key, cur)
  }

  // persons.json 에 합친다 (내부자 데이터는 건드리지 않는다)
  const personsPath = join(DATA_DIR, 'persons.json')
  const persons: Person[] = JSON.parse(readFileSync(personsPath, 'utf8'))
  const insiders = persons.filter((p) => p.type !== 'official')

  const officials: Person[] = [...byPerson.entries()].map(([id, o]) => ({
    id,
    name: o.name,
    type: 'official',
    title: o.title,
    company: o.office,
    holdings: [],
    totalNetBuy12m: 0, // 공직자는 거래 시점이 공개되지 않아 순매수를 계산할 수 없다
    officialAssets: o.years.sort((a, b) => b.year - a.year),
    officialOffice: o.office,
    sourceNote: SOURCE_NOTE,
  }))

  writeFileSync(personsPath, JSON.stringify([...insiders, ...officials], null, 1) + '\n', 'utf8')

  // meta 의 기준일 갱신 — 화면이 어디서든 '언제 시점인지'를 붙일 수 있게
  const metaPath = join(DATA_DIR, 'meta.json')
  const meta: Meta = JSON.parse(readFileSync(metaPath, 'utf8'))
  const latestAsOf = officials
    .flatMap((p) => p.officialAssets ?? [])
    .map((y) => y.asOf)
    .sort()
    .at(-1) ?? null
  meta.officialsAsOf = latestAsOf
  meta.counts.persons = insiders.length + officials.length
  if (!meta.sources.includes(SOURCE_NOTE)) meta.sources.push(SOURCE_NOTE)
  writeFileSync(metaPath, JSON.stringify(meta, null, 1) + '\n', 'utf8')

  console.log(`\n공직자 ${officials.length}명 · 연도 데이터 ${officials.reduce((a, p) => a + (p.officialAssets?.length ?? 0), 0)}건`)
  console.log(`기준일: ${latestAsOf ?? '없음'}`)
  console.log(`스킵 ${skipped.length}건`)
  skipped.slice(0, 10).forEach((s) => console.log(`  · ${s}`))
  if (skipped.length > 10) console.log(`  ... 외 ${skipped.length - 10}건`)
}

main()
