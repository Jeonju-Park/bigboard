import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router'
import Screen from '@/shared/components/Screen'
import PersonAvatar from '@/shared/components/PersonAvatar'
import BookmarkButton from '@/shared/components/BookmarkButton'
import { PersonTypeBadge } from '@/shared/components/Rows'
import { Promote } from '@/shared/components/Num'
import {
  Disclaimer, EmptyState, ErrorState, FreshnessLabel, LoadingState, SectionHeader,
} from '@/shared/components/Feedback'
import { getDisclosures, getMeta, getPersons } from '@/lib/data'
import { useAsync } from '@/lib/useData'
import { pushRecent, toggleFollowPerson, useFollowedPersons } from '@/lib/follow'
import { personKey } from '@/lib/keys'
import { formatAmountFull, formatAmountShort, formatDate, formatQuantity } from '@/lib/format'
import styles from './PersonScreen.module.css'

/** S3 인물 프로필 — 정체성 → 요약 수치 → 보유 → 타임라인 */
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

  const stats = useMemo(() => {
    const actual = timeline.filter((d) => !d.isPlanned)
    const buys = actual.filter((d) => d.direction === 'buy').length
    const sells = actual.filter((d) => d.direction === 'sell').length
    const planned = timeline.filter((d) => d.isPlanned).length
    return { total: actual.length, buys, sells, planned }
  }, [timeline])

  useEffect(() => {
    if (person) pushRecent({ kind: 'person', id: person.id, label: person.name })
  }, [person])

  if (state === 'loading') return <Screen title="인물" showBack><LoadingState /></Screen>
  if (state === 'error')
    return <Screen title="인물" showBack><ErrorState message={error?.message} onRetry={retry} /></Screen>
  if (!person)
    return (
      <Screen title="인물" showBack>
        <EmptyState icon="person_off" title="이 인물을 찾을 수 없습니다" micro="수집 범위를 벗어났을 수 있습니다" actionLabel="탐색으로" actionTo="/explore" />
      </Screen>
    )

  const isOfficial = person.type === 'official'
  const asOf = data?.meta.officialsAsOf ?? null

  return (
    <Screen title="인물" showBack>
      {/* ── 정체성 ── */}
      <section className={styles.identity}>
        <PersonAvatar type={person.type} size="lg" />
        <div className={styles.identityBody}>
          <PersonTypeBadge type={person.type} />
          <h2 className={`ty-title ${styles.name}`}>{person.name}</h2>
          <p className={`ty-body-s ${styles.affiliation}`}>
            {person.company}
            {person.title ? ` · ${person.title}` : ''}
          </p>
        </div>
        <BookmarkButton active={followed.includes(person.id)} onToggle={() => toggleFollowPerson(person.id)} />
      </section>

      {/* ── 요약 수치 — 이 인물을 한 줄로 말하면 ── */}
      {person.totalNetBuy12m !== 0 && (
        <section className={styles.summary}>
          <Promote
            label={`최근 12개월 순${person.totalNetBuy12m > 0 ? '매수' : '매도'}`}
            value={formatAmountFull(Math.abs(person.totalNetBuy12m))}
          />
          <dl className={styles.statRow}>
            <div className={styles.stat}>
              <dt className="ty-caption">공시</dt>
              <dd className="ty-num">{stats.total}건</dd>
            </div>
            <div className={styles.stat}>
              <dt className="ty-caption">매수</dt>
              <dd className={`ty-num ${styles.buy}`}>{stats.buys}</dd>
            </div>
            <div className={styles.stat}>
              <dt className="ty-caption">매도</dt>
              <dd className={`ty-num ${styles.sell}`}>{stats.sells}</dd>
            </div>
            {stats.planned > 0 && (
              <div className={styles.stat}>
                <dt className="ty-caption">예고</dt>
                <dd className="ty-num">{stats.planned}</dd>
              </div>
            )}
          </dl>
          <p className="ty-micro" style={{ margin: 0 }}>
            집계 기준: 단가가 확인된 공시만 합산한 빅보드 계산값입니다
          </p>
        </section>
      )}

      {isOfficial && (
        <section className={styles.noticeBox}>
          <p className="ty-body-s" style={{ margin: 0 }}>
            고위공직자 재산은 <b>연 1회</b>만 공개됩니다. 실시간 거래 내역이 아니라{' '}
            {asOf ? <b>{formatDate(asOf)}</b> : '공개 시점'} 기준의 신고 자료입니다.
          </p>
        </section>
      )}

      {/* ── 보유 현황 ── */}
      <section>
        <SectionHeader title="보유 현황" note={`종목 ${person.holdings.length}개 · 최근 공시 기준`} />
        {person.holdings.length ? (
          <ul className={styles.holdings}>
            {person.holdings.map((h) => (
              <li key={h.stockCode} className={styles.holdingRow}>
                <Link to={`/stock/${h.stockCode}`} className={styles.holdingLink}>
                  <div className={styles.holdingBody}>
                    <p className={`ty-label ${styles.ellipsis}`}>{h.stockName}</p>
                    <p className="ty-num ty-caption">{h.stockCode}</p>
                  </div>
                  <span className="ty-amount">{formatQuantity(h.quantity)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ty-body-s" style={{ margin: 0 }}>공시에서 확인된 보유 수량이 없습니다.</p>
        )}
      </section>

      {/* ── 거래 타임라인 ── */}
      <section>
        <SectionHeader title="거래 타임라인" note={`${timeline.length}건`} />
        <ol className={styles.timeline}>
          {timeline.map((d) => (
            <li key={d.id}>
              <Link to={`/feed/${d.id}`} className={styles.timelineRow}>
                <div className={styles.timelineDate}>
                  <span className="ty-num ty-caption">{formatDate(d.tradeDate)}</span>
                </div>
                <div className={styles.timelineBody}>
                  <p className={styles.timelineHead}>
                    <span className={`ty-label ${d.direction === 'buy' ? styles.buy : styles.sell}`}>
                      {d.direction === 'buy' ? '매수' : '매도'}
                    </span>
                    {d.isPlanned && <span className={`ty-micro ${styles.flag}`}>예고</span>}
                    {d.isAmended && <span className={`ty-micro ${styles.flag}`}>정정</span>}
                    <span className={`ty-caption ${styles.ellipsis}`}>{d.company}</span>
                  </p>
                  <p className="ty-caption" style={{ margin: 0 }}>
                    {d.reportReason || '—'}
                  </p>
                </div>
                <span className="ty-amount">
                  {formatAmountShort(d.totalAmount) ?? formatQuantity(d.quantity)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <footer className={styles.footer}>
        {data?.meta && <FreshnessLabel lastUpdated={data.meta.lastUpdated} />}
        <Disclaimer compact />
      </footer>
    </Screen>
  )
}
