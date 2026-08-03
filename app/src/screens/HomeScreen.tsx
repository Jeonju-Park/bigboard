import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import Screen from '@/shared/components/Screen'
import { AppBarAction } from '@/shared/components/AppBar'
import DisclosureCard from '@/shared/components/DisclosureCard'
import { SegmentTab, FilterChips, DropdownChip, SortBar } from '@/shared/components/Controls'
import { OptionSheet } from '@/shared/components/BottomSheet'
import {
  Disclaimer, EmptyState, ErrorState, FreshnessLabel, LoadingState, StaleBanner,
} from '@/shared/components/Feedback'
import { getDisclosures, getMeta, getPersons } from '@/lib/data'
import { officialsByStockValue } from '@/lib/officials'
import { personHeadline } from '@/lib/person'
import { useAsync } from '@/lib/useData'
import { useMarket, type Market } from '@/lib/market'
import { useFollowedPersons, useFollowedStocks } from '@/lib/follow'
import { formatAmountShort, formatDate, formatDateGroup } from '@/lib/format'
import { personKey } from '@/lib/keys'
import {
  PERIOD_OPTIONS, SORT_OPTIONS, filterByPeriod, periodLabel, sortDisclosures, sortLabel,
  unknownAmountCount, type PeriodKey, type SortKey,
} from '@/lib/sort'
import type { Disclosure } from '@/lib/types'
import { todayKey } from '@/lib/date'
import styles from './HomeScreen.module.css'

const SEGMENTS = [
  { value: 'breaking', label: '속보' },
  { value: 'following', label: '팔로우' },
] as const
type Segment = (typeof SEGMENTS)[number]['value']

const FILTERS = [
  { value: 'buy', label: '매수만' },
  { value: 'sell', label: '매도만' },
  { value: 'big', label: '대형' },
  { value: 'planned', label: '예고' },
] as const
type Filter = (typeof FILTERS)[number]['value']

/**
 * '대형' 기준은 시장마다 다르다. 원화 10억을 달러 데이터에 그대로 대면
 * \$10억(=1.3조원) 이상만 걸려 사실상 아무것도 안 남는다.
 * 라벨도 값과 함께 바뀌어야 한다 — 칩에 '10억+'라 써 놓고 달러로 거르면 거짓말이다.
 */
const BIG_THRESHOLD: Record<Market, { value: number; label: string }> = {
  kr: { value: 1_000_000_000, label: '10억+' },
  us: { value: 1_000_000, label: '$1M+' },
}

const PAGE = 20

