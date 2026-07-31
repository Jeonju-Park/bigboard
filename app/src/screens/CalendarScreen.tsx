import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import Screen from '@/shared/components/Screen'
import Icon from '@/shared/components/Icon'
import { SortBar } from '@/shared/components/Controls'
import { OptionSheet } from '@/shared/components/BottomSheet'
import {
  Disclaimer, EmptyState, ErrorState, FreshnessLabel, LoadingState, SectionHeader,
} from '@/shared/components/Feedback'
import { getDisclosures, getMeta } from '@/lib/data'
import { useAsync } from '@/lib/useData'
import { formatAmountShort, formatDate, formatQuantity } from '@/lib/format'
import { SORT_OPTIONS, sortDisclosures, sortLabel, type SortKey } from '@/lib/sort'
import homeStyles from './HomeScreen.module.css'
import styles from './CalendarScreen.module.css'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const iso = (d: Date) => d.toISOString().slice(0, 10)

/**
 * S6 캘린더 — 월 달력이 먼저, 날짜를 고르면 그 날의 예고 리스트.
 *
 * 예고(거래계획 사전공시)는 '앞으로 벌어질 일'이라 달력이 자연스러운 그릇이다.
 * 스트립만 있으면 이번 주 밖은 안 보여서 월 단위로 바꿨다.
 */
export default function CalendarScreen() {
  const today = iso(new Date())
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [selected, setSelected] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('recent')
  const [sheetOpen, setSheetOpen] = useState(false)

  const { state, data, error, retry } = useAsync(async () => {
    const [disclosures, meta] = await Promise.all([getDisclosures(), getMeta()])
    return { disclosures, meta }
  })

  /** 예정 거래일별 예고 건수 */
  const byDate = useMemo(() => {
    const map = new Map<string, typeof planned>()
    const planned = data?.disclosures.filter((d) => d.isPlanned) ?? []
    for (const d of planned) {
      if (!map.has(d.tradeDate)) map.set(d.tradeDate, [])
      map.get(d.tradeDate)!.push(d)
    }
    return map
  }, [data])

  /** 달력 격자 — 앞뒤 빈칸 포함 */
  const grid = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1)
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
    const lead = first.getDay()
    const cells: ({ date: string; day: number } | null)[] = Array.from({ length: lead }, () => null)
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ date: iso(new Date(cursor.year, cursor.month, day)), day })
    }
    return cells
  }, [cursor])

  const monthCount = useMemo(
    () => grid.reduce((a, c) => a + (c ? (byDate.get(c.date)?.length ?? 0) : 0), 0),
    [grid, byDate],
  )

  const dayList = useMemo(() => {
    if (!selected) return []
    return sortDisclosures(byDate.get(selected) ?? [], sort)
  }, [selected, byDate, sort])

  const shiftMonth = (delta: number) => {
    setSelected(null)
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  return (
    <Screen title="캘린더" tight>
      {state === 'loading' && <LoadingState rows={3} />}
      {state === 'error' && <ErrorState message={error?.message} onRetry={retry} />}

      {state === 'ready' && (
        <>
          <section className={styles.calendar}>
            <div className={styles.monthNav}>
              <button type="button" className={styles.navBtn} onClick={() => shiftMonth(-1)} aria-label="이전 달">
                <Icon name="chevron_left" size="sm" />
              </button>
              <h2 className="ty-title-s" style={{ margin: 0 }}>
                {cursor.year}년 {cursor.month + 1}월
              </h2>
              <button type="button" className={styles.navBtn} onClick={() => shiftMonth(1)} aria-label="다음 달">
                <Icon name="chevron_right" size="sm" />
              </button>
            </div>

            <div className={styles.weekHead} aria-hidden="true">
              {WEEKDAYS.map((w) => (
                <span key={w} className="ty-micro">{w}</span>
              ))}
            </div>

            <div className={styles.grid} role="grid" aria-label="예고 거래 달력">
              {grid.map((cell, i) =>
                cell === null ? (
                  <span key={`empty-${i}`} />
                ) : (
                  <button
                    key={cell.date}
                    type="button"
                    role="gridcell"
                    aria-selected={selected === cell.date}
                    aria-label={`${formatDate(cell.date)} 예고 ${byDate.get(cell.date)?.length ?? 0}건`}
                    className={`${styles.cell} ${cell.date === today ? styles.todayCell : ''}`}
                    disabled={!byDate.has(cell.date)}
                    onClick={() => setSelected((s) => (s === cell.date ? null : cell.date))}
                  >
                    <span className="ty-num">{cell.day}</span>
                    {byDate.has(cell.date) && (
                      <span className={`ty-micro ${styles.dot}`}>{byDate.get(cell.date)!.length}</span>
                    )}
                  </button>
                ),
              )}
            </div>

            <p className="ty-caption" style={{ margin: 0 }}>
              이 달 예고 {monthCount}건 · 날짜를 누르면 상세가 열립니다
            </p>
          </section>

          {selected ? (
            dayList.length ? (
              <section>
                <SectionHeader title={`${formatDate(selected)} 예고`} note={`${dayList.length}건`} />
                <SortBar count={dayList.length} sortLabel={sortLabel(sort)} onOpenSort={() => setSheetOpen(true)} />
                <ul className={styles.list}>
                  {dayList.map((d) => (
                    <li key={d.id}>
                      <Link to={`/feed/${d.id}`} className={styles.item}>
                        <div className={styles.bar} aria-hidden="true" />
                        <div className={styles.itemBody}>
                          <p className={styles.itemHead}>
                            <span className={`ty-label ${d.direction === 'buy' ? styles.buy : styles.sell}`}>
                              {d.direction === 'buy' ? '매수' : '매도'} 예정
                            </span>
                            {d.dDay !== null && <span className={`ty-micro ${styles.dday}`}>D-{d.dDay}</span>}
                          </p>
                          <p className={`ty-label ${styles.ellipsis}`} style={{ margin: 0 }}>{d.company}</p>
                          <p className="ty-caption" style={{ margin: 0 }}>{d.personName}</p>
                        </div>
                        <span className="ty-amount">
                          {formatAmountShort(d.totalAmount) ?? formatQuantity(d.quantity)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="ty-micro" style={{ marginTop: 'var(--space-3)' }}>
                  사전공시는 계획일 뿐이며 실제 거래는 달라질 수 있습니다. 철회된 계획은 제외됩니다.
                </p>
              </section>
            ) : null
          ) : (
            <EmptyState
              icon="event_note"
              title="날짜를 선택하세요"
              micro={monthCount > 0 ? '숫자가 붙은 날에 예고가 있습니다' : '이 달에는 예고된 거래가 없습니다'}
            />
          )}
        </>
      )}

      <footer className={homeStyles.footer}>
        {data?.meta && <FreshnessLabel lastUpdated={data.meta.lastUpdated} />}
        <Disclaimer compact />
      </footer>

      <OptionSheet
        open={sheetOpen} title="정렬" options={SORT_OPTIONS} value={sort}
        onSelect={setSort} onClose={() => setSheetOpen(false)}
      />
    </Screen>
  )
}
