import { useMemo } from 'react'
import { Link } from 'react-router'
import Screen from '@/shared/components/Screen'
import { AppBarAction } from '@/shared/components/AppBar'
import { PersonRow } from '@/shared/components/Rows'
import Icon from '@/shared/components/Icon'
import {
  Disclaimer, EmptyState, ErrorState, FreshnessLabel, LoadingState, SectionHeader,
} from '@/shared/components/Feedback'
import { getDisclosures, getMeta, getPersons } from '@/lib/data'
import { useAsync } from '@/lib/useData'
import { toggleFollowPerson, useFollowedPersons } from '@/lib/follow'
import { formatAmountShort, formatDate } from '@/lib/format'
import { daysAgoKey, todayKey } from '@/lib/date'
import homeStyles from './HomeScreen.module.css'
import styles from './ExploreScreen.module.css'

/**
 * S5 탐색 — '찾기'가 아니라 '둘러보기'.
 * 검색은 /search 로 분리했고, 여기서는 지표를 훑어보게 한다.
 *
 * ⚠️ 지표 이름을 정직하게 붙인다. 시세 소스가 없어 '거래량'은 알 수 없으므로
 *    "거래량 많은 종목"이라 쓰지 않고 **"내부자 거래가 잦은 종목"**(공시 건수)이라 쓴다.
 *    마찬가지로 "주가와 연관 깊은 큰손"은 주가 데이터가 있어야 계산되므로 넣지 않았다.
 */
