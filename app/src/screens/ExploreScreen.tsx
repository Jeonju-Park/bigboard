import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import Screen from '@/shared/components/Screen'
import DevStateToggle from '@/shared/components/DevStateToggle'
import { FilterChips } from '@/shared/components/Controls'
import { FollowChip, PersonRow } from '@/shared/components/Rows'
import { Num } from '@/shared/components/Num'
import {
  Disclaimer,
  EmptyState,
  ErrorState,
  FreshnessLabel,
  LoadingState,
  SectionHeader,
} from '@/shared/components/Feedback'
import Icon from '@/shared/components/Icon'
import { getMeta, getPersons, getStocks } from '@/lib/data'
import { useAsync, useForcedState } from '@/lib/useData'
import { toggleFollowPerson, useFollowedPersons, useRecent } from '@/lib/follow'
import { formatAmountShort } from '@/lib/format'
import homeStyles from './HomeScreen.module.css'
import styles from './ExploreScreen.module.css'

const TYPES = [
  { value: 'all', label: '전체' },
  { value: 'insider', label: '내부자' },
  { value: 'official', label: '공직자' },
] as const
type TypeFilter = (typeof TYPES)[number]['value']

/** S5 탐색 — 통합검색(클라이언트 필터) + 인기 큰손 + 최근 본 항목 */
export default function ExploreScreen() {
  const [forced, setForced] = useForcedState()
  const [q, setQ] = useState('')
  const [type, setType] = useState<TypeFilter>('all')

  const followed = useFollowedPersons()
  const recent = useRecent()

  const { state, data, error, retry } = useAsync(async () => {
    const [persons, stocks, meta] = await Promise.all([getPersons(), getStocks(), getMeta()])
    return { persons, stocks, meta }
  })

  const query = q.trim()

  const results = useMemo(() => {
    if (!data || !query) return null
    const lower = query.toLowerCase()
    return {
      persons: data.persons.filter((p) => p.name.includes(query) || p.company.includes(query)).slice(0, 20),
      stocks: data.stocks
        .filter((s) => s.name.includes(query) || s.code.toLowerCase().includes(lower))
        .slice(0, 20),
    }
  }, [data, query])

  // 인기 큰손 = 12개월 순매수 절댓값 상위. 파생 집계이므로 기준을 표기한다
  const popular = useMemo(() => {
    if (!data) return []
    return data.persons
      .filter((p) => (type === 'all' ? true : p.type === type))
      .filter((p) => p.totalNetBuy12m !== 0)
      .sort((a, b) => Math.abs(b.totalNetBuy12m) - Math.abs(a.totalNetBuy12m))
      .slice(0, 20)
  }, [data, type])

  const effectiveState = forced === 'loading' ? 'loading' : forced === 'error' ? 'error' : state
  const noResults = query && results && results.persons.length === 0 && results.stocks.length === 0
  const isEmpty = forced === 'empty' || (effectiveState === 'ready' && !query && popular.length === 0)

  return (
    <Screen title="탐색" actions={<DevStateToggle value={forced} onChange={setForced} />}>
      <label className={styles.search}>
        <Icon name="search" size="sm" />
        <input
          className={`ty-body ${styles.input}`}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="종목명, 종목코드, 인물 이름"
          aria-label="종목·인물 검색"
        />
      </label>

      {effectiveState === 'loading' && <LoadingState rows={3} />}
      {effectiveState === 'error' && <ErrorState message={error?.message} onRetry={retry} />}

      {effectiveState === 'ready' && query && (
        <>
          {noResults ? (
            <EmptyState
              icon="search_off"
              title={`'${query}' 검색 결과가 없습니다`}
              micro="최근 30일 공시에 등장한 이름만 찾을 수 있습니다"
            />
          ) : (
            <>
              {results!.stocks.length > 0 && (
                <section>
                  <SectionHeader title="종목" note={`${results!.stocks.length}개`} />
                  {results!.stocks.map((s) => (
                    <Link key={s.code} to={`/stock/${s.code}`} className={styles.row}>
                      <span className="ty-label">{s.name}</span>
                      <span className="ty-num" style={{ color: 'var(--text-caption)' }}>
                        {s.code}
                      </span>
                    </Link>
                  ))}
                </section>
              )}
              {results!.persons.length > 0 && (
                <section>
                  <SectionHeader title="인물" note={`${results!.persons.length}명`} />
                  {results!.persons.map((p) => (
                    <PersonRow
                      key={p.id}
                      person={p}
                      right={
                        <FollowChip following={followed.includes(p.id)} onToggle={() => toggleFollowPerson(p.id)} />
                      }
                    />
                  ))}
                </section>
              )}
            </>
          )}
        </>
      )}

      {effectiveState === 'ready' && !query && (
        <>
          {recent.length > 0 && (
            <section>
              <SectionHeader title="최근 본 항목" />
              <div className={styles.recentRow}>
                {recent.map((r) => (
                  <Link
                    key={`${r.kind}-${r.id}`}
                    to={r.kind === 'person' ? `/person/${encodeURIComponent(r.id)}` : `/stock/${r.id}`}
                    className={`ty-body-s ${styles.recentChip}`}
                  >
                    {r.label}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionHeader title="많이 움직인 큰손" note="최근 12개월 순매수 기준" />
            <FilterChips label="인물 유형" options={TYPES} selected={[type]} onToggle={setType} />
            <div style={{ marginTop: 'var(--space-3)' }}>
              {isEmpty ? (
                <EmptyState
                  icon="person_search"
                  title={type === 'official' ? '공직자 데이터는 아직 준비 중입니다' : '표시할 인물이 없습니다'}
                  micro={type === 'official' ? '재산공개는 연 1회라 M2에서 붙습니다' : undefined}
                />
              ) : (
                popular.map((p) => (
                  <PersonRow
                    key={p.id}
                    person={p}
                    right={
                      <>
                        <Num>{formatAmountShort(Math.abs(p.totalNetBuy12m))}</Num>
                        <FollowChip following={followed.includes(p.id)} onToggle={() => toggleFollowPerson(p.id)} />
                      </>
                    }
                  />
                ))
              )}
            </div>
          </section>
        </>
      )}

      <footer className={homeStyles.footer}>
        {data?.meta && <FreshnessLabel lastUpdated={data.meta.lastUpdated} />}
        <Disclaimer compact />
      </footer>
    </Screen>
  )
}
