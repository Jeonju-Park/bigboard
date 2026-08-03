import { useMemo } from 'react'
import { Link } from 'react-router'
import Screen from '@/shared/components/Screen'
import { AppBarAction } from '@/shared/components/AppBar'
import { PersonRow } from '@/shared/components/Rows'
import BookmarkButton from '@/shared/components/BookmarkButton'
import { Button } from '@/shared/components/Controls'
import Icon from '@/shared/components/Icon'
import {
  Disclaimer, EmptyState, ErrorState, FreshnessLabel, LoadingState, SectionHeader,
} from '@/shared/components/Feedback'
import { getMeta, getPersons, getStocks } from '@/lib/data'
import { useAsync } from '@/lib/useData'
import { useMarket } from '@/lib/market'
import { toggleFollowPerson, toggleFollowStock, useBroker, useFollowedPersons, useFollowedStocks } from '@/lib/follow'
import { BROKERS } from '@/lib/broker'
import { formatDate } from '@/lib/format'
import styles from './MyScreen.module.css'

/**
 * S8 마이 — 프로필 + 내가 저장한 것.
 * 앱 동작 설정은 /settings 로 분리했다.
 *
 * 로그인은 아직 없다. 그래서 프로필 자리에 '로그인' 버튼을 두되,
 * 지금도 앱이 온전히 동작한다는 사실을 함께 적는다 — 로그인을 강요하지 않는다.
 */
export default function MyScreen() {
  const market = useMarket()
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
  const savedCount = persons.length + stocks.length

  if (state === 'loading') return <Screen title="마이"><LoadingState rows={2} /></Screen>
  if (state === 'error') return <Screen title="마이"><ErrorState message={error?.message} onRetry={retry} /></Screen>

  return (
    <Screen title="마이" actions={<AppBarAction icon="settings" label="설정" to="/settings" />}>
      {/* ── 프로필 ── */}
      <section className={styles.profile}>
        <span className={styles.avatar} aria-hidden="true">
          <Icon name="person" />
        </span>
        <div className={styles.profileBody}>
          <p className="ty-title-s" style={{ margin: 0 }}>로그인하지 않음</p>
          <p className="ty-caption" style={{ margin: 0 }}>
            저장한 항목은 이 기기에만 있습니다
          </p>
        </div>
        <Button variant="secondary" to="/settings">
          로그인
        </Button>
      </section>

      {/* ── 저장한 항목 ── */}
      <section>
        <SectionHeader title="저장한 항목" note={savedCount > 0 ? `${savedCount}개` : undefined} />

        {savedCount === 0 ? (
          <EmptyState
            icon="bookmark_border"
            title="아직 저장한 항목이 없습니다"
            micro="큰손들은 기다려주지 않습니다만,"
            actionLabel="탐색에서 찾기"
            actionTo="/explore"
          />
        ) : (
          <div className={styles.savedGroups}>
            {persons.length > 0 && (
              <div>
                <h3 className={`ty-caption ${styles.subHead}`}>인물 {persons.length}명</h3>
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
              </div>
            )}

            {stocks.length > 0 && (
              <div>
                <h3 className={`ty-caption ${styles.subHead}`}>종목 {stocks.length}개</h3>
                {stocks.map((s) => (
                  <Link key={s.code} to={`/stock/${s.code}`} className={styles.stockRow}>
                    <span className={styles.stockAvatar} aria-hidden="true">
                      <Icon name="apartment" size="sm" />
                    </span>
                    <div className={styles.stockBody}>
                      <p className="ty-label">{s.name}</p>
                      <p className="ty-num ty-caption">{s.code}</p>
                    </div>
                    <BookmarkButton active onToggle={() => toggleFollowStock(s.code)} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── 거래 바로가기 설정 요약 ──
          국내 증권사 목록이라 미장에서는 의미가 없다. FeedDetail 의 CTA 와 같은 이유로 감춘다 */}
      {market === 'kr' && (
      <section>
        <SectionHeader title="거래 바로가기" />
        <Link to="/settings" className={styles.brokerRow}>
          <Icon name="account_balance" className={styles.brokerIcon} />
          <div className={styles.stockBody}>
            <p className="ty-body">증권사</p>
            <p className="ty-caption">
              {broker.appName ? `${broker.name} ${broker.appName}` : broker.name}
            </p>
          </div>
          <Icon name="chevron_right" size="sm" className={styles.chevron} />
        </Link>
        <p className="ty-micro" style={{ marginTop: 'var(--space-2)' }}>
          링크로 이동만 하며, 주문은 증권사 앱에서 직접 하셔야 합니다
        </p>
      </section>
      )}

      <footer className={styles.footer}>
        {data?.meta && <FreshnessLabel lastUpdated={data.meta.lastUpdated} />}
        <Disclaimer compact />
      </footer>
    </Screen>
  )
}
