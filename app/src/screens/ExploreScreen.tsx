import { useMemo } from 'react'
import { Link } from 'react-router'
import Screen from '@/shared/components/Screen'
import { AppBarAction } from '@/shared/components/AppBar'
import { PersonRow } from '@/shared/components/Rows'
import Icon from '@/shared/components/Icon'
import {
  Disclaimer, EmptyState, ErrorState, FreshnessLabel, LoadingState, SectionHeader,
} from '@/shared/components/Feedback'
import { getDisclosures, getGazette, getInstitutions, getMeta, getOfficials, getPersons } from '@/lib/data'
import { useAsync } from '@/lib/useData'
import { toggleFollowPerson, useFollowedPersons } from '@/lib/follow'
import { formatAmountShort, formatDate } from '@/lib/format'
import { officialStockValue, personHeadline } from '@/lib/person'
import { daysAgoKey, todayKey } from '@/lib/date'
import { MARKETS, useMarket } from '@/lib/market'
import type { Person } from '@/lib/types'
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
  const market = useMarket()
  const filer = MARKETS[market].filerLabel
  const followed = useFollowedPersons()

  const { state, data, error, retry } = useAsync(async () => {
    const [disclosures, persons, officials, meta, gazette, institutions] = await Promise.all([
      getDisclosures(),
      getPersons(),
      // 시장마다 없는 파일이 있다 (공직자·관보는 국장만, 13F 는 미장만)
      getOfficials().catch(() => [] as Person[]),
      getMeta(),
      getGazette().catch(() => []),
      getInstitutions().catch(() => []),
    ])
    return { disclosures, persons, officials, meta, gazette, institutions }
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

    // ③ 많이 움직인 큰손 — 12개월 순매수 절댓값 (내부자만. 공직자는 순매수를 계산할 수 없다)
    const movers = data.persons
      .filter((p) => p.type === 'insider' && p.totalNetBuy12m !== 0)
      .sort((a, b) => Math.abs(b.totalNetBuy12m) - Math.abs(a.totalNetBuy12m))
      .slice(0, 8)

    // ③-2 공직자 — 성격이 달라 별도 섹션. 거래 흐름이 아니라 연 1회 잔액이라
    //      같은 목록에 섞으면 '순매수 0' 으로 밀려 영원히 안 보인다
    // 증권 항목이 없는 공직자는 이 목록에서 뺀다 — 총재산으로 대체하면 '주식 평가액 순'이 거짓이 된다.
    // 대신 몇 명이 빠졌는지 화면에 밝힌다.
    const allOfficials = data.officials
    const officials = allOfficials
      .filter((p) => officialStockValue(p) !== null)
      .sort((a, b) => (officialStockValue(b) ?? 0) - (officialStockValue(a) ?? 0))
      .slice(0, 8)
    const officialsNoStock = allOfficials.length - allOfficials.filter((p) => officialStockValue(p) !== null).length

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

    return { busiest, netBought, movers, officials, officialsNoStock, upcoming, consensus }
  }, [data])

  const officialNote = data?.meta.officialsAsOf ? `${formatDate(data.meta.officialsAsOf)} 공개` : null

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
            <SectionHeader title="공시가 잦은 종목" note={`최근 30일 · ${filer} 공시 건수`} />
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
              시장 거래량이 아니라 <b>{filer} 공시 건수</b>입니다. 시세 소스가 아직 연결되지 않았습니다.
            </p>
          </section>

          {insight.netBought.length > 0 && (
            <section>
              <SectionHeader title="많이 사들인 종목" note={`최근 30일 · ${filer} 순매수`} />
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
              <SectionHeader title="여럿이 함께 산 종목" note="최근 30일 · 매수자 3인 이상" />
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
            <SectionHeader title="많이 움직인 큰손" note={`${filer} · 최근 12개월 순매수`} />
            {insight.movers.length ? (
              insight.movers.map((p) => {
                const h = personHeadline(p)
                return (
                  <PersonRow
                    key={p.id}
                    person={p}
                    amount={h.amount}
                    amountNote={h.note}
                    bookmarked={followed.includes(p.id)}
                    onToggleBookmark={() => toggleFollowPerson(p.id)}
                  />
                )
              })
            ) : (
              <EmptyState icon="person_search" title="표시할 인물이 없습니다" />
            )}
          </section>

          {data?.institutions.length ? (
            <section>
              <SectionHeader
                title="기관 보유"
                note="13F · 분기말 기준"
              />
              {/* ⚠️ 13F 는 '지금 보유'가 아니다. 분기말 스냅샷 + 최대 45일 지연.
                  기준일을 행마다 붙이고, 섹션 아래에 한 번 더 설명한다 */}
              <ul className={styles.instList}>
                {data!.institutions.map((inst) => (
                  <li key={inst.id}>
                    <details className={styles.inst}>
                      <summary className={styles.instHead}>
                        <div className={styles.rowBody}>
                          <p className={`ty-body ${styles.instName}`}>{inst.name}</p>
                          <p className="ty-caption">
                            {formatDate(inst.periodOfReport)} 기준 · {inst.holdingCount.toLocaleString()}종목
                          </p>
                        </div>
                        <span className={`ty-num ${styles.instValue}`}>
                          {formatAmountShort(inst.totalValue)}
                        </span>
                        <Icon name="expand_more" size="sm" />
                      </summary>

                      <ol className={styles.holdingList}>
                        {inst.holdings.slice(0, 10).map((h) => (
                          <li key={`${h.cusip}-${h.putCall ?? 'share'}`} className={styles.holding}>
                            {/* 티커를 못 찾은 종목은 링크를 걸지 않는다 —
                                엉뚱한 종목으로 보내느니 이름만 두는 게 낫다 */}
                            {h.ticker ? (
                              <Link to={`/stock/${h.ticker}`} className={`ty-body-s ${styles.holdingName}`}>
                                {h.name}
                              </Link>
                            ) : (
                              <span className={`ty-body-s ${styles.holdingName}`}>{h.name}</span>
                            )}
                            {h.putCall && <span className="ty-micro"> · {h.putCall === 'put' ? '풋' : '콜'}옵션</span>}
                            <span className={`ty-num ${styles.holdingValue}`}>
                              {formatAmountShort(h.value)}
                            </span>
                          </li>
                        ))}
                      </ol>

                      <p className="ty-micro" style={{ margin: 'var(--space-2) 0 0' }}>
                        상위 {Math.min(10, inst.holdings.length)}종목 · 전체 {inst.holdingCount.toLocaleString()}종목 중
                        {' · '}
                        <a href={inst.sourceUrl} target="_blank" rel="noopener noreferrer">
                          SEC 원문
                        </a>
                      </p>
                    </details>
                  </li>
                ))}
              </ul>

              <p className="ty-micro" style={{ marginTop: 'var(--space-3)' }}>
                13F는 분기가 끝난 뒤 최대 45일 안에 제출됩니다. <b>지금 보유 중인 목록이 아닙니다.</b>
                공매도 포지션·채권·해외 상장 주식은 신고 대상이 아니라 여기에 없습니다.
              </p>
            </section>
          ) : null}

          {/* 고위공직자 재산공개는 **국장 전용**이다. 미장에 빈 섹션을 남기면
              '아직 수집 안 된 것'처럼 보이지만 실제로는 그 시장에 없는 자료다.
              미장의 대응물은 하원의원 거래(STOCK Act)로 따로 붙는다. */}
          {market === 'kr' && (
          <section>
            <SectionHeader
              title="고위공직자"
              note={officialNote ? `주식 평가액 · ${officialNote}` : '재산공개'}
            />
            {insight.officials.length ? (
              <>
                {insight.officials.map((p) => {
                  const h = personHeadline(p)
                  return (
                    <PersonRow
                      key={p.id}
                      person={p}
                      amount={h.amount}
                      amountNote={h.note}
                      bookmarked={followed.includes(p.id)}
                      onToggleBookmark={() => toggleFollowPerson(p.id)}
                    />
                  )
                })}
                <p className="ty-micro" style={{ marginTop: 'var(--space-2)' }}>
                  공직자 재산은 <b>연 1회</b>만 공개됩니다. 거래 시점은 공개되지 않아 매매 내역을 알 수 없고,
                  위 금액은 신고 기준일의 증권 평가액입니다.
                  {insight.officialsNoStock > 0 &&
                    ` 자료에 증권 항목이 없는 ${insight.officialsNoStock}명은 총재산으로 대체하지 않고 제외했습니다.`}
                </p>
              </>
            ) : (
              /* 금액 자료가 없을 때는 빈 화면 대신 **관보 색인**을 보여준다.
                 API 가 개인별 금액을 주지 않아 목록은 못 채우지만,
                 "언제 공개가 있었고 원문은 여기"는 지금도 사실대로 말할 수 있다. */
              <>
                {data?.gazette?.length ? (
                  <>
                    <p className="ty-body-s" style={{ margin: '0 0 var(--space-3)' }}>
                      개인별 재산 내역은 관보 원문에 있습니다. 최근 공개된 관보를 모았습니다.
                    </p>
                    <ul className={styles.gazetteList}>
                      {data.gazette.slice(0, 6).map((g) => (
                        <li key={g.id}>
                          <a href={g.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.gazetteRow}>
                            <div className={styles.rowBody}>
                              <p className={`ty-body-s ${styles.gazetteTitle}`}>{g.title}</p>
                              <p className="ty-caption">
                                {formatDate(g.publishedAt)} · {g.institution}
                                {g.isCorrection ? ' · 정정' : ''}
                              </p>
                            </div>
                            <Icon name="open_in_new" size="sm" />
                          </a>
                        </li>
                      ))}
                    </ul>
                    <p className="ty-micro" style={{ marginTop: 'var(--space-3)' }}>
                      출처: 행정안전부 관보. 공직자 재산은 <b>연 1회 정기공개</b>와 퇴직·신규 임용 시 수시공개로
                      이뤄집니다. 거래 시점은 공개되지 않습니다.
                    </p>
                  </>
                ) : (
                  <EmptyState
                    icon="how_to_reg"
                    title="공직자 재산 자료가 아직 없습니다"
                    micro="재산공개는 매년 3월에 이뤄집니다"
                  />
                )}
              </>
            )}
          </section>
          )}
        </>
      )}

      <footer className={homeStyles.footer}>
        {data?.meta && <FreshnessLabel lastUpdated={data.meta.lastUpdated} />}
        <Disclaimer compact />
      </footer>
    </Screen>
  )
}
