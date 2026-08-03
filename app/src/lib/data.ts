/**
 * data.ts — 유일한 데이터 접근 경로.
 *
 * ⚠️ CLAUDE.md 절대규칙 5: 브라우저에서 외부 API 를 직접 호출하지 않는다.
 *    (CORS·API 키 노출 때문) pipeline/ 이 커밋해 둔 정적 JSON 만 읽는다.
 *    화면 코드는 fetch 를 직접 쓰지 말고 반드시 이 모듈을 거친다.
 */
import type { Disclosure, Meta, Person, Rankings, Sparklines, Stock } from './types'

/** Vite base('./')와 GitHub Pages 하위 경로를 모두 처리한다 */
function dataUrl(file: string): string {
  return new URL(`data/${file}`, new URL(import.meta.env.BASE_URL, document.baseURI)).href
}

/** 같은 파일을 화면마다 다시 받지 않도록 in-flight 프라미스를 공유한다 */
const cache = new Map<string, Promise<unknown>>()

/** 화면의 '에러' 상태(재시도 버튼)가 잡는 예외 */
export class DataError extends Error {
  readonly file: string

  // 파라미터 프로퍼티는 erasableSyntaxOnly 에서 금지되므로 명시적으로 대입한다
  constructor(file: string, cause?: unknown) {
    super(`데이터를 불러오지 못했습니다 (${file})`, { cause })
    this.name = 'DataError'
    this.file = file
  }
}

async function loadJson<T>(file: string): Promise<T> {
  const existing = cache.get(file)
  if (existing) return existing as Promise<T>

  const promise = (async () => {
    let res: Response
    try {
      res = await fetch(dataUrl(file), { cache: 'no-cache' })
    } catch (e) {
      throw new DataError(file, e)
    }
    if (!res.ok) throw new DataError(file, `HTTP ${res.status}`)
    try {
      return (await res.json()) as T
    } catch (e) {
      throw new DataError(file, e)
    }
  })()

  // 실패한 요청은 캐시에 남기지 않는다 — 재시도 버튼이 동작해야 하므로
  promise.catch(() => cache.delete(file))
  cache.set(file, promise)
  return promise
}

export const getDisclosures = () => loadJson<Disclosure[]>('disclosures.json')
export const getPersons = () => loadJson<Person[]>('persons.json')
export const getStocks = () => loadJson<Stock[]>('stocks.json')
export const getRankings = () => loadJson<Rankings>('rankings.json')
/**
 * 스파크라인은 무겁다(gzip 155KB). 종목·피드 상세에서만 부른다 —
 * 탐색·검색·마이가 이 무게를 지불하지 않도록 stocks.json 에서 분리했다.
 */
export const getSparklines = () => loadJson<Sparklines>('sparklines.json')
export const getMeta = () => loadJson<Meta>('meta.json')

/** 재시도 화면에서 호출 — 캐시를 비워 다음 요청이 실제로 나가게 한다 */
export function invalidate(file?: string): void {
  if (file) cache.delete(file)
  else cache.clear()
}
