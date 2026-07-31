import { useMemo, useState } from 'react'
import Screen from '@/shared/components/Screen'
import DisclosureCard from '@/shared/components/DisclosureCard'
import DevStateToggle from '@/shared/components/DevStateToggle'
import { SegmentTab, FilterChips } from '@/shared/components/Controls'
import {
  Disclaimer,
  EmptyState,
  ErrorState,
  FreshnessLabel,
  LoadingState,
  StaleBanner,
} from '@/shared/components/Feedback'
import { getDisclosures, getMeta } from '@/lib/data'
import { useAsync, useForcedState } from '@/lib/useData'
import { useFollowedPersons, useFollowedStocks } from '@/lib/follow'
import { formatDateGroup } from '@/lib/format'
import { personKey } from '@/lib/keys'
import type { Disclosure } from '@/lib/types'
import styles from './HomeScreen.module.css'

const SEGMENTS = [
  { value: 'breaking', label: '속보' },
  { value: 'following', label: '팔로우' },
] as const
type Segment = (typeof SEGMENTS)[number]['value']

const FILTERS = [
  { value: 'buy', label: '매수만' },
  { value: 'sell', label: '매도만' },
  { value: 'big', label: '대형 10억+' },
  { value: 'planned', label: '예고' },
] as const
type Filter = (typeof FILTERS)[number]['value']

const BIG_THRESHOLD = 1_000_000_000
const PAGE = 20

/** S1 홈 — 세그먼트 + 필터 칩 + 날짜 그룹 + 더 보기 */
export default function HomeScreen() {
  const [forced, setForced] = useForcedState()
  const [segment, setSegment] = useState<Segment>('breaking')
  const [filters, setFilters] = useState<Filter[]>([])
  const [limit, setLimit] = useState(PAGE)

  const followedPersons = useFollowedPersons()
  const followedStocks = useFollowedStocks()

  const { state, data, error, retry } = useAsync(async () => {
    const [disclosures, meta] = await Promise.all([getDisclosures(), getMeta()])
    return { disclosures, meta }
  })

  const filtered = useMemo(() => {
    if (!data) return []
    let list = data.disclosures

    if (segment === 'following') {
      list = list.filter(
        (d) => followedPersons.includes(personKey(d.personName, d.company)) || followedStocks.includes(d.stockCode),
      )
    }
    // 칩은 OR 가 아니라 AND 로 좁힌다 — "매수만 + 예고" = 예고된 매수
    if (filters.includes('buy')) list = list.filter((d) => d.direction === 'buy')
    if (filters.includes('sell')) list = list.filter((d) => d.direction === 'sell')
    // 금액을 모르는 건은 '대형'에서 제외한다 — 0 으로 간주하면 거짓이 된다
    if (filters.includes('big')) list = list.filter((d) => d.totalAmount !== null && d.totalAmount >= BIG_THRESHOLD)
    if (filters.includes('planned')) list = list.filter((d) => d.isPlanned)
    return list
  }, [data, segment, filters, followedPersons, followedStocks])

  const visible = filtered.slice(0, limit)

  // 공시일 기준 날짜 그룹 (§4 근접성: 그룹 내 12px, 그룹 간 24px)
  const groups = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10)
    const map = new Map<string, Disclosure[]>()
    for (const d of visible) {
      if (!map.has(d.discloseDate)) map.set(d.discloseDate, [])
      map.get(d.discloseDate)!.push(d)
    }
    return [...map.entries()].map(([date, items]) => ({ date, label: formatDateGroup(date, todayIso), items }))
  }, [visible])

  const effectiveState = forced === 'loading' ? 'loading' : forced === 'error' ? 'error' : state
  const isEmpty = forced === 'empty' || (effectiveState === 'ready' && filtered.length === 0)

  return (
    <Screen title="홈" actions={<DevStateToggle value={forced} onChange={setForced} />}>
      <div className={styles.controls}>
        <SegmentTab label="공시 목록 종류" options={SEGMENTS} value={segment} onChange={setSegment} />
        <FilterChips
          label="공시 필터"
          options={FILTERS}
          selected={filters}
          onToggle={(v) => {
            setFilters((f) => (f.includes(v) ? f.filter((x) => x !== v) : [...f, v]))
            setLimit(PAGE)
          }}
        />
      </div>

      {data?.meta && <StaleBanner lastUpdated={data.meta.lastUpdated} />}

      {effectiveState === 'loading' && <LoadingState rows={4} />}
      {effectiveState === 'error' && <ErrorState message={error?.message} onRetry={retry} />}

      {effectiveState === 'ready' &&
        isEmpty &&
        (segment === 'following' ? (
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
            onAction={() => setFilters([])}
          />
        ))}

      {effectiveState === 'ready' && !isEmpty && (
        <>
          {groups.map((g) => (
            <section key={g.date} className={styles.group}>
              <h2 className={`ty-caption ${styles.groupHead}`}>{g.label}</h2>
              <div className={styles.cards}>
                {g.items.map((d) => (
                  <DisclosureCard key={d.id} d={d} />
                ))}
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
        </>
      )}

      <footer className={styles.footer}>
        {data?.meta && <FreshnessLabel lastUpdated={data.meta.lastUpdated} />}
        <Disclaimer compact />
      </footer>
    </Screen>
  )
}
