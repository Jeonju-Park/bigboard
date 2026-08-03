import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router'
import Screen from '@/shared/components/Screen'
import DisclosureCard from '@/shared/components/DisclosureCard'
import { Button } from '@/shared/components/Controls'
import { FollowChip, StockInfoList } from '@/shared/components/Rows'
import {
  Disclaimer, EmptyState, ErrorState, FreshnessLabel, LoadingState, SectionHeader,
} from '@/shared/components/Feedback'
import { getDisclosures, getMeta, getPersons, getSparklines, getStocks } from '@/lib/data'
import { officialsHoldingStock } from '@/lib/officials'
import HoldingCard from '@/shared/components/HoldingCard'
import ShowMore from '@/shared/components/ShowMore'
import { useAsync } from '@/lib/useData'
import { pushRecent, toggleFollowStock, useBroker, useFollowedStocks } from '@/lib/follow'
import { brokerActionLabel, brokerHref, findBroker } from '@/lib/broker'
import { useMarket } from '@/lib/market'
import Sparkline from '@/shared/components/Sparkline'
import { formatAmountShort, formatDate, formatPercent, formatPrice, formatRatio } from '@/lib/format'
import homeStyles from './HomeScreen.module.css'
import styles from './FeedDetailScreen.module.css'

/** S4 종목 — 종목 정보 + 이 종목 전체 내부자 거래 + 예고 + 팔로우 + 거래 바로가기 */
export default function StockScreen() {
  const market = useMarket()
  const { code } = useParams()
  const followedStocks = useFollowedStocks()
  const brokerId = useBroker()

  const { state, data, error, retry } = useAsync(async () => {
    const [stocks, disclosures, meta, sparklines, persons] = await Promise.all([
      getStocks(), getDisclosures(), getMeta(), getSparklines().catch(() => ({})), getPersons(),
    ])
    return { stocks, disclosures, meta, sparklines, persons }
  })

  const stock = useMemo(() => data?.stocks.find((s) => s.code === code) ?? null, [data, code])
  const spark = code && data?.sparklines ? (data.sparklines as Record<string, any>)[code] ?? null : null
  const list = useMemo(
    () => (data ? data.disclosures.filter((d) => d.stockCode === code) : []),
    [data, code],
  )
  // 이 종목을 보유한 공직자. 거래가 아니라 **보유 스냅샷**이라 내부자 거래와 섞지 않는다
  const officialHolders = useMemo(
    () => (data && code ? officialsHoldingStock(data.persons, code) : []),
    [data, code],
  )
  const planned = list.filter((d) => d.isPlanned)
  const traded = list.filter((d) => !d.isPlanned)
  /**
   * 미장에서는 한 종목에 내부자(Form 4)와 하원의원(STOCK Act)이 함께 나온다.
   * 둘을 '내부자 거래' 한 섹션에 담으면 제목이 거짓이 된다 —
   * 실제로 NVDA 화면에서 '내부자 거래 27건' 아래에 하원의원이 줄줄이 나왔다.
   * 성격도 다르다: 내부자는 정확한 금액, 의원은 구간 신고다.
   */
  const insiderTrades = traded.filter((d) => d.personType !== 'politician')
  const politicianTrades = traded.filter((d) => d.personType === 'politician')

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

        {/* 주가는 이 화면의 주인공이라 목록보다 위에 승격한다 */}
        {stock.prevClose !== null && (
          <div className={styles.priceBlock}>
            <span className="ty-promote">{formatPrice(stock.prevClose)}</span>
            {stock.change !== null && (
              <span className={`ty-label ${stock.change >= 0 ? styles.buy : styles.sell}`}>
                {formatPercent(stock.change)}
              </span>
            )}
            {stock.priceAsOf && <span className="ty-micro">{formatDate(stock.priceAsOf)} 종가</span>}
          </div>
        )}

        {spark && (
          <div style={{ marginBlock: 'var(--space-4)' }}>
            <Sparkline data={spark} priceAsOf={stock.priceAsOf ? formatDate(stock.priceAsOf) : null} />
          </div>
        )}

        <StockInfoList
          items={[
            { term: '시장', value: stock.market },
            { term: '시가총액', value: formatAmountShort(stock.marketCap) },
            { term: '거래량', value: stock.volume === null ? null : `${stock.volume.toLocaleString()}주` },
            { term: '52주 최고', value: formatPrice(stock.high52) },
            { term: '52주 최저', value: formatPrice(stock.low52) },
            { term: 'PER', value: formatRatio(stock.per) },
            { term: 'PBR', value: formatRatio(stock.pbr) },
            // 배당수익률은 '변화'가 아니라 수준이라 부호를 붙이지 않는다.
            // formatPercent 는 등락률 전용이다 ('+0.02%' 는 배당이 늘었다는 뜻으로 읽힌다)
            {
              term: '배당수익률',
              value: stock.divYield === null ? null : `${formatRatio(stock.divYield)}%`,
            },
          ]}
        />
        {stock.prevClose === null && (
          <p className="ty-micro" style={{ marginTop: 'var(--space-2)' }}>
            이 종목의 시세를 찾지 못했습니다. 상장폐지되었거나 비상장일 수 있습니다.
          </p>
        )}
        {(stock.per === null || stock.divYield === null) && stock.prevClose !== null && (
          <p className="ty-micro" style={{ marginTop: 'var(--space-2)' }}>
            PER·PBR·배당수익률은 아직 연결되지 않아 표시하지 않습니다. 없는 값을 지어내지 않습니다.
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

      {officialHolders.length > 0 && (
        <section>
          <SectionHeader
            title="이 종목을 보유한 공직자"
            note={`${officialHolders.length}명 · 재산공개`}
          />
          <ShowMore items={officialHolders} initial={3} step={20} label="명">
            {(visible) => (
              <div className={homeStyles.cards}>
                {visible.map((h) => (
                  <HoldingCard key={h.person.id} holder={h} />
                ))}
              </div>
            )}
          </ShowMore>
          <p className="ty-micro" style={{ marginTop: 'var(--space-3)' }}>
            재산 신고 자료입니다. 거래 내역이 아니라 <b>보유 현황</b>이며, 언제 사고팔았는지는
            공개되지 않습니다.
          </p>
        </section>
      )}

      {politicianTrades.length > 0 && (
        <section>
          <SectionHeader title="의원 거래" note={`${politicianTrades.length}건 · STOCK Act 신고`} />
          <ShowMore items={politicianTrades} initial={5} step={20}>
            {(visible) => (
              <div className={homeStyles.cards}>
                {visible.map((d) => <DisclosureCard key={d.id} d={d} />)}
              </div>
            )}
          </ShowMore>
          <p className="ty-micro" style={{ marginTop: 'var(--space-3)' }}>
            의원은 정확한 금액을 신고하지 않습니다. 11개 구간 중 하나로만 공개되며,
            거래 후 30~45일 안에 신고합니다.
          </p>
        </section>
      )}

      {/* 빈 섹션은 숨긴다. '내부자 거래 0건'은 정보가 아니라 잡음이다.
          단, 어느 섹션도 없으면 화면이 통째로 비므로 그때만 안내를 남긴다 */}
      {insiderTrades.length > 0 && (
        <section>
          <SectionHeader title="내부자 거래" note={`${insiderTrades.length}건`} />
          <ShowMore items={insiderTrades} initial={5} step={20}>
            {(visible) => (
              <div className={homeStyles.cards}>
                {visible.map((d) => <DisclosureCard key={d.id} d={d} />)}
              </div>
            )}
          </ShowMore>
        </section>
      )}

      {traded.length === 0 && planned.length === 0 && officialHolders.length === 0 && (
        <section>
          <p className="ty-caption" style={{ margin: 0 }}>수집 범위 내 거래 공시가 없습니다.</p>
        </section>
      )}

      <section className={styles.actions}>
        {/* 국내 증권사 목록이라 미장에서는 열어도 할 수 있는 게 없다 (FeedDetail·마이와 동일) */}
        {market === 'kr' &&
          (brokerLink ? (
            <Button block href={brokerLink}>{brokerActionLabel(broker)}</Button>
          ) : (
            <Button block to="/settings">거래할 증권사 선택하기</Button>
          ))}
        <Disclaimer />
      </section>

      <footer className={homeStyles.footer}>
        {data?.meta && <FreshnessLabel lastUpdated={data.meta.lastUpdated} />}
      </footer>
    </Screen>
  )
}
