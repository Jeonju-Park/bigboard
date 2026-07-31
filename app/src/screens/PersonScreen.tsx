import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router'
import Screen from '@/shared/components/Screen'
import Placeholder from '@/shared/components/Placeholder'
import { FollowChip, PersonTypeBadge, StockInfoList } from '@/shared/components/Rows'
import { Num } from '@/shared/components/Num'
import {
  Disclaimer, EmptyState, ErrorState, FreshnessLabel, LoadingState, SectionHeader,
} from '@/shared/components/Feedback'
import { getDisclosures, getMeta, getPersons } from '@/lib/data'
import { useAsync } from '@/lib/useData'
import { pushRecent, toggleFollowPerson, useFollowedPersons } from '@/lib/follow'
import { personKey } from '@/lib/keys'
import { formatAmountShort, formatDate, formatQuantity } from '@/lib/format'
import homeStyles from './HomeScreen.module.css'
import styles from './FeedDetailScreen.module.css'

/** S3 인물 프로필 — 유형 배지 + 보유 현황 + 거래 타임라인 */
export default function PersonScreen() {
  const { id } = useParams()
  const followed = useFollowedPersons()

  const { state, data, error, retry } = useAsync(async () => {
    const [persons, disclosures, meta] = await Promise.all([getPersons(), getDisclosures(), getMeta()])
    return { persons, disclosures, meta }
  })

  const person = useMemo(() => data?.persons.find((p) => p.id === id) ?? null, [data, id])
  const timeline = useMemo(() => {
    if (!data || !person) return []
    return data.disclosures
      .filter((d) => personKey(d.personName, d.company) === person.id)
      .sort((a, b) => b.tradeDate.localeCompare(a.tradeDate))
  }, [data, person])

  useEffect(() => {
    if (person) pushRecent({ kind: 'person', id: person.id, label: person.name })
  }, [person])

  const effectiveState = state

  if (effectiveState === 'loading') return <Screen title="인물" showBack><LoadingState /></Screen>
  if (effectiveState === 'error')
    return <Screen title="인물" showBack><ErrorState message={error?.message} onRetry={retry} /></Screen>
  if (!person)
    return (
      <Screen title="인물" showBack>
        <EmptyState icon="person_off" title="이 인물을 찾을 수 없습니다" micro="수집 범위를 벗어났을 수 있습니다" actionLabel="탐색으로" actionTo="/explore" />
      </Screen>
    )

  return (
    <Screen title="인물" showBack>
      <section>
        <div className={styles.head}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', minWidth: 0 }}>
            <Placeholder label={person.name.slice(0, 2)} size={48} />
            <div style={{ minWidth: 0 }}>
              <h2 className="ty-title" style={{ margin: 0 }}>{person.name}</h2>
              <p className="ty-caption" style={{ margin: 0 }}>
                {person.company}{person.title ? ` · ${person.title}` : ''}
              </p>
            </div>
          </div>
          <FollowChip following={followed.includes(person.id)} onToggle={() => toggleFollowPerson(person.id)} />
        </div>
        <PersonTypeBadge type={person.type} />
      </section>

      {person.type === 'official' && (
        <section>
          <SectionHeader title="재산공개 연혁" />
          <p className="ty-body" style={{ margin: 0 }}>준비 중입니다.</p>
          <p className="ty-micro" style={{ marginTop: 'var(--space-2)' }}>
            고위공직자 재산은 <b>연 1회</b>만 공개됩니다. 실시간 거래 내역이 아니며, 기준일 시점의 신고 자료입니다.
          </p>
        </section>
      )}

      <section>
        <SectionHeader title="보유 현황" note="가장 최근 공시 기준" />
        {person.holdings.length ? (
          <StockInfoList
            items={person.holdings.map((h) => ({
              term: h.stockName,
              value: h.quantity ? formatQuantity(h.quantity) : null,
            }))}
          />
        ) : (
          <p className="ty-caption" style={{ margin: 0 }}>공시에서 확인된 보유 수량이 없습니다.</p>
        )}
        {person.totalNetBuy12m !== 0 && (
          <p className="ty-body-s" style={{ marginTop: 'var(--space-3)' }}>
            최근 12개월 순{person.totalNetBuy12m > 0 ? '매수' : '매도'}{' '}
            <Num>{formatAmountShort(Math.abs(person.totalNetBuy12m))}</Num>
          </p>
        )}
        <p className="ty-micro" style={{ marginTop: 'var(--space-2)' }}>
          집계 기준: 단가가 확인된 공시만 합산한 빅보드 계산값입니다.
        </p>
      </section>

      <section>
        <SectionHeader title="거래 타임라인" note={`${timeline.length}건`} />
        {timeline.map((d) => (
          <Link key={d.id} to={`/feed/${d.id}`} className={styles.miniRow}>
            <span className="ty-body-s">{formatDate(d.tradeDate)}</span>
            <span className={`ty-body-s ${d.direction === 'buy' ? styles.buy : styles.sell}`}>
              {d.direction === 'buy' ? '매수' : '매도'}
            </span>
            {d.isPlanned && <span className="ty-micro">예고</span>}
            <span className="ty-num" style={{ marginInlineStart: 'auto' }}>
              {formatAmountShort(d.totalAmount) ?? formatQuantity(d.quantity)}
            </span>
          </Link>
        ))}
      </section>

      <footer className={homeStyles.footer}>
        {data?.meta && <FreshnessLabel lastUpdated={data.meta.lastUpdated} />}
        <Disclaimer compact />
      </footer>
    </Screen>
  )
}