export default function ExploreScreen() {
  const followed = useFollowedPersons()

  const { state, data, error, retry } = useAsync(async () => {
    const [disclosures, persons, meta] = await Promise.all([getDisclosures(), getPersons(), getMeta()])
    return { disclosures, persons, meta }
  })

  const insight = useMemo(() => {
    if (!data) return null
    const today = todayKey()
    const cutoff30 = daysAgoKey(30)
    const actual = data.disclosures.filter((d) => !d.isPlanned)

    // ① 내부자 거래가 잦은 종목 — 공시 '건수' 기준 (거래량이 아니다)
    const byStock = new Map<string, { code: string; name: string; count: number; net: number; unknown: number }>()
    for (const d of actual) {
      if (d.discloseDate < cutoff30) continue
      const cur = byStock.get(d.stockCode) ?? { code: d.stockCode, name: d.company, count: 0, net: 0, unknown: 0 }
      cur.count++
      if (d.totalAmount === null) cur.unknown++
      else cur.net += d.direction === 'buy' ? d.totalAmount : -d.totalAmount
      byStock.set(d.stockCode, cur)
    }
    const busiest = [...byStock.values()].sort((a, b) => b.count - a.count).slice(0, 8)

    // ② 내부자가 가장 많이 사들인 종목 — 순매수 금액
    const netBought = [...byStock.values()].filter((s) => s.net > 0).sort((a, b) => b.net - a.net).slice(0, 5)

    // ③ 많이 움직인 큰손 — 12개월 순매수 절댓값
    const movers = data.persons
      .filter((p) => p.totalNetBuy12m !== 0)
      .sort((a, b) => Math.abs(b.totalNetBuy12m) - Math.abs(a.totalNetBuy12m))
      .slice(0, 8)

    // ④ 곧 있을 예고 거래 — 사전공시라 '앞으로 벌어질 일'을 미리 보는 유일한 창
    const upcoming = data.disclosures
      .filter((d) => d.isPlanned && d.tradeDate >= today)
      .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate))
      .slice(0, 5)

    // ⑤ 여러 내부자가 함께 사들인 종목 — 한 명이 아니라 여럿이 움직인 곳
    const consensus = [...byStock.entries()]
      .map(([code, s]) => {
        const buyers = new Set(
          actual.filter((d) => d.stockCode === code && d.direction === 'buy' && d.discloseDate >= cutoff30)
            .map((d) => d.personName),
        )
        return { ...s, buyers: buyers.size }
      })
      .filter((s) => s.buyers >= 3)
      .sort((a, b) => b.buyers - a.buyers)
      .slice(0, 5)

    return { busiest, netBought, movers, upcoming, consensus }
  }, [data])

  const officialNote = data?.meta.officialsAsOf ? `${formatDate(data.meta.officialsAsOf)} 기준` : null

  return (
    <Screen title="탐색" actions={<AppBarAction icon="search" label="검색" to="/search" />}>
      {state === 'loading' && <LoadingState rows={3} />}
      {state === 'error' && <ErrorState message={error?.message} onRetry={retry} />}

      {state === 'ready' && insight && (
        <>
          {insight.upcoming.length > 0 && (
            <section>
              <SectionHeader title="곧 있을 예고 거래" note="사전공시" />
              <div className={styles.cardScroll}>
                {insight.upcoming.map((d) => (
                  <Link key={d.id} to={`/feed/${d.id}`} className={styles.miniCard}>
                    <span className={`ty-micro ${styles.dday}`}>{d.dDay !== null ? `D-${d.dDay}` : '예정'}</span>
                    <span className={`ty-label ${styles.cardTitle}`}>{d.company}</span>
                    <span className="ty-caption">{d.personName}</span>
                    <span className="ty-amount">{formatAmountShort(d.totalAmount) ?? '금액 미상'}</span>
                  </Link>
                ))}
              </div>
              <p className="ty-micro" style={{ marginTop: 'var(--space-2)' }}>
                계획일 뿐이며 실제 거래는 달라질 수 있습니다
              </p>
            </section>
          )}

          <section>
            <SectionHeader title="내부자 거래가 잦은 종목" note="최근 30일 공시 건수" />
            {insight.busiest.map((s, i) => (
              <Link key={s.code} to={`/stock/${s.code}`} className={styles.rankRow}>
                <span className={`ty-num ${styles.rankNo}`}>{i + 1}</span>
                <div className={styles.rowBody}>
                  <p className={`ty-label ${styles.ellipsis}`}>{s.name}</p>
                  <p className="ty-num ty-caption">{s.code}</p>
                </div>
                <span className="ty-amount">{s.count}건</span>
                <Icon name="chevron_right" size="sm" />
              </Link>
            ))}
            <p className="ty-micro" style={{ marginTop: 'var(--space-2)' }}>
              시장 거래량이 아니라 <b>내부자 공시 건수</b>입니다. 시세 소스가 아직 연결되지 않았습니다.
            </p>
          </section>

          {insight.netBought.length > 0 && (
            <section>
              <SectionHeader title="내부자가 사들인 종목" note="최근 30일 순매수" />
              {insight.netBought.map((s, i) => (
                <Link key={s.code} to={`/stock/${s.code}`} className={styles.rankRow}>
                  <span className={`ty-num ${styles.rankNo}`}>{i + 1}</span>
                  <div className={styles.rowBody}>
                    <p className={`ty-label ${styles.ellipsis}`}>{s.name}</p>
                    <p className="ty-caption">{s.count}건 공시</p>
                  </div>
                  <span className="ty-amount">{formatAmountShort(s.net)}</span>
                  <Icon name="chevron_right" size="sm" />
                </Link>
              ))}
              <p className="ty-micro" style={{ marginTop: 'var(--space-2)' }}>
                집계 기준: 단가가 확인된 공시만 합산했습니다
              </p>
            </section>
          )}

          {insight.consensus.length > 0 && (
            <section>
              <SectionHeader title="여러 내부자가 함께 산 종목" note="최근 30일 · 매수자 3인 이상" />
              {insight.consensus.map((s) => (
                <Link key={s.code} to={`/stock/${s.code}`} className={styles.rankRow}>
                  <div className={styles.rowBody}>
                    <p className={`ty-label ${styles.ellipsis}`}>{s.name}</p>
                    <p className="ty-caption">{s.count}건 공시</p>
                  </div>
                  <span className="ty-amount">{s.buyers}명</span>
                  <Icon name="chevron_right" size="sm" />
                </Link>
              ))}
            </section>
          )}

          <section>
            <SectionHeader title="많이 움직인 큰손" note="최근 12개월 순매수" />
            {insight.movers.length ? (
              insight.movers.map((p) => (
                <PersonRow
                  key={p.id}
                  person={p}
                  amount={Math.abs(p.totalNetBuy12m)}
                  amountNote={p.type === 'official' ? officialNote : null}
                  bookmarked={followed.includes(p.id)}
                  onToggleBookmark={() => toggleFollowPerson(p.id)}
                />
              ))
            ) : (
              <EmptyState icon="person_search" title="표시할 인물이 없습니다" />
            )}
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
