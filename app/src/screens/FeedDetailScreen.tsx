import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import Screen from '@/shared/components/Screen'
import { Button } from '@/shared/components/Controls'
import { FollowChip, StockInfoList } from '@/shared/components/Rows'
import { Emph, Promote } from '@/shared/components/Num'
import {
  Disclaimer,
  EmptyState,
  ErrorState,
  FreshnessLabel,
  LoadingState,
  SectionHeader,
} from '@/shared/components/Feedback'
import Icon from '@/shared/components/Icon'
import Sparkline from '@/shared/components/Sparkline'
import { getDisclosures, getMeta, getSparklines, getStocks } from '@/lib/data'
import { useAsync } from '@/lib/useData'
import { pushRecent, toggleFollowPerson, useBroker, useFollowedPersons } from '@/lib/follow'
import { brokerActionLabel, brokerHref, findBroker } from '@/lib/broker'
import { ownerLabel } from '@/lib/owner'
import { useMarket } from '@/lib/market'
import { sourceLabel } from '@/lib/source'
import { personKey } from '@/lib/keys'
import { daysAgoKey } from '@/lib/date'
import {
  daysBetween,
  formatAmountFull,
  formatAmountRange,
  formatAmountShort,
  formatDate,
  formatQuantity,
  formatPrice,
} from '@/lib/format'
import homeStyles from './HomeScreen.module.css'
import styles from './FeedDetailScreen.module.css'

/**
 * S2 피드 상세 — IA 가 정한 7개 섹션 순서:
 *  ①거래 요약 ②세부변동내역(접힘) ③인물 컨텍스트 ④종목 정보
 *  ⑤내부자 동향 ⑥예고 배너 ⑦거래 바로가기 + 고지문 + DART 원문 + 공유
 */
