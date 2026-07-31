/**
 * useData.ts — 데이터 로딩 + §7 상태 4종을 한 곳에 묶는다.
 *
 * 화면마다 로딩/에러/빈 처리를 다시 쓰면 하나씩 빠지므로 훅으로 고정한다.
 * 개발용 상태 토글(?state=loading 등)도 여기서 처리해 각 화면이 4종을 실제로 보여줄 수 있게 한다.
 */
import { useCallback, useEffect, useState } from 'react'
import { invalidate } from './data'

export type LoadState = 'loading' | 'error' | 'ready'

/** 개발용 강제 상태 — 화면 우상단 토글이 해시 쿼리로 넘긴다 */
export type ForcedState = 'loading' | 'empty' | 'error' | null

export function useForcedState(): [ForcedState, (s: ForcedState) => void] {
  const readForced = (): ForcedState => {
    const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
    const v = q.get('state')
    return v === 'loading' || v === 'empty' || v === 'error' ? v : null
  }
  const [forced, setForcedState] = useState<ForcedState>(readForced)

  useEffect(() => {
    const onHash = () => setForcedState(readForced())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const setForced = useCallback((s: ForcedState) => {
    const [path, query] = window.location.hash.replace(/^#/, '').split('?')
    const q = new URLSearchParams(query ?? '')
    if (s) q.set('state', s)
    else q.delete('state')
    const qs = q.toString()
    window.location.hash = qs ? `${path}?${qs}` : path
    setForcedState(s)
  }, [])

  return [forced, setForced]
}

/**
 * 여러 JSON 을 함께 불러온다.
 * loader 는 매 렌더 새 함수라도 되게 deps 로 재실행 시점을 제어한다.
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
  }, [...deps, nonce])

  const retry = useCallback(() => {
    invalidate()
    setError(null)
    setNonce((n) => n + 1)
  }, [])

  return { state, data, error, retry }
}
