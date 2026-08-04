/**
 * officials.ts — 고위공직자 재산공개 자료를 persons.json 에 합친다.
 *
 * ⚠️ 크롤링하지 않는다. **유저가 내려받아 둔 파일**을 읽는다.
 *    (CLAUDE.md 규칙 5: 크롤링은 robots.txt·약관 확인 보고 후 승인제)
 *
 * ⚠️ 실명 공직자의 재산 자료다. 값을 만들어내지 않는다.
 *    - 파싱 못 한 행은 조용히 버리지 않고 사유별로 집계해 보고한다
 *    - 재산공개는 **연 1회**라 기준일이 없으면 그 행을 받지 않는다
 *      ('언제 시점인지'가 이 데이터의 절반이다)
 *
 * 입력: pipeline/data/ 안의 **아무 .xlsx 또는 .csv** 파일
 *   공직윤리시스템(peti.go.kr) 재산공개에서 받은 파일을 그대로 넣으면 된다.
 *   변환을 요구하지 않는 이유: 그 과정에서 인코딩이 깨지거나 열이 밀리는 일이 잦다.
 *
 * 실행: npm --prefix pipeline run officials
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readSheet } from './sheet.ts'
import type { Meta, OfficialAssetYear, Person } from './types.ts'

const DATA_DIR = join(import.meta.dirname, '..', '..', 'app', 'public', 'data', 'kr')
const SOURCE_DIR = join(import.meta.dirname, '..', 'data')
const SOURCE_NOTE = '공직자윤리위원회 정기 재산공개'

const skipped: Record<string, number> = {}
const skip = (reason: string) => { skipped[reason] = (skipped[reason] ?? 0) + 1 }

// ── 컬럼 찾기 ────────────────────────────────────────────────────────────────

/**
 * 기관마다 열 이름이 다르다(이름/성명, 소속/기관명, 총재산/재산총액...).
 * 헤더 행을 훑어 뜻이 맞는 열을 찾는다. 못 찾으면 그 사실을 그대로 보고한다.
 */
const COLUMN_PATTERNS = {
  name: [/^성\s*명$/, /^이\s*름$/, /성명/, /이름/],
  office: [/^소속$/, /소속\s*기관/, /^기관$/, /기관명/, /부처/],
  title: [/^직위$/, /직위/, /직급/, /직책/],
  year: [/공개\s*연?도/, /^연도$/, /^년도$/],
  asOf: [/기준\s*일/, /^기준일자$/, /신고\s*기준/],
  total: [/재산\s*총액/, /총\s*재산/, /^총액$/, /합\s*계/],
  stock: [/증권/, /주식/],
} as const

type Field = keyof typeof COLUMN_PATTERNS

function findHeader(rows: string[][]): { headerRow: number; cols: Partial<Record<Field, number>> } | null {
  // 헤더가 첫 줄이 아닐 수 있다(제목·안내문이 위에 붙는다). 앞쪽 몇 줄을 훑는다
  for (let r = 0; r < Math.min(rows.length, 12); r++) {
    const cells = rows[r].map((c) => c.replace(/\s+/g, ' ').trim())
    const cols: Partial<Record<Field, number>> = {}
    for (const [field, patterns] of Object.entries(COLUMN_PATTERNS) as [Field, readonly RegExp[]][]) {
      const idx = cells.findIndex((c) => c && patterns.some((p) => p.test(c)))
      if (idx >= 0) cols[field] = idx
    }
    // 이름과 총액이 둘 다 있어야 헤더로 인정한다
    if (cols.name !== undefined && cols.total !== undefined) return { headerRow: r, cols }
  }
  return null
}

// ── 값 파싱 ──────────────────────────────────────────────────────────────────

