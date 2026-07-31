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
import { getDisclosures, getMeta, getStocks } from '@/lib/data'
import { useAsync } from '@/lib/useData'
import { BROKERS, pushRecent, toggleFollowPerson, useBroker, useFollowedPersons } from '@/lib/follow'
import { personKey } from '@/lib/keys'
import {
  daysBetween,
  formatAmountFull,
  formatAmountShort,
  formatDate,
  formatQuantity,
  formatWon,
} from '@/lib/format'
import homeStyles from './HomeScreen.module.css'
import styles from './FeedDetailScreen.module.css'

/**
 * S2 피드 상세 — IA 가 정한 7개 섹션 순서:
 *  ①거래 요약 ②세부변동내역(접힘) ③인물 컨텍스트 ④종목 정보
 *  ⑤내부자 동향 ⑥예고 배너 ⑦거래 바로가기 + 고지문 + DART 원문 + 공유
 */
export default function FeedDetailScreen() {
  const { id } = useParams()
  const [openDetails, setOpenDetails] = useState(false)
  const followed = useFollowedPersons()
  const brokerId = useBroker()

  const { state, data, error, retry } = useAsync(async () => {
    const [disclosures, stocks, meta] = await Promise.all([getDisclosures(), getStocks(), getMeta()])
    return { disclosures, stocks, meta }
  })

  const d = useMemo(() => data?.disclosures.find((x) => x.id === id) ?? null, [data, id])

  // 같은 인물의 다른 거래 / 같은 종목의 내부자 동향
  const context = useMemo(() => {
    if (!data || !d) return null
    const cutoff90 = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
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
  const lag = daysBetween(d.tradeDate, d.discloseDate)
  const broker = BROKERS.find((b) => b.id === brokerId) ?? BROKERS[0]

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
              <Emph>{formatWon(d.unitPrice)}</Emph> × <Emph>{formatQuantity(d.quantity)}</Emph>
            </>
          ) : (
            <Emph>{formatQuantity(d.quantity)}</Emph>
          )}
        </p>

        {d.totalAmount !== null ? (
          <Promote label={d.isPlanned ? '계획 금액' : '총 거래금액'} value={formatAmountFull(d.totalAmount)} />
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
              {
                term: '보유 변화',
                value: d.holdingAfter || d.holdingBefore
                  ? `${d.holdingBefore.toLocaleString()} → ${d.holdingAfter.toLocaleString()}주`
                  : null,
              },
            ]}
          />
        </div>
      </section>

      {/* ② 세부변동내역 — 접힘 */}
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
                    <td className="ty-num">{t.price === null ? '미기재' : formatWon(t.price)}</td>
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
        <StockInfoList
          items={[
            { term: '종목명', value: context?.stock?.name ?? d.company },
            { term: '종목코드', value: d.stockCode },
            { term: '전일종가', value: context?.stock?.prevClose?.toLocaleString() ?? null },
            { term: '시가총액', value: formatAmountShort(context?.stock?.marketCap ?? null) },
            { term: 'PER', value: context?.stock?.per?.toString() ?? null },
            { term: 'PBR', value: context?.stock?.pbr?.toString() ?? null },
          ]}
        />
        {!data?.meta.priceDataAvailable && (
          <p className="ty-micro" style={{ marginTop: 'var(--space-2)' }}>
            시세 정보는 아직 연결되지 않았습니다. 없는 값을 지어내지 않으려고 해당 항목은 표시하지 않습니다.
          </p>
        )}
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
        {broker.webUrl ? (
          <Button block href={broker.webUrl}>
            {broker.name}으로 이동
          </Button>
        ) : (
          <Button block to="/my">
            거래할 증권사 선택하기
          </Button>
        )}
        <Disclaimer />
        <Button variant="secondary" block href={d.dartUrl}>
          DART 원문 보기
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
