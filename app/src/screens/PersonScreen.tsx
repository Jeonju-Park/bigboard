import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router'
import Screen from '@/shared/components/Screen'
import PersonAvatar from '@/shared/components/PersonAvatar'
import BookmarkButton from '@/shared/components/BookmarkButton'
import { PersonTypeBadge } from '@/shared/components/Rows'
import AssetHistory from '@/shared/components/AssetHistory'
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
        <section>
          <SectionHeader
            title="재산공개 연혁"
            note={person.officialAssets?.length ? `${person.officialAssets.length}개 연도` : undefined}
          />
          {person.officialAssets?.length ? (
            <AssetHistory years={person.officialAssets} />
          ) : (
            <p className="ty-body-s" style={{ margin: 0 }}>공개된 재산 자료가 아직 없습니다.</p>
          )}
          <div className={styles.noticeBox} style={{ marginTop: 'var(--space-4)' }}>
            <p className="ty-body-s" style={{ margin: 0 }}>
              {/* 관보에 적힌 날짜는 **공개일**이다. '기준'이라고 쓰면 그 날짜의 시세로
                  평가했다는 뜻이 되는데, 실제 평가 기준일은 관보에 적혀 있지 않다 */}
              고위공직자 재산은 <b>연 1회 정기공개</b>와 임용·퇴직 시 수시공개로만 알려집니다.
              실시간 거래 내역이 아니라 {asOf ? <b>{formatDate(asOf)}에 공개된</b> : '공개된'} 신고
              자료이며, 언제 사고팔았는지는 공개되지 않습니다.
            </p>
            {person.sourceNote && (
              <p className="ty-micro" style={{ margin: 'var(--space-2) 0 0' }}>출처: {person.sourceNote}</p>
            )}
          </div>
        </section>
      )}

      {/* ── 보유 현황 ── */}
      <section>
        <SectionHeader
          title="보유 현황"
          note={
            person.type === 'official'
              ? `종목 ${person.holdings.length}개 · 재산공개 기준`
              : `종목 ${person.holdings.length}개 · 최근 공시 기준`
          }
        />
        {person.holdings.length ? (
          <ul className={styles.holdings}>
            {person.holdings.map((h, i) => {
              const body = (
                <>
                  <div className={styles.holdingBody}>
                    <p className={`ty-label ${styles.ellipsis}`}>{h.stockName}</p>
                    <p className="ty-num ty-caption">
                      {/* 공직자 재산공개는 가족 재산까지 함께 공개된다.
                          명의를 안 쓰면 배우자 보유가 본인 것으로 읽힌다 */}
                      {h.owner ? h.owner : h.stockCode}
                      {h.owner && h.stockCode ? ` · ${h.stockCode}` : ''}
                    </p>
                  </div>
                  <span className="ty-amount">{formatQuantity(h.quantity)}</span>
                </>
              )
              return (
                <li key={`${h.stockCode ?? h.stockName}-${h.owner ?? ''}-${i}`} className={styles.holdingRow}>
                  {/* 코드를 못 이은 종목(주로 해외 주식)은 링크를 걸지 않는다 —
                      엉뚱한 종목 화면으로 보내는 것보다 낫다 */}
                  {h.stockCode ? (
                    <Link to={`/stock/${h.stockCode}`} className={styles.holdingLink}>{body}</Link>
                  ) : (
                    <div className={styles.holdingLink}>{body}</div>
                  )}
                </li>
              )
            })}
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
