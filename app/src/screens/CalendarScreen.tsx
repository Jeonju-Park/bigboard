import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import Screen from '@/shared/components/Screen'
import DevStateToggle from '@/shared/components/DevStateToggle'
import { Num } from '@/shared/components/Num'
import {
  Disclaimer,
  EmptyState,
  ErrorState,
  FreshnessLabel,
  LoadingState,
  SectionHeader,
} from '@/shared/components/Feedback'
import { getDisclosures, getMeta } from '@/lib/data'
import { useAsync, useForcedState } from '@/lib/useData'
import { formatAmountShort, formatDate } from '@/lib/format'
import homeStyles from './HomeScreen.module.css'
import styles from './CalendarScreen.module.css'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/**
 * S6 캘린더 — 주간 스트립 + 예고 리스트.
 * 예고 = 거래계획 사전공시(isPlanned). 좌측 4px ink 바로 구분한다(IA).
 */
export default function CalendarScreen() {
  const [forced, setForced] = useForcedState()
  const [selected, setSelected] = useState<string | null>(null)

  const { state, data, error, retry } = useAsync(async () => {
    const [disclosures, meta] = await Promise.all([getDisclosures(), getMeta()])
    return { disclosures, meta }
  })

  // 예정 거래일이 오늘 이후인 계획 공시만
  const planned = useMemo(() => {
    if (!data) return []
    const today = new Date().toISOString().slice(0, 10)
    return data.disclosures
      .filter((d) => d.isPlanned && d.tradeDate >= today)
      .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate))
  }, [data])

  // 오늘부터 14일치 스트립 — 예고 건수를 함께 보여준다
  const days = useMemo(() => {
    const base = new Date()
    base.setHours(0, 0, 0, 0)
    return Array.from({ length: 14 }, (_, i) => {
      const dt = new Date(base.getTime() + i * 86400000)
      const iso = dt.toISOString().slice(0, 10)
      return { iso, day: dt.getDate(), weekday: WEEKDAYS[dt.getDay()], count: planned.filter((p) => p.tradeDate === iso).length }
    })
  }, [planned])

  const list = selected ? planned.filter((p) => p.tradeDate === selected) : planned
  const effectiveState = forced === 'loading' ? 'loading' : forced === 'error' ? 'error' : state
  const isEmpty = forced === 'empty' || (effectiveState === 'ready' && list.length === 0)

  return (
    <Screen title="캘린더" actions={<DevStateToggle value={forced} onChange={setForced} />}>
      <div className={styles.strip} role="group" aria-label="예고 날짜 선택">
        {days.map((d) => (
          <button
            key={d.iso}
            type="button"
            aria-pressed={selected === d.iso}
            className={styles.day}
            onClick={() => setSelected((s) => (s === d.iso ? null : d.iso))}
          >
            <span className="ty-micro">{d.weekday}</span>
            <span className="ty-num">{d.day}</span>
            <span className={`ty-micro ${styles.count}`}>{d.count > 0 ? `${d.count}` : ''}</span>
          </button>
        ))}
      </div>

      {effectiveState === 'loading' && <LoadingState rows={3} />}
      {effectiveState === 'error' && <ErrorState message={error?.message} onRetry={retry} />}

      {effectiveState === 'ready' && isEmpty && (
        <EmptyState
          icon="event_available"
          title={selected ? `${formatDate(selected)}에 예고된 거래가 없습니다` : '예고된 거래가 없습니다'}
          micro="사전공시는 30일 전에 올라옵니다"
          actionLabel={selected ? '전체 보기' : undefined}
          onAction={selected ? () => setSelected(null) : undefined}
        />
      )}

      {effectiveState === 'ready' && !isEmpty && (
        <section>
          <SectionHeader
            title={selected ? `${formatDate(selected)} 예고` : '예고된 거래'}
            note={`${list.length}건`}
          />
          {list.map((d) => (
            <Link key={d.id} to={`/feed/${d.id}`} className={styles.item}>
              <div className={styles.bar} aria-hidden="true" />
              <div className={styles.itemBody}>
                <p className="ty-label" style={{ margin: 0 }}>
                  {d.personName} <span className="ty-caption">{d.company}</span>
                </p>
                <p className="ty-caption" style={{ margin: 0 }}>
                  {d.direction === 'buy' ? '매수' : '매도'} 예정 · {formatDate(d.tradeDate)}
                  {d.totalAmount !== null && (
                    <>
                      {' · '}
                      <Num>{formatAmountShort(d.totalAmount)}</Num>
                    </>
                  )}
                </p>
              </div>
              {d.dDay !== null && <span className={`ty-num ${styles.dday}`}>D-{d.dDay}</span>}
            </Link>
          ))}
          <p className="ty-micro" style={{ marginTop: 'var(--space-4)' }}>
            사전공시는 계획일 뿐이며 실제 거래는 달라질 수 있습니다. 철회된 계획은 목록에서 제외됩니다.
          </p>
        </section>
      )}

      <footer className={homeStyles.footer}>
        {data?.meta && <FreshnessLabel lastUpdated={data.meta.lastUpdated} />}
        <Disclaimer compact />
      </footer>
    </Screen>
  )
}
