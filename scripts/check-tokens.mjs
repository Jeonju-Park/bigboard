#!/usr/bin/env node
/**
 * check-tokens.mjs — CLAUDE.md 절대규칙 자동 검사 (의존성 0개)
 *
 * STEP 5 통합 QA 항목 2번을 매 스텝 돌릴 수 있게 앞당긴 것이다.
 *
 *   1. raw hex 색상        — tokens.ts 외부에 #RRGGBB 가 있으면 위반 (규칙 3)
 *   2. 하드코딩 px          — tokens.ts 외부의 px. 0/1px 등 구조 단위는 허용목록 처리 (규칙 3)
 *   3. 이모지               — 전면 금지, 아이콘은 Material Symbols (규칙 4)
 *   4. 금지 워딩            — "매수하세요" "시그널" 등 (규칙 1). "추천"은 경고로만 — 문맥 판단 필요
 *   5. API 키 유출          — 추적되는 파일에 키 값이 들어갔는지 (규칙 5)
 *
 * 사용: npm run check:tokens
 * 예외: 정당한 사용에는 같은 줄에 `check-tokens-ignore` 주석을 단다.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

// fileURLToPath 필수 — .pathname 을 쓰면 경로의 공백이 %20 으로 남아 조용히 아무것도 못 읽는다
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const SCAN_DIRS = ['app/src', 'pipeline/src']
const SCAN_FILES = ['app/index.html']
const EXTS = new Set(['.ts', '.tsx', '.css', '.html'])

// 값의 정의처이므로 raw 값이 있는 게 정상인 파일들
const VALUE_SOURCE_FILES = ['app/src/theme/tokens.ts', 'app/src/theme/tokens.generated.css']

const findings = { error: [], warn: [] }

function walk(dir) {
  const out = []
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const e of entries) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (EXTS.has(extname(p))) out.push(p)
  }
  return out
}

function add(level, rule, file, line, text, note) {
  findings[level].push({ rule, file, line, text: text.trim().slice(0, 120), note })
}

const RAW_HEX = /#[0-9a-fA-F]{3,8}\b/g
const PX = /(?<![\w-])(-?\d*\.?\d+)px/g
const EMOJI = /\p{Extended_Pictographic}/u
// 규칙 1 — 투자 권유로 읽히는 표현. 하드 실패
const BANNED = [/매수하세요/, /매도하세요/, /사세요/, /파세요/, /시그널/, /추천\s*종목/, /추천드립/, /지금\s*사야/]
// 문맥에 따라 정당할 수 있는 표현(예: "팔로우 추천"). 사람이 확인하도록 경고만
const REVIEW = [/추천/]

// px 허용목록: 구조적으로 토큰이 될 수 없는 값들 (헤어라인·클립 트릭 등)
const PX_ALLOW = new Set(['0px', '1px', '-1px', '2px'])

/**
 * 주석을 공백으로 치환한다 — 줄 번호는 유지.
 * 주석은 UI 가 아니므로 색·치수·이모지 규칙 대상이 아니다. 설계 근거를 주석에
 * 적는 것을 막으면 안 되기 때문이다. 블록 주석의 '연속 줄'까지 지우려면
 * 줄 단위 정규식으로는 부족해서 파일 전체를 한 번에 처리한다.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length))
}

const targets = [...SCAN_DIRS.flatMap((d) => walk(join(ROOT, d))), ...SCAN_FILES.map((f) => join(ROOT, f))]

// 스캔 대상이 0건이면 "통과"가 아니라 검사기가 고장난 것이다.
// (실제로 경로에 공백이 있을 때 조용히 0건이 되는 버그를 한 번 겪었다)
if (targets.length === 0) {
  console.error(`✗ 검사할 파일이 없습니다. ROOT 해석 실패로 보입니다: ${ROOT}`)
  process.exit(2)
}

{
  for (const abs of targets) {
    const file = relative(ROOT, abs)
    const isValueSource = VALUE_SOURCE_FILES.includes(file)
    const source = readFileSync(abs, 'utf8')
    const rawLines = source.split('\n')
    // 주석을 지운 사본으로 검사하고, 보고에는 원본 줄을 보여준다
    const lines = stripComments(source).split('\n')

    lines.forEach((code, i) => {
      const ln = i + 1
      const raw = rawLines[i] ?? ''
      if (raw.includes('check-tokens-ignore')) return

      if (!isValueSource) {
        for (const m of code.matchAll(RAW_HEX)) {
          add('error', 'raw-hex', file, ln, raw, `${m[0]} → tokens.ts 의 CSS 변수를 쓰세요`)
        }
        for (const m of code.matchAll(PX)) {
          if (!PX_ALLOW.has(m[0])) {
            add('error', 'hardcoded-px', file, ln, raw, `${m[0]} → var(--space-*) 등을 쓰세요`)
          }
        }
      }

      // 이모지 금지(§6)는 **화면 UI** 규칙이다. pipeline 은 터미널로만 말하는 Node 스크립트라
      // 로그의 ⚠ 같은 기호까지 막을 이유가 없다. 규칙 적용을 app/src 로 한정한다.
      if (file.startsWith('app/') && EMOJI.test(code)) {
        add('error', 'emoji', file, ln, raw, '이모지 금지 — Material Symbols(.msr)을 쓰세요')
      }
      for (const re of BANNED) {
        if (re.test(code)) add('error', 'banned-copy', file, ln, raw, `금지 워딩: ${re.source}`)
      }
      for (const re of REVIEW) {
        if (re.test(code) && !BANNED.some((b) => b.test(code))) {
          add('warn', 'review-copy', file, ln, raw, '"추천" — 투자 추천으로 읽히지 않는지 확인')
        }
      }
    })
  }
}

// 5. API 키 유출 — 추적 중인 파일에 .env 가 섞였는지, 키 변수에 값이 박혔는지
try {
  const tracked = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }).split('\n')
  for (const f of tracked) {
    if (/(^|\/)\.env$/.test(f) || /(^|\/)\.env\.(?!example)/.test(f)) {
      add('error', 'secret-file', f, 0, f, '.env 가 git 에 추적되고 있습니다 — 즉시 제거')
    }
  }
  const leak = execSync(
    `git grep -nE "(DART_KEY|DATA_GO_KR_KEY|serviceKey|crtfc_key)\\s*[:=]\\s*['\\"]?[A-Za-z0-9%+/=]{16,}" -- . ':!*.example' ':!scripts/check-tokens.mjs' || true`,
    { cwd: ROOT, encoding: 'utf8' },
  ).trim()
  if (leak) {
    for (const l of leak.split('\n')) {
      const [f, ln] = l.split(':')
      add('error', 'secret-value', f, Number(ln) || 0, l, 'API 키로 보이는 값이 코드에 있습니다')
    }
  }
} catch {
  // git 저장소가 아니면 이 검사는 건너뛴다
}

function report(level, label) {
  const items = findings[level]
  if (!items.length) return
  console.log(`\n${label} (${items.length})`)
  for (const f of items) {
    console.log(`  ${f.file}:${f.line}  [${f.rule}] ${f.note}`)
    console.log(`      ${f.text}`)
  }
}

report('warn', '⚠ 확인 필요')
report('error', '✗ 위반')

if (findings.error.length) {
  console.log(`\n검사 실패 — 위반 ${findings.error.length}건. CLAUDE.md 절대규칙을 확인하세요.\n`)
  process.exit(1)
}
console.log(
  `\n✓ 토큰·카피 검사 통과 (위반 0건${findings.warn.length ? `, 확인 필요 ${findings.warn.length}건` : ''})\n`,
)