/** S1 홈 — 세그먼트 + 기간·유형 필터 + 정렬 + 날짜 그룹 리스트 */
export default function HomeScreen() {
  const market = useMarket()
  const [segment, setSegment] = useState<Segment>('breaking')
  const [filters, setFilters] = useState<Filter[]>([])
  const [period, setPeriod] = useState<PeriodKey>('all')
  const [sort, setSort] = useState<SortKey>('recent')
  const [sheet, setSheet] = useState<'period' | 'sort' | null>(null)
  const [limit, setLimit] = useState(PAGE)

  const followedPersons = useFollowedPersons()
  const followedStocks = useFollowedStocks()

  const { state, data, error, retry } = useAsync(async () => {
    const [disclosures, meta, persons] = await Promise.all([
      getDisclosures(),
      getMeta(),
      getPersons(),
    ])
    return { disclosures, meta, persons }
  })

  /**
   * 공직자 재산공개.
   *
   * 피드에 카드로 섞지 않는다 — 재산공개는 **보유 스냅샷**이고 피드는 시간순
   * 거래 중계다. 섞으면 거래한 적 없는 사람이 오늘 거래한 것처럼 보인다.
   * 대신 피드 위에 별도 블록을 두고 공개일을 항상 붙인다.
   */
  const officials = useMemo(
    () => (data ? officialsByStockValue(data.persons).slice(0, 8) : []),
    [data],
  )

  const filtered = useMemo(() => {
    if (!data) return []
    let list = data.disclosures

    if (segment === 'following') {
      list = list.filter(
        (d) => followedPersons.includes(personKey(d.personName, d.company)) || followedStocks.includes(d.stockCode),
      )
    }
    list = filterByPeriod(list, period)
    // 칩은 OR 가 아니라 AND 로 좁힌다 — "매수만 + 예고" = 예고된 매수
    if (filters.includes('buy')) list = list.filter((d) => d.direction === 'buy')
    if (filters.includes('sell')) list = list.filter((d) => d.direction === 'sell')
    // 금액을 모르는 건은 '대형'에서 제외한다 — 0 으로 간주하면 거짓이 된다
    if (filters.includes('big'))
      list = list.filter((d) => {
        // 구간 신고(미장 의회)는 하한으로 판정한다 — 정렬과 같은 기준
        const v = d.totalAmount ?? d.amountRange?.min ?? null
        return v !== null && v >= BIG_THRESHOLD[market].value
      })
    if (filters.includes('planned')) list = list.filter((d) => d.isPlanned)
    return sortDisclosures(list, sort)
  }, [data, segment, filters, period, sort, followedPersons, followedStocks])

  const visible = filtered.slice(0, limit)

  /**
   * 날짜 그룹 헤더는 '최신순'일 때만 의미가 있다.
   * 금액순이면 날짜가 뒤섞여 그룹이 잘게 쪼개지므로 한 덩어리로 보여준다.
   */
  const groups = useMemo(() => {
    if (sort !== 'recent') return [{ date: 'all', label: null as string | null, items: visible }]
    const todayIso = todayKey()
    const map = new Map<string, Disclosure[]>()
    for (const d of visible) {
      if (!map.has(d.discloseDate)) map.set(d.discloseDate, [])
      map.get(d.discloseDate)!.push(d)
    }
    return [...map.entries()].map(([date, items]) => ({
      date, label: formatDateGroup(date, todayIso) as string | null, items,
    }))
  }, [visible, sort])

  const isEmpty = state === 'ready' && filtered.length === 0
  const resetFilters = () => { setFilters([]); setPeriod('all'); setLimit(PAGE) }
  const unknownCount = sort === 'recent' ? 0 : unknownAmountCount(filtered)

  return (
    <Screen title="홈" wordmark tight actions={<AppBarAction icon="search" label="검색" to="/search" />}>
      <div className={styles.controls}>
        <SegmentTab label="공시 목록 종류" options={SEGMENTS} value={segment} onChange={setSegment} />
        <div className={styles.chipRow}>
          <DropdownChip label={periodLabel(period)} active={period !== 'all'} onOpen={() => setSheet('period')} />
          <FilterChips
            label="공시 필터"
            /* '대형'의 기준 금액은 시장마다 다르므로 라벨에 실제 기준을 붙인다.
               기준을 숨기면 이용자가 무엇으로 걸러졌는지 알 수 없다 */
            options={FILTERS.map((f) =>
              f.value === 'big' ? { ...f, label: `대형 ${BIG_THRESHOLD[market].label}` } : f,
            )}
            selected={filters}
            onToggle={(v) => {
              setFilters((f) => (f.includes(v) ? f.filter((x) => x !== v) : [...f, v]))
              setLimit(PAGE)
            }}
            bare
          />
        </div>
        {state === 'ready' && !isEmpty && (
          <SortBar count={filtered.length} sortLabel={sortLabel(sort)} onOpenSort={() => setSheet('sort')} />
        )}
      </div>

      {data?.meta && <StaleBanner lastUpdated={data.meta.lastUpdated} />}

      {state === 'loading' && <LoadingState rows={4} />}
      {state === 'error' && <ErrorState message={error?.message} onRetry={retry} />}

      {/* 공직자 재산공개 — 피드가 아니라 그 위의 독립 블록.
          거래 기록이 아니라 보유 스냅샷이라 시간순 피드에 섞을 수 없다 */}
      {state === 'ready' && segment === 'breaking' && officials.length > 0 && (
        <section className={styles.officials}>
          <div className={styles.officialsHead}>
            <h2 className="ty-title-s" style={{ margin: 0 }}>고위공직자 재산공개</h2>
            <Link to="/explore" className={`ty-caption ${styles.officialsMore}`}>
              전체 보기
            </Link>
          </div>
          <p className="ty-caption" style={{ margin: 0 }}>
            {data?.meta.officialsAsOf ? `${formatDate(data.meta.officialsAsOf)}에 공개된 ` : ''}
            보유 주식입니다. 거래 내역이 아닙니다.
          </p>
          <ul className={styles.officialsRow}>
            {officials.map((p) => {
              const h = personHeadline(p)
              return (
                <li key={p.id}>
                  <Link to={`/person/${encodeURIComponent(p.id)}`} className={styles.officialCard}>
                    <span className={`ty-micro ${styles.officialBadge}`}>공직자</span>
                    <span className={`ty-label ${styles.officialName}`}>{p.name}</span>
                    <span className="ty-caption">{p.company}</span>
                    {h.amount !== null && (
                      <span className={`ty-num ${styles.officialAmount}`}>
                        {formatAmountShort(h.amount)}
                      </span>
                    )}
                    <span className="ty-micro">{p.holdings.length}종목</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {state === 'ready' && isEmpty && (segment === 'following' ? (
        <EmptyState
          icon="person_add"
          title="아직 아무도 팔로우하지 않으셨네요"
          micro="큰손들은 기다려주지 않습니다만,"
          actionLabel="탐색에서 팔로우하기"
          actionTo="/explore"
        />
      ) : (
        <EmptyState
          icon="filter_alt_off"
          title="조건에 맞는 공시가 없습니다"
          micro="필터를 조금 풀어보시죠"
          actionLabel="필터 초기화"
          onAction={resetFilters}
        />
      ))}

      {state === 'ready' && !isEmpty && (
        <div className={styles.list}>
          {unknownCount > 0 && (
            <p className="ty-micro" style={{ margin: 0 }}>
              단가가 공시되지 않은 {unknownCount.toLocaleString()}건은 금액을 알 수 없어 맨 뒤에 두었습니다
            </p>
          )}

          {groups.map((g) => (
            <section key={g.date} className={styles.group}>
              {g.label && <h2 className={`ty-caption ${styles.groupHead}`}>{g.label}</h2>}
              <div className={styles.cards}>
                {g.items.map((d) => <DisclosureCard key={d.id} d={d} />)}
              </div>
            </section>
          ))}

          {limit < filtered.length ? (
            <button type="button" className={`ty-body ${styles.more}`} onClick={() => setLimit((l) => l + PAGE)}>
              더 보기 ({(filtered.length - limit).toLocaleString()}건 남음)
            </button>
          ) : (
            <p className={`ty-micro ${styles.end}`}>여기까지가 수집된 전부입니다</p>
          )}
        </div>
      )}

      <footer className={styles.footer}>
        {data?.meta && <FreshnessLabel lastUpdated={data.meta.lastUpdated} />}
        <Disclaimer compact />
      </footer>

      <OptionSheet
        open={sheet === 'period'} title="기간" options={PERIOD_OPTIONS} value={period}
        onSelect={(v) => { setPeriod(v); setLimit(PAGE) }} onClose={() => setSheet(null)}
      />
      <OptionSheet
        open={sheet === 'sort'} title="정렬" options={SORT_OPTIONS} value={sort}
        onSelect={(v) => { setSort(v); setLimit(PAGE) }} onClose={() => setSheet(null)}
      />
    </Screen>
  )
}
