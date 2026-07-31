#!/usr/bin/env node
/**
 * check-schema.mjs — app 과 pipeline 의 types.ts 가 어긋나지 않았는지 검사한다.
 *
 * 두 패키지는 의존성을 일부러 분리해서 타입을 import 로 공유하지 못한다.
 * "둘을 같이 고쳐라"를 주석으로만 적어두면 실제로 어긋난다 —
 * totalAmount 가 한쪽은 number, 한쪽은 number|null 이었던 적이 있고
 * 타입체커는 각 패키지 안에서만 보므로 잡아주지 못했다.
 *
 * 완전한 파서를 만들지 않고, 공유 인터페이스의 **필드명 → 타입 문자열**만 뽑아 비교한다.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

/** 두 파일이 공유해야 하는 인터페이스 */
const SHARED = ['Disclosure', 'TradeDetail', 'Person', 'PersonHolding', 'Stock', 'Sparkline', 'RankingEntry', 'Meta']

/** 공백·구분자 차이를 지워 타입을 비교 가능한 형태로 만든다 */
function normalizeType(t) {
  return t.replace(/[;,]/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * 최상위 필드만 뽑는다. 중첩 객체(`counts: { a: number }`)가 여러 줄에 걸쳐 있어도
 * 한 필드로 보도록 중괄호 깊이를 추적한다 — 줄 단위로 자르면 중첩 필드가
 * 최상위 필드처럼 잡혀 오탐이 난다.
 */
function parseFields(body) {
  const fields = new Map()
  let depth = 0
  let buf = ''
  const flush = () => {
    const text = buf.trim().replace(/[;,]$/, '')
    buf = ''
    if (!text) return
    const m = /^(\w+)(\??)\s*:\s*([\s\S]+)$/.exec(text)
    // 중첩 객체 안의 구분자는 파일마다 다르다(줄바꿈 vs 세미콜론). 비교 전에 통일한다.
    if (m) fields.set(m[1], `${m[2]}${normalizeType(m[3])}`)
  }
  for (const ch of body) {
    if (ch === '{') depth++
    if (ch === '}') depth--
    // 깊이 0 에서만 필드 경계로 인정한다
    if (depth === 0 && (ch === '\n' || ch === ';')) { flush(); continue }
    buf += ch
  }
  flush()
  return fields
}

/** interface 본문에서 `이름: 타입` 만 뽑는다. 주석·빈 줄은 버린다 */
function parseInterfaces(src) {
  const out = new Map()
  const withoutComments = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')

  for (const m of withoutComments.matchAll(/export interface (\w+)\s*\{([\s\S]*?)\n\}/g)) {
    const [, name, body] = m
    out.set(name, parseFields(body))
  }
  return out
}

const appTypes = parseInterfaces(readFileSync(join(ROOT, 'app/src/lib/types.ts'), 'utf8'))
const pipeTypes = parseInterfaces(readFileSync(join(ROOT, 'pipeline/src/types.ts'), 'utf8'))

const problems = []

for (const name of SHARED) {
  const a = appTypes.get(name)
  const p = pipeTypes.get(name)
  if (!a) { problems.push(`app/src/lib/types.ts 에 ${name} 인터페이스가 없습니다`); continue }
  if (!p) { problems.push(`pipeline/src/types.ts 에 ${name} 인터페이스가 없습니다`); continue }

  for (const [field, type] of a) {
    if (!p.has(field)) problems.push(`${name}.${field} — app 에만 있음`)
    else if (p.get(field) !== type) {
      problems.push(`${name}.${field} — 타입 불일치: app "${type}" vs pipeline "${p.get(field)}"`)
    }
  }
  for (const field of p.keys()) {
    if (!a.has(field)) problems.push(`${name}.${field} — pipeline 에만 있음`)
  }
}

if (problems.length) {
  console.log(`\n✗ 스키마 불일치 ${problems.length}건 — 화면이 조용히 깨질 수 있습니다\n`)
  problems.forEach((p) => console.log(`  · ${p}`))
  console.log(`\n  app/src/lib/types.ts 와 pipeline/src/types.ts 를 함께 고치세요.\n`)
  process.exit(1)
}

console.log(`✓ 스키마 일치 (공유 인터페이스 ${SHARED.length}개)`)