function num(v: string | undefined): number | null {
  if (!v) return null
  const cleaned = v.replace(/[,\s원]/g, '').replace(/△|▲/g, '-')
  if (!cleaned || cleaned === '-') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** 'YYYY-MM-DD' / 'YYYY.MM.DD' / 'YYYYMMDD' / 엑셀 일련번호 → ISO */
function isoDate(v: string | undefined): string | null {
  if (!v) return null
  const t = v.trim()

  // 엑셀이 날짜를 1900-01-01 기준 일련번호로 저장하는 경우
  if (/^\d{5}$/.test(t)) {
    const base = Date.UTC(1899, 11, 30)
    const d = new Date(base + Number(t) * 86400000)
    return d.toISOString().slice(0, 10)
  }
  const digits = t.replace(/\D/g, '')
  if (digits.length === 8) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
  const m = /^(\d{4})[-./]\s*(\d{1,2})[-./]\s*(\d{1,2})/.exec(t)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  return null
}

/**
 * 재산 자료는 **천원 단위**로 배포되는 경우가 많다.
 * 단위를 잘못 읽으면 1,000배 틀린 금액이 실명과 함께 화면에 뜬다 — 그냥 넘길 수 없는 오류다.
 * 그래서 추측하지 않고, 헤더에 단위 표기가 있으면 그걸 쓰고 없으면 값의 크기로 판단해 **보고**한다.
 */
function detectUnit(rows: string[][], headerRow: number, totalCol: number): { multiplier: number; reason: string } {
  const headerText = rows.slice(0, headerRow + 1).flat().join(' ')
  if (/단위\s*[:：]?\s*천\s*원/.test(headerText)) return { multiplier: 1000, reason: '헤더에 "단위: 천원" 표기' }
  if (/단위\s*[:：]?\s*원/.test(headerText)) return { multiplier: 1, reason: '헤더에 "단위: 원" 표기' }

  // 표기가 없으면 중앙값으로 판단한다. 고위공직자 재산은 통상 수억~수십억 원이다.
  const values = rows.slice(headerRow + 1).map((r) => num(r[totalCol])).filter((v): v is number => v !== null && v > 0)
  if (!values.length) return { multiplier: 1, reason: '값이 없어 원 단위로 가정' }
  values.sort((a, b) => a - b)
  const median = values[Math.floor(values.length / 2)]
  // 중앙값이 1억 미만이면 천원 단위일 가능성이 높다 (1억 = 100,000 천원)
  return median < 100_000_000
    ? { multiplier: 1000, reason: `단위 표기 없음 · 중앙값 ${median.toLocaleString()} → 천원 단위로 판단` }
    : { multiplier: 1, reason: `단위 표기 없음 · 중앙값 ${median.toLocaleString()} → 원 단위로 판단` }
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

function findSourceFile(): string | null {
  if (!existsSync(SOURCE_DIR)) return null
  const files = readdirSync(SOURCE_DIR).filter((f) => /\.(xlsx|csv)$/i.test(f) && !f.startsWith('~$'))
  return files.length ? join(SOURCE_DIR, files[0]) : null
}

function usage() {
  console.log(`
공직자 재산공개 자료가 없습니다.

  이 스크립트는 크롤링하지 않습니다. 받아 둔 파일을 읽습니다.

  1) 공직윤리시스템 재산공개에서 자료를 내려받습니다
     https://www.peti.go.kr/prptOptp.do
  2) 받은 파일(.xlsx 또는 .csv)을 **그대로** 아래 폴더에 넣습니다
     ${SOURCE_DIR}
  3) 다시 실행합니다:  npm --prefix pipeline run officials

  · 엑셀 파일을 CSV 로 바꾸지 않아도 됩니다 (변환하면서 깨지는 일이 잦습니다)
  · 열 이름은 '성명/이름', '소속/기관', '재산총액/총재산' 등 흔한 표기를 자동으로 찾습니다
  · 기준일이 없는 행은 받지 않습니다 — 연 1회 자료라 '언제 시점인지'가 데이터의 일부입니다
`)
}

function main() {
  const source = findSourceFile()
  if (!source) {
    usage()
    process.exitCode = 1
    return
  }

  const { rows, format, encoding } = readSheet(source)
  console.log(`\n입력: ${source.split('/').pop()} (${format}, ${encoding}) · ${rows.length}행`)

  const found = findHeader(rows)
  if (!found) {
    console.log(`
헤더를 찾지 못했습니다. '성명'(또는 '이름')과 '재산총액'(또는 '총재산') 열이 필요합니다.

파일의 첫 5행은 이렇습니다:`)
    rows.slice(0, 5).forEach((r, i) => console.log(`  [${i}] ${r.slice(0, 12).join(' | ')}`))
    console.log(`\n열 이름을 알려주시면 인식 규칙에 추가하겠습니다.`)
    process.exitCode = 1
    return
  }

  const { headerRow, cols } = found
  const header = rows[headerRow]
  console.log(`헤더 ${headerRow}행에서 인식한 열:`)
  for (const f of Object.keys(COLUMN_PATTERNS) as Field[]) {
    const i = cols[f]
    console.log(`  ${f.padEnd(7)} ${i === undefined ? '(못 찾음)' : `${i}번 "${header[i]}"`}`)
  }

  const unit = detectUnit(rows, headerRow, cols.total!)
  console.log(`\n금액 단위: x${unit.multiplier.toLocaleString()} (${unit.reason})`)

  // 파일 전체에 공통으로 적용할 연도·기준일 (열이 없을 때)

  const byPerson = new Map<string, { name: string; office: string; title: string; years: OfficialAssetYear[] }>()

  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r]
    const get = (f: Field) => (cols[f] === undefined ? undefined : row[cols[f]!]?.trim())

    const name = get('name')
    if (!name || /합\s*계|소\s*계/.test(name)) { skip('이름 없음/합계행'); continue }

    const totalRaw = num(get('total'))
    if (totalRaw === null) { skip('재산총액 파싱 실패'); continue }

    const asOf = isoDate(get('asOf'))
    if (!asOf) { skip('기준일 없음 (연 1회 자료라 기준일이 없으면 받지 않는다)'); continue }

    // 공개연도: 자료에 적혀 있으면 그것, 없으면 기준일 다음 해(재산은 전년 12/31 기준으로 이듬해 공개된다).
    // 예전엔 뒤에 파일명 연도를 ?? 로 더 붙였는데, 앞 식이 절대 null 이 될 수 없어 죽은 코드였다.
    const year = num(get('year')) ?? Number(asOf.slice(0, 4)) + 1
    if (!Number.isFinite(year)) { skip('공개연도 없음'); continue }

    const office = get('office') ?? ''
    const key = `${office || '-'}-${name}`.replace(/\s+/g, '')
    const cur = byPerson.get(key) ?? { name, office, title: get('title') ?? '', years: [] }
    cur.years.push({
      year,
      asOf,
      totalAssets: totalRaw * unit.multiplier,
      stockValue: (() => { const v = num(get('stock')); return v === null ? null : v * unit.multiplier })(),
      // 표 자료에는 종목별 내역이 없다 (관보 PDF 에만 있다). 0 이 사실이다
      holdingCount: 0,
      notice: `${source.split('/').pop() ?? source} (표 자료)`,
    })
    byPerson.set(key, cur)
  }

  if (!byPerson.size) {
    console.log(`\n받을 수 있는 행이 없습니다. 스킵 사유:`)
    Object.entries(skipped).forEach(([k, v]) => console.log(`  ${String(v).padStart(5)}  ${k}`))
    process.exitCode = 1
    return
  }

  // persons.json 병합 — 내부자 데이터는 건드리지 않는다
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
    // 공직자는 거래 시점이 공개되지 않아 순매수를 계산할 수 없다 (연 1회 잔액 스냅샷뿐)
    totalNetBuy12m: 0,
    officialAssets: o.years.sort((a, b) => b.year - a.year),
    officialOffice: o.office,
    sourceNote: SOURCE_NOTE,
  }))

  writeFileSync(personsPath, JSON.stringify([...insiders, ...officials], null, 1) + '\n', 'utf8')

  // meta 의 기준일 — 화면이 어디서든 '언제 시점인지'를 붙일 수 있게
  const metaPath = join(DATA_DIR, 'meta.json')
  const meta: Meta = JSON.parse(readFileSync(metaPath, 'utf8'))
  const latestAsOf = officials.flatMap((p) => p.officialAssets ?? []).map((y) => y.asOf).sort().at(-1) ?? null
  meta.officialsAsOf = latestAsOf
  meta.counts.persons = insiders.length + officials.length
  if (!meta.sources.includes(SOURCE_NOTE)) meta.sources.push(SOURCE_NOTE)
  writeFileSync(metaPath, JSON.stringify(meta, null, 1) + '\n', 'utf8')

  const yearCount = officials.reduce((a, p) => a + (p.officialAssets?.length ?? 0), 0)
  console.log(`\n─── 결과 ───`)
  console.log(`공직자      ${officials.length}명 · 연도 데이터 ${yearCount}건`)
  console.log(`기준일      ${latestAsOf ?? '없음'}`)
  console.log(`스킵        ${Object.values(skipped).reduce((a, b) => a + b, 0)}건`)
  Object.entries(skipped).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${String(v).padStart(5)}  ${k}`))

  const sample = officials[0]
  console.log(`\n샘플 1명 (금액이 상식적인지 눈으로 확인해 주세요):`)
  console.log(`  ${sample.name} · ${sample.company} · ${sample.title}`)
  sample.officialAssets?.forEach((y) =>
    console.log(`   ${y.year}년 (${y.asOf} 기준) 총재산 ${(y.totalAssets / 1e8).toFixed(1)}억` +
      (y.stockValue !== null ? ` · 주식 ${(y.stockValue / 1e8).toFixed(1)}억` : '')),
  )
  console.log(`\n금액이 1,000배 어긋나 보이면 단위 판정이 틀린 것입니다 — 알려주시면 고치겠습니다.`)
}

main()
