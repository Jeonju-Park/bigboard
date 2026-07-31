import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router'
import Screen from '@/shared/components/Screen'
import DisclosureCard from '@/shared/components/DisclosureCard'
import { Button } from '@/shared/components/Controls'
import { FollowChip, StockInfoList } from '@/shared/components/Rows'
import {
  Disclaimer, EmptyState, ErrorState, FreshnessLabel, LoadingState, SectionHeader,
} from '@/shared/components/Feedback'
import { getDisclosures, getMeta, getStocks } from '@/lib/data'
import { useAsync } from '@/lib/useData'
import { pushRecent, toggleFollowStock, useBroker, useFollowedStocks } from '@/lib/follow'
import { brokerActionLabel, brokerHref, findBroker } from '@/lib/broker'
import { formatAmountShort, formatDate } from '@/lib/format'
import homeStyles from './HomeScreen.module.css'
import styles from './FeedDetailScreen.module.css'

/** S4 종목 — 종목 정보 + 이 종목 전체 내부자 거래 + 예고 + 팔로우 + 거래 바로가기 */
export default function StockScreen() {
  const { code } = useParams()
  const followedStocks = useFollowedStocks()
  const brokerId = useBroker()

  const { state, data, error, retry } = useAsync(async () => {
    const [stocks, disclosures, meta] = await Promise.all([getStocks(), getDisclosures(), getMeta()])
    return { stocks, disclosures, meta }
  })

  const stock = useMemo(() => data?.stocks.find((s) => s.code === code) ?? null, [data, code])
  const list = useMemo(
    () => (data ? data.disclosures.filter((d) => d.stockCode === code) : []),
    [data, code],
  )
  const planned = list.filter((d) => d.isPlanned)
  const traded = list.filter((d) => !d.isPlanned)

  useEffect(() => {
    if (stock) pushRecent({ kind: 'stock', id: stock.code, label: stock.name })
  }, [stock])

  const effectiveState = state
  const broker = findBroker(brokerId)
  const brokerLink = brokerHref(broker)

  if (effectiveState === 'loading') return <Screen title="종목" showBack><LoadingState /></Screen>
  if (effectiveState === 'error')
    return <Screen title="종목" showBack><ErrorState message={error?.message} onRetry={retry} /></Screen>
  if (!stock)
    return (
      <Screen title="종목" showBack>
        <EmptyState icon="search_off" title="이 종목을 찾을 수 없습니다" micro="최근 30일 공시에 등장한 종목만 있습니다" actionLabel="탐색으로" actionTo="/explore" />
      </Screen>
    )

  return (
    <Screen title="종목" showBack>
      <section>
        <div className={styles.head}>
          <div>
            <h2 className="ty-title" style={{ margin: 0 }}>{stock.name}</h2>
            <p className="ty-num ty-caption" style={{ margin: 0 }}>{stock.code}</p>
          </div>
          <FollowChip
            following={followedStocks.includes(stock.code)}
            onToggle={() => toggleFollowStock(stock.code)}
          />
        </div>

        <StockInfoList
          items={[
            { term: '전일종가', value: stock.prevClose?.toLocaleString() ?? null },
            { term: '등락률', value: stock.change === null ? null : `${stock.change}%` },
            { term: '시가총액', value: formatAmountShort(stock.marketCap) },
            { term: '거래량', value: stock.volume?.toLocaleString() ?? null },
            { term: 'PER', value: stock.per?.toString() ?? null },
            { term: 'PBR', value: stock.pbr?.toString() ?? null },
            { term: '배당수익률', value: stock.divYield === null ? null : `${stock.divYield}%` },
            { term: '52주 최고', value: stock.high52?.toLocaleString() ?? null },
            { term: '52주 최저', value: stock.low52?.toLocaleString() ?? null },
          ]}
        />
        {!data?.meta.priceDataAvailable && (
          <p className="ty-micro" style={{ marginTop: 'var(--space-2)' }}>
            시세 정보는 아직 연결되지 않았습니다. 없는 값을 지어내지 않으려고 해당 항목은 표시하지 않습니다.
          </p>
        )}
      </section>

      {planned.length > 0 && (
        <section>
          <SectionHeader title="예고된 거래" note={`${planned.length}건`} />
          {planned.map((d) => (
            <Link key={d.id} to={`/feed/${d.id}`} className={styles.miniRow}>
              <span className="ty-body-s">{d.personName}</span>
              <span className={`ty-body-s ${d.direction === 'buy' ? styles.buy : styles.sell}`}>
                {d.direction === 'buy' ? '매수' : '매도'} 예정
              </span>
              <span className="ty-num" style={{ marginInlineStart: 'auto' }}>
                {formatDate(d.tradeDate)}{d.dDay !== null ? ` · D-${d.dDay}` : ''}
              </span>
            </Link>
          ))}
        </section>
      )}

      <section>
        <SectionHeader title="내부자 거래" note={`${traded.length}건`} />
        <div className={homeStyles.cards}>
          {traded.length ? (
            traded.map((d) => <DisclosureCard key={d.id} d={d} />)
          ) : (
            <p className="ty-caption" style={{ margin: 0 }}>수집 범위 내 거래 공시가 없습니다.</p>
          )}
        </div>
      </section>

      <section className={styles.actions}>
        {brokerLink ? (
          <Button block href={brokerLink}>{brokerActionLabel(broker)}</Button>
        ) : (
          <Button block to="/settings">거래할 증권사 선택하기</Button>
        )}
        <Disclaimer />
      </section>

      <footer className={homeStyles.footer}>
        {data?.meta && <FreshnessLabel lastUpdated={data.meta.lastUpdated} />}
      </footer>
    </Screen>
  )
}
