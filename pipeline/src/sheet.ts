/**
 * sheet.ts — CSV·XLSX 를 행 배열로 읽는다. 외부 패키지 없음.
 *
 * 공공기관에서 내려받는 파일은 대개 xlsx 이거나 EUC-KR CSV 다.
 * "CSV 로 변환해서 넣으세요"라고 요구하면 그 변환 과정에서 인코딩이 깨지거나
 * 열이 밀리는 일이 잦다. 받은 파일을 그대로 읽는 편이 안전하다.
 *
 * xlsx 는 사실 ZIP + XML 이라 이미 갖고 있는 unzip 으로 열 수 있다.
 */
import { readFileSync } from 'node:fs'
import { unzip } from './dart.ts'

/** 따옴표를 존중하는 CSV 파서 — 기관명에 쉼표가 들어간다 */
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
      row = []; cell = ''
      continue
    }
    cell += c
  }
  row.push(cell)
  if (row.some((v) => v.trim())) rows.push(row)
  return rows
}

/** 'A1' → 열 인덱스(0-based). 빈 셀이 생략돼 오므로 위치를 좌표에서 읽어야 한다 */
function colIndex(ref: string): number {
  const letters = /^([A-Z]+)/.exec(ref)?.[1] ?? 'A'
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, '&')
}

/** xlsx 첫 시트를 행 배열로 */
function parseXlsx(buf: Buffer): string[][] {
  const files = unzip(buf)
  const read = (name: string) => files.find((f) => f.name === name)?.data.toString('utf8') ?? ''

  // 공유 문자열 테이블 — 셀 값이 t="s" 면 여기 인덱스를 가리킨다
  const sharedXml = read('xl/sharedStrings.xml')
  const shared: string[] = []
  for (const m of sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    // <si> 안에 <t> 가 여러 개로 쪼개져 있을 수 있다 (서식이 섞인 셀)
    const text = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')
    shared.push(decodeXmlEntities(text))
  }

  // 첫 워크시트
  const sheetName =
    files.map((f) => f.name).find((n) => /^xl\/worksheets\/sheet1\.xml$/.test(n)) ??
    files.map((f) => f.name).find((n) => /^xl\/worksheets\/.+\.xml$/.test(n))
  if (!sheetName) throw new Error('xlsx 안에서 워크시트를 찾지 못했습니다')
  const sheetXml = read(sheetName)

  const rows: string[][] = []
  for (const rowM of sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = []
    for (const cM of rowM[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cM[1]
      const idx = colIndex(/r="([A-Z]+\d+)"/.exec(attrs)?.[1] ?? 'A1')
      const type = /t="([^"]+)"/.exec(attrs)?.[1]
      const vRaw = /<v>([\s\S]*?)<\/v>/.exec(cM[2])?.[1] ?? ''
      const inline = /<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/.exec(cM[2])?.[1]

      let value: string
      if (type === 's') value = shared[Number(vRaw)] ?? ''
      else if (type === 'inlineStr') value = decodeXmlEntities(inline ?? '')
      else value = decodeXmlEntities(vRaw)

      while (cells.length < idx) cells.push('')
      cells[idx] = value
    }
    if (cells.some((c) => c.trim())) rows.push(cells)
  }
  return rows
}

/**
 * 파일을 행 배열로 읽는다. 확장자와 시그니처로 형식을 판별한다.
 * CSV 는 UTF-8 을 먼저 시도하고, 한글이 깨지면 EUC-KR 로 다시 읽는다
 * (공공기관 CSV 는 EUC-KR 이 흔하다).
 */
export function readSheet(path: string): { rows: string[][]; format: string; encoding: string } {
  const buf = readFileSync(path)

  // xlsx 는 ZIP 이라 'PK' 로 시작한다
  if (buf.subarray(0, 2).toString() === 'PK') {
    return { rows: parseXlsx(buf), format: 'xlsx', encoding: 'utf-8' }
  }

  // BOM 제거
  const body = buf.subarray(0, 3).toString('hex') === 'efbbbf' ? buf.subarray(3) : buf

  let text = new TextDecoder('utf-8', { fatal: false }).decode(body)
  let encoding = 'utf-8'
  // U+FFFD 가 섞였으면 UTF-8 이 아니다 → EUC-KR 로 다시
  if (text.includes('�')) {
    text = new TextDecoder('euc-kr').decode(body)
    encoding = 'euc-kr'
  }
  return { rows: parseCsv(text), format: 'csv', encoding }
}
