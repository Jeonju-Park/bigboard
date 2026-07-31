import { useMemo } from 'react'
import { Link } from 'react-router'
import Screen from '@/shared/components/Screen'
import { AppBarAction } from '@/shared/components/AppBar'
import { PersonRow } from '@/shared/components/Rows'
import BookmarkButton from '@/shared/components/BookmarkButton'
import { ListGroup, ListRow } from '@/shared/components/ListSection'
import {
  Disclaimer, EmptyState, ErrorState, FreshnessLabel, LoadingState, SectionHeader,
} from '@/shared/components/Feedback'
import { getMeta, getPersons, getStocks } from '@/lib/data'
import { useAsync } from '@/lib/useData'
import { BROKERS, toggleFollowPerson, toggleFollowStock, useBroker, useFollowedPersons, useFollowedStocks } from '@/lib/follow'
import { formatDate } from '@/lib/format'
import styles from './MyScreen.module.css'

/** S8 마이 — 내가 모아둔 것. 설정은 /settings 로 분리했다 */
export default function MyScreen() {
  const followedPersons = useFollowedPersons()
  const followedStocks = useFollowedStocks()
  const brokerId = useBroker()

  const { state, data, error, retry } = useAsync(async () => {
    const [persons, stocks, meta] = await Promise.all([getPersons(), getStocks(), getMeta()])
    return { persons, stocks, meta }
  })

  const persons = useMemo(
    () => (data ? data.persons.filter((p) => followedPersons.includes(p.id)) : []),
    [data, followedPersons],
  )
  const stocks = useMemo(
    () => (data ? data.stocks.filter((s) => followedStocks.includes(s.code)) : []),
    [data, followedStocks],
  )

  const broker = BROKERS.find((b) => b.id === brokerId) ?? BROKERS[0]
  const officialNote = data?.meta.officialsAsOf ? `${formatDate(data.meta.officialsAsOf)} 기준` : null

  if (state === 'loading') return <Screen title="마이"><LoadingState rows={2} /></Screen>
  if (state === 'error') return <Screen title="마이"><ErrorState message={error?.message} onRetry={retry} /></Screen>

  const nothingFollowed = persons.length === 0 && stocks.length === 0

  return (
    <Screen title="마이" actions={<AppBarAction icon="settings" label="설정" to="/settings" />}>
      {nothingFollowed ? (
        <EmptyState
          icon="bookmark_border"
          title="아직 저장한 항목이 없습니다"
          micro="큰손들은 기다려주지 않습니다만,"
          actionLabel="탐색에서 찾기"
          actionTo="/explore"
        />
      ) : (
        <>
          {persons.length > 0 && (
            <section>
              <SectionHeader title="팔로우한 인물" note={`${persons.length}명`} />
              {persons.map((p) => (
                <PersonRow
                  key={p.id}
                  person={p}
                  amount={p.totalNetBuy12m === 0 ? null : Math.abs(p.totalNetBuy12m)}
                  amountNote={p.type === 'official' ? officialNote : null}
                  bookmarked
                  onToggleBookmark={() => toggleFollowPerson(p.id)}
                />
              ))}
            </section>
          )}

          {stocks.length > 0 && (
            <section>
              <SectionHeader title="팔로우한 종목" note={`${stocks.length}개`} />
              {stocks.map((s) => (
                <Link key={s.code} to={`/stock/${s.code}`} className={styles.stockRow}>
                  <div className={styles.stockBody}>
                    <p className="ty-label">{s.name}</p>
                    <p className="ty-num ty-caption">{s.code}</p>
                  </div>
                  <BookmarkButton active onToggle={() => toggleFollowStock(s.code)} />
                </Link>
              ))}
            </section>
          )}
        </>
      )}

      <section>
        <SectionHeader title="거래 바로가기" />
        <ListGroup>
          <ListRow icon="account_balance" label="증권사" value={broker.name} to="/settings" />
        </ListGroup>
        <p className="ty-micro" style={{ marginTop: 'var(--space-2)' }}>
          링크로 이동만 하며, 주문은 증권사 앱에서 직접 하셔야 합니다
        </p>
      </section>

      <footer className={styles.footer}>
        {data?.meta && <FreshnessLabel lastUpdated={data.meta.lastUpdated} />}
        <Disclaimer compact />
      </footer>
    </Screen>
  )
}