export default function FeedDetailScreen() {
  const market = useMarket()
  const { id } = useParams()
  const [openDetails, setOpenDetails] = useState(false)
  const followed = useFollowedPersons()
  const brokerId = useBroker()

  const { state, data, error, retry } = useAsync(async () => {
    const [disclosures, stocks, meta, sparklines] = await Promise.all([
      getDisclosures(), getStocks(), getMeta(), getSparklines().catch(() => ({})),
    ])
    return { disclosures, stocks, meta, sparklines }
  })

  const d = useMemo(() => data?.disclosures.find((x) => x.id === id) ?? null, [data, id])

  // 같은 인물의 다른 거래 / 같은 종목의 내부자 동향
  const context = useMemo(() => {
    if (!data || !d) return null
    const cutoff90 = daysAgoKey(90)
    const samePerson = data.disclosures.filter(
      (x) => x.personName === d.personName && x.company === d.company && x.id !== d.id,
    )
    const sameStock90 = data.disclosures.filter((x) => x.stockCode === d.stockCode && x.tradeDate >= cutoff90)
    const net90 = sameStock90.reduce(
      (a, x) => (x.totalAmount === null ? a : a + (x.direction === 'buy' ? x.totalAmount : -x.totalAmount)),
      0,
    )
    return { samePerson, sameStock90, net90, stock: data.stocks.find((s) => s.code === d.stockCode) ?? null }
  }, [data, d])

  useEffect(() => {
    if (d) pushRecent({ kind: 'stock', id: d.stockCode, label: d.company })
  }, [d])

  const effectiveState = state

  if (effectiveState === 'loading') {
    return (
      <Screen title="공시 상세" showBack>
        <LoadingState rows={3} />
      </Screen>
    )
  }
  if (effectiveState === 'error') {
    return (
      <Screen title="공시 상세" showBack>
        <ErrorState message={error?.message} onRetry={retry} />
      </Screen>
    )
  }
  if (!d) {
    return (
      <Screen title="공시 상세" showBack>
        <EmptyState
          icon="search_off"
          title="이 공시를 찾을 수 없습니다"
          micro="수집 범위를 벗어났을 수 있습니다"
          actionLabel="홈으로"
          actionTo="/home"
        />
      </Screen>
    )
  }

  const pKey = personKey(d.personName, d.company)
  const spark = data?.sparklines ? (data.sparklines as Record<string, any>)[d.stockCode] ?? null : null
  const lag = daysBetween(d.tradeDate, d.discloseDate)
  const broker = findBroker(brokerId)
  const brokerLink = brokerHref(broker)

  return (
    <Screen title="공시 상세" showBack>
      {/* ⑥ 예고 배너 — 해당 건일 때만, 좌측 4px ink 바 */}
      {d.isPlanned && (
        <div className={styles.banner}>
          <div className={styles.bannerBar} aria-hidden="true" />
          <div>
            <p className="ty-label" style={{ margin: 0 }}>
              사전 공시된 거래 계획{d.dDay !== null ? ` · D-${d.dDay}` : ''}
            </p>
            <p className="ty-caption" style={{ margin: 0 }}>
              {formatDate(d.tradeDate)}부터 거래할 계획을 미리 알린 공시입니다. 실제 거래는 달라질 수 있습니다.
            </p>
          </div>
        </div>
      )}

      {/* ① 거래 요약 */}
      <section>
        <div className={styles.head}>
          <div>
            <h2 className="ty-title" style={{ margin: 0 }}>
              {d.personName}
            </h2>
            <p className="ty-caption" style={{ margin: 0 }}>
              {d.company}
              {d.title ? ` · ${d.title}` : ''}
              {d.isAmended ? ' · 정정공시' : ''}
            </p>
          </div>
          <FollowChip following={followed.includes(pKey)} onToggle={() => toggleFollowPerson(pKey)} />
        </div>

        <p className={`ty-body ${styles.summary}`}>
          <span className={d.direction === 'buy' ? styles.buy : styles.sell}>
            {d.direction === 'buy' ? '매수' : '매도'}
          </span>{' '}
          {d.unitPrice !== null ? (
            <>
              <Emph>{formatPrice(d.unitPrice)}</Emph> × <Emph>{formatQuantity(d.quantity)}</Emph>
            </>
          ) : (
            <Emph>{formatQuantity(d.quantity)}</Emph>
          )}
        </p>

        {d.totalAmount !== null ? (
          <Promote label={d.isPlanned ? '계획 금액' : '총 거래금액'} value={formatAmountFull(d.totalAmount)} />
        ) : d.amountRange ? (
          <>
            {/* 미 의회 신고는 정확한 금액이 없다. 구간을 **구간 그대로** 승격해 보여주고,
                무엇인지 라벨로 못박는다. 중간값 하나로 바꾸면 없는 정밀도를 지어내는 것이다 */}
            <Promote label="신고 금액 구간" value={formatAmountRange(d.amountRange)} />
            <p className="ty-caption" style={{ margin: 'var(--space-2) 0 0' }}>
              미 의회 신고는 정확한 금액을 요구하지 않습니다. 11개 구간 중 하나로만 공개되며,
              거래 주식 수도 신고 대상이 아닙니다.
            </p>
          </>
        ) : (
          <p className="ty-caption" style={{ margin: 0 }}>
            공시에 단가가 없거나 매수·매도가 섞여 있어 총액을 계산하지 않았습니다. 아래 세부변동내역을 확인하세요.
          </p>
        )}

        <div style={{ marginTop: 'var(--space-4)' }}>
          <StockInfoList
            items={[
              { term: '거래일', value: formatDate(d.tradeDate) },
              { term: '공시일', value: formatDate(d.discloseDate) },
              { term: '시차', value: lag !== null && lag >= 0 ? `${lag}일` : null },
              { term: '보고사유', value: d.reportReason || null },
              // 본인 거래가 아니면 반드시 밝힌다 — 배우자 거래를 본인 것으로 읽히게 두면 오보다
              {
                term: '계좌 명의',
                value: d.ownerType && d.ownerType !== 'self' ? `${ownerLabel(d.ownerType)} 명의` : null,
              },
              {
                term: '보유 변화',
                // 의회 신고에는 보유량이 없어 둘 다 null 이다. 그때는 행 자체를 숨긴다
                value: d.holdingAfter !== null || d.holdingBefore !== null
                  ? `${(d.holdingBefore ?? 0).toLocaleString()} → ${(d.holdingAfter ?? 0).toLocaleString()}주`
                  : null,
              },
            ]}
          />
        </div>
      </section>

      {/* ② 세부변동내역 — 접힘. 미 의회 신고는 세부내역 자체가 없어 섹션을 숨긴다 */}
      {d.details.length > 0 && (
      <section>
        <button type="button" className={styles.disclosureToggle} onClick={() => setOpenDetails((o) => !o)}>
          <span className="ty-title-s">세부 변동내역 ({d.details.length}건)</span>
          <Icon name={openDetails ? 'expand_less' : 'expand_more'} size="sm" />
        </button>
        {openDetails && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className="ty-caption">변동일</th>
                  <th className="ty-caption">단가</th>
                  <th className="ty-caption">수량</th>
                </tr>
              </thead>
              <tbody>
                {d.details.map((t, i) => (
                  <tr key={`${t.date}-${i}`}>
                    <td className="ty-num">{formatDate(t.date)}</td>
                    <td className="ty-num">{t.price === null ? '미기재' : formatPrice(t.price)}</td>
                    <td className={`ty-num ${t.qty < 0 ? styles.sell : styles.buy}`}>
                      {t.qty > 0 ? '+' : ''}
                      {t.qty.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

      {/* ③ 인물 컨텍스트 */}
      {context && context.samePerson.length > 0 && (
        <section>
          <SectionHeader title="이 인물의 다른 거래" note={`${context.samePerson.length}건`} />
          {context.samePerson.slice(0, 5).map((x) => (
            <Link key={x.id} to={`/feed/${x.id}`} className={styles.miniRow}>
              <span className="ty-body-s">{formatDate(x.tradeDate)}</span>
              <span className={`ty-body-s ${x.direction === 'buy' ? styles.buy : styles.sell}`}>
                {x.direction === 'buy' ? '매수' : '매도'}
              </span>
              <span className="ty-num" style={{ marginInlineStart: 'auto' }}>
                {formatAmountShort(x.totalAmount) ?? formatQuantity(x.quantity)}
              </span>
            </Link>
          ))}
          <Link to={`/person/${encodeURIComponent(pKey)}`} className="ty-label tap-safe">
            인물 프로필 보기
          </Link>
        </section>
      )}

      {/* ④ 종목 정보 — 시세 소스 미연결이면 안내만 */}
      <section>
        <SectionHeader
          title="종목 정보"
          note={<Link to={`/stock/${d.stockCode}`} className="ty-caption tap-safe">종목 페이지</Link>}
        />
        {/* 현재가 — 공시 단가와 비교하는 기준점이라 위로 올린다 */}
        {context?.stock?.prevClose != null && (
          <div className={styles.priceBlock}>
            <span className="ty-amount">{formatPrice(context.stock.prevClose)}</span>
            {context.stock.change !== null && (
              <span className={`ty-body-s ${context.stock.change >= 0 ? styles.buy : styles.sell}`}>
                {context.stock.change >= 0 ? '+' : ''}{context.stock.change}%
              </span>
            )}
            {context.stock.priceAsOf && (
              <span className="ty-micro">{formatDate(context.stock.priceAsOf)} 종가</span>
            )}
          </div>
        )}

        {spark && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <Sparkline
              data={spark}
              priceAsOf={context?.stock?.priceAsOf ? formatDate(context.stock.priceAsOf) : null}
            />
          </div>
        )}

        <StockInfoList
          items={[
            { term: '종목명', value: context?.stock?.name ?? d.company },
            { term: '종목코드', value: d.stockCode },
            { term: '시장', value: context?.stock?.market ?? null },
            { term: '시가총액', value: formatAmountShort(context?.stock?.marketCap ?? null) },
            { term: '52주 최고', value: formatPrice(context?.stock?.high52 ?? null) },
            { term: '52주 최저', value: formatPrice(context?.stock?.low52 ?? null) },
          ]}
        />
      </section>

      {/* ⑤ 내부자 동향 */}
      {context && context.sameStock90.length > 1 && (
        <section>
          <SectionHeader title="이 종목 내부자 동향" note="최근 90일" />
          <StockInfoList
            items={[
              { term: '공시 건수', value: `${context.sameStock90.length}건` },
              {
                term: '순매수 합계',
                value: context.net90 === 0 ? null : formatAmountShort(Math.abs(context.net90)) + (context.net90 > 0 ? ' 순매수' : ' 순매도'),
              },
            ]}
          />
          <p className="ty-micro" style={{ marginTop: 'var(--space-2)' }}>
            집계 기준: 단가가 확인된 공시만 합산한 빅보드 계산값입니다.
          </p>
        </section>
      )}

      {/* ⑦ 액션 + 고지문 + 원문 */}
      <section className={styles.actions}>
        {/*
          증권사 바로가기는 **국장에만** 붙인다.
          BROKERS 는 국내 증권사 목록이라 미국 종목을 들고 그 앱을 열어도 할 수 있는 게 없다.
          없는 기능을 버튼으로 두면 신뢰를 잃는다. (규칙 1 — 아웃링크만, 주문 정보 전달 금지)
        */}
        {market === 'kr' &&
          (brokerLink ? (
            <Button block href={brokerLink}>
              {brokerActionLabel(broker)}
            </Button>
          ) : (
            <Button block to="/settings">
              거래할 증권사 선택하기
            </Button>
          ))}
        <Disclaimer />
        <Button variant="secondary" block href={d.sourceUrl}>
          {/* 출처가 시장마다 다르다. '미장인데 DART' 는 그냥 거짓말이다 */}
          {sourceLabel(d.sourceUrl)} 원문 보기
        </Button>
        <Button
          variant="text"
          onClick={() => {
            const text = `${d.personName} · ${d.company} ${d.direction === 'buy' ? '매수' : '매도'} — 빅보드`
            if (navigator.share) void navigator.share({ title: '빅보드', text, url: location.href })
            else void navigator.clipboard?.writeText(`${text}\n${location.href}`)
          }}
        >
          <Icon name="share" size="sm" /> 공유
        </Button>
      </section>

      <footer className={homeStyles.footer}>
        {data?.meta && <FreshnessLabel lastUpdated={data.meta.lastUpdated} />}
      </footer>
    </Screen>
  )
}
