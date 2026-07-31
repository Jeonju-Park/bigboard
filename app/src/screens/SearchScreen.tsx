import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import AppBar from '@/shared/components/AppBar'
import Icon from '@/shared/components/Icon'
import { PersonRow } from '@/shared/components/Rows'
import { EmptyState, ErrorState, LoadingState, SectionHeader } from '@/shared/components/Feedback'
import { getMeta, getPersons, getStocks } from '@/lib/data'
import { useAsync } from '@/lib/useData'
import { toggleFollowPerson, useFollowedPersons, useRecent } from '@/lib/follow'
import { formatDate } from '@/lib/format'
import styles from './SearchScreen.module.css'

/**
 * 검색 — 앱바가 통째로 입력창이 되는 전용 화면.
 *
 * 탐색 탭에서 검색창을 걷어내고 이리로 옮겼다. 탐색은 '둘러보기', 검색은 '찾기'로
 * 목적이 다른데 한 화면에 있으면 둘 다 어중간해진다.
 * 진입 즉시 입력창에 포커스를 줘서 모바일 자판이 바로 올라온다.
 */
export default function SearchScreen() {
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const followed = useFollowedPersons()
  const recent = useRecent()

  const { state, data, error, retry } = useAsync(async () => {
    const [persons, stocks, meta] = await Promise.all([getPersons(), getStocks(), getMeta()])
    return { persons, stocks, meta }
  })

  useEffect(() => {
    document.title = '검색 · 빅보드'
    // 모바일에서 자판이 바로 올라오게. iOS 는 사용자 제스처 직후에만 허용하는데,
    // 이 화면은 검색 버튼 탭으로 진입하므로 그 제스처 컨텍스트가 살아 있다.
    inputRef.current?.focus()
  }, [])

  const query = q.trim()

  const results = useMemo(() => {
    if (!data || !query) return null
    const lower = query.toLowerCase()
    return {
      stocks: data.stocks
        .filter((s) => s.name.includes(query) || s.code.toLowerCase().includes(lower))
        .slice(0, 20),
      persons: data.persons.filter((p) => p.name.includes(query) || p.company.includes(query)).slice(0, 20),
    }
  }, [data, query])

  const noResults = Boolean(query) && results && results.persons.length === 0 && results.stocks.length === 0

  const searchField = (
    <div className={styles.field}>
      <Icon name="search" size="sm" />
      <input
        ref={inputRef}
        className={`ty-body ${styles.input}`}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="종목명, 종목코드, 인물 이름"
        aria-label="종목·인물 검색"
        enterKeyHint="search"
        autoComplete="off"
      />
      {q && (
        <button type="button" className={styles.clear} onClick={() => { setQ(''); inputRef.current?.focus() }} aria-label="검색어 지우기">
          <Icon name="cancel" size="sm" />
        </button>
      )}
    </div>
  )

  return (
    <>
      <AppBar title="검색" showBack center={searchField} />
      <main className={`${styles.main} gutter`}>
        {state === 'loading' && <LoadingState rows={2} />}
        {state === 'error' && <ErrorState message={error?.message} onRetry={retry} />}

        {state === 'ready' && !query && (
          recent.length > 0 ? (
            <section>
              <SectionHeader title="최근 본 항목" />
              {recent.map((r) => (
                <Link
                  key={`${r.kind}-${r.id}`}
                  to={r.kind === 'person' ? `/person/${encodeURIComponent(r.id)}` : `/stock/${r.id}`}
                  className={styles.recentRow}
                >
                  <Icon name={r.kind === 'person' ? 'person' : 'apartment'} size="sm" />
                  <span className="ty-body">{r.label}</span>
                  <Icon name="chevron_right" size="sm" />
                </Link>
              ))}
            </section>
          ) : (
            <EmptyState
              icon="search"
              title="무엇을 찾아드릴까요"
              micro="종목명, 종목코드, 인물 이름으로 찾을 수 있습니다"
            />
          )
        )}

        {state === 'ready' && query && noResults && (
          <EmptyState
            icon="search_off"
            title={`'${query}' 검색 결과가 없습니다`}
            micro="수집된 공시에 등장한 이름만 찾을 수 있습니다"
          />
        )}

        {state === 'ready' && query && !noResults && results && data && (
          <>
            {results.stocks.length > 0 && (
              <section>
                <SectionHeader title="종목" note={`${results.stocks.length}개`} />
                {results.stocks.map((s) => (
                  <Link key={s.code} to={`/stock/${s.code}`} className={styles.stockRow}>
                    <span className="ty-label">{s.name}</span>
                    <span className="ty-num ty-caption">{s.code}</span>
                  </Link>
                ))}
              </section>
            )}
            {results.persons.length > 0 && (
              <section>
                <SectionHeader title="인물" note={`${results.persons.length}명`} />
                {results.persons.map((p) => (
                  <PersonRow
                    key={p.id}
                    person={p}
                    amount={p.totalNetBuy12m === 0 ? null : Math.abs(p.totalNetBuy12m)}
                    amountNote={p.type === 'official' && data.meta.officialsAsOf ? `${formatDate(data.meta.officialsAsOf)} 기준` : null}
                    bookmarked={followed.includes(p.id)}
                    onToggleBookmark={() => toggleFollowPerson(p.id)}
                  />
                ))}
              </section>
            )}
          </>
        )}

        {/* 결과가 없을 때 막다른 길이 되지 않게 */}
        {state === 'ready' && (noResults || (!query && recent.length === 0)) && (
          <button type="button" className={`ty-body ${styles.exploreLink}`} onClick={() => navigate('/explore')}>
            탐색에서 둘러보기
          </button>
        )}
      </main>
    </>
  )
}
