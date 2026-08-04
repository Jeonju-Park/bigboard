/**
 * data.ts — 유일한 데이터 접근 경로.
 *
 * ⚠️ CLAUDE.md 절대규칙 5: 브라우저에서 외부 API 를 직접 호출하지 않는다.
 *    (CORS·API 키 노출 때문) pipeline/ 이 커밋해 둔 정적 JSON 만 읽는다.
 *    화면 코드는 fetch 를 직접 쓰지 말고 반드시 이 모듈을 거친다.
 */
import { getMarket, onMarketChange } from './market'
import type {
  Disclosure,
  GazetteNotice,
  Institution,
  Meta,
  OfficialHoldings,
  Person,
  Rankings,
  Sparklines,
  Stock,
} from './types'

/** Vite base('./')와 GitHub Pages 하위 경로를 모두 처리한다 */
function dataUrl(file: string): string {
  // 시장별로 디렉터리가 갈린다 — data/kr/*.json, data/us/*.json
  return new URL(`data/${getMarket()}/${file}`, new URL(import.meta.env.BASE_URL, document.baseURI))
    .href
}

/**
 * 같은 파일을 화면마다 다시 받지 않도록 in-flight 프라미스를 공유한다.
 * 키에 시장을 넣는다 — 안 넣으면 국장에서 받은 disclosures.json 이
 * 미장으로 바꾼 뒤에도 그대로 나온다.
 */
const cache = new Map<string, Promise<unknown>>()

function cacheKey(file: string): string {
  return `${getMarket()}/${file}`
}

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
  const key = cacheKey(file)
  const existing = cache.get(key)
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
  promise.catch(() => cache.delete(key))
  cache.set(key, promise)
  return promise
}

export const getDisclosures = () => loadJson<Disclosure[]>('disclosures.json')
/** 내부자·의원·기관. **공직자는 여기 없다** — officials.json 으로 분리했다 */
export const getPersons = () => loadJson<Person[]>('persons.json')
/**
 * 공직자 목록 (국장 전용). 보유 종목 **내역은 빠져 있다** — 시점별 내역을 다 합치면
 * 2.3MB 라, 목록만 보는 홈·랭킹·탐색이 그 무게를 지불할 이유가 없다.
 * 종목 내역이 필요하면 getOfficialHoldings() 를 따로 부른다 (스파크라인과 같은 구조).
 */
export const getOfficials = () => loadJson<Person[]>('officials.json')
/** 공직자별·시점별 보유 종목. 인물 상세와 종목 상세에서만 부른다 */
export const getOfficialHoldings = () => loadJson<OfficialHoldings>('officials-holdings.json')
export const getStocks = () => loadJson<Stock[]>('stocks.json')
export const getRankings = () => loadJson<Rankings>('rankings.json')
/**
 * 스파크라인은 무겁다(gzip 155KB). 종목·피드 상세에서만 부른다 —
 * 탐색·검색·마이가 이 무게를 지불하지 않도록 stocks.json 에서 분리했다.
 */
export const getSparklines = () => loadJson<Sparklines>('sparklines.json')
/**
 * 재산공개 관보 색인. **금액이 아니라 문서 목록**이다 —
 * API 가 개인별 금액을 주지 않아 '언제 어떤 공개가 있었고 원문은 여기'까지만 담는다.
 */
export const getGazette = () => loadJson<GazetteNotice[]>('gazette.json')
/**
 * 미장 전용 — 13F 를 낸 기관의 분기 보유 현황.
 * 국장에는 대응물이 없어 파일이 없다. 호출부는 `.catch(() => [])` 로 감싼다.
 */
export const getInstitutions = () => loadJson<Institution[]>('institutions.json')
export const getMeta = () => loadJson<Meta>('meta.json')

/** 재시도 화면에서 호출 — 캐시를 비워 다음 요청이 실제로 나가게 한다 */
export function invalidate(file?: string): void {
  if (file) cache.delete(cacheKey(file))
  else cache.clear()
}

/**
 * 시장이 바뀌면 캐시를 통째로 버린다.
 * 키에 시장이 들어 있어 섞이지는 않지만, 안 쓰는 시장의 데이터를 메모리에 들고 있을 이유가 없다.
 * 모듈 최상위에서 등록해 **화면이 다시 그려지기 전에** 실행되게 한다.
 */
onMarketChange(() => cache.clear())
