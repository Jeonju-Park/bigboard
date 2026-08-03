/**
 * useData.ts — 데이터 로딩 + §7 상태 4종을 한 곳에 묶는다.
 *
 * 화면마다 로딩/에러/빈 처리를 다시 쓰면 하나씩 빠지므로 훅으로 고정한다.
 */
import { useCallback, useEffect, useState } from 'react'
import { invalidate } from './data'
import { useMarket } from './market'

export type LoadState = 'loading' | 'error' | 'ready'

/**
 * 여러 JSON 을 함께 불러온다.
 * loader 는 매 렌더 새 함수라도 되게 deps 로 재실행 시점을 제어한다.
 *
 * 시장(kr/us)은 **여기서** deps 에 넣는다. 화면마다 넣게 하면 반드시 하나는 빠지고,
 * 그 화면만 이전 시장 데이터를 계속 보여준다 — 조용해서 더 나쁜 버그다.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): {
  state: LoadState
  data: T | null
  error: Error | null
  retry: () => void
} {
  const [state, setState] = useState<LoadState>('loading')
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [nonce, setNonce] = useState(0)
  const market = useMarket()

  useEffect(() => {
    let cancelled = false
    setState('loading')
    loader()
      .then((d) => {
        if (cancelled) return
        setData(d)
        setState('ready')
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e : new Error(String(e)))
        setState('error')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, market])

  const retry = useCallback(() => {
    invalidate()
    setError(null)
    setNonce((n) => n + 1)
  }, [])

  return { state, data, error, retry }
}
