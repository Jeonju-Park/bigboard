/**
 * build-tokens.mjs — src/theme/tokens.ts → src/theme/tokens.generated.css
 *
 * CLAUDE.md 절대규칙 3("색·간격·타이포는 tokens.ts만")을 구조적으로 강제하기 위한 스크립트.
 * CSS 쪽에 raw 값을 두면 tokens.ts 와 갈라지므로, CSS 변수와 .ty-* 계층 클래스를
 * 전부 tokens.ts 에서 생성한다. 이 파일이 만드는 .css 는 직접 수정하지 말 것.
 *
 * Node 24 의 네이티브 TypeScript type-stripping 을 쓰므로 빌드 의존성이 0개다.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const tokensPath = join(here, '..', 'src', 'theme', 'tokens.ts')
const outPath = join(here, '..', 'src', 'theme', 'tokens.generated.css')

const t = await import(tokensPath)

/** camelCase → kebab-case (textStyle 키를 클래스명으로) */
const kebab = (s) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)

const varLines = Object.entries(t.cssVariables)
  .map(([name, value]) => `  ${name}: ${value};`)
  .join('\n')

// §3 계층 법칙 — 크기·굵기·색을 한 클래스로 묶어 임의 조합을 차단한다.
const tyLines = Object.entries(t.textStyle)
  .map(([name, s]) => {
    const decls = [
      `font-family:${s.fontFamily}`,
      s.fontSize !== 'inherit' ? `font-size:${s.fontSize}` : null,
      `font-weight:${s.fontWeight}`,
      s.color !== 'inherit' ? `color:${s.color}` : null,
      `line-height:${s.lineHeight}`,
      s.letterSpacing !== 'normal' ? `letter-spacing:${s.letterSpacing}` : null,
      // 숫자 계열은 자릿수 정렬 필수 (§3)
      /num|emph|promote$/.test(name) ? 'font-variant-numeric:tabular-nums' : null,
    ].filter(Boolean)
    return `.ty-${kebab(name)} { ${decls.join('; ')}; }`
  })
  .join('\n')

const out = `/* 이 파일은 자동 생성됩니다 — 직접 수정하지 마세요.
   원본: src/theme/tokens.ts  ·  생성: npm run build:tokens (predev/prebuild 에 연결됨) */

:root {
${varLines}
}

/* §3 계층 법칙 L1~L5 — 크기·굵기·색을 한 클래스로 묶어 임의 조합을 차단 */
${tyLines}
`

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, out, 'utf8')
console.log(
  `build-tokens: ${Object.keys(t.cssVariables).length} CSS 변수 + ${Object.keys(t.textStyle).length} 타이포 클래스 → src/theme/tokens.generated.css`,
)
