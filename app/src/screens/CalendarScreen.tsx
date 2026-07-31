import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import Screen from '@/shared/components/Screen'
import Icon from '@/shared/components/Icon'
import { SortBar } from '@/shared/components/Controls'
import { OptionSheet } from '@/shared/components/BottomSheet'
import {
  Disclaimer, ErrorState, FreshnessLabel, LoadingState, SectionHeader,
} from '@/shared/components/Feedback'
import { getDisclosures, getMeta } from '@/lib/data'
import { useAsync } from '@/lib/useData'
import { formatAmountShort, formatDate, formatQuantity } from '@/lib/format'
import { SORT_OPTIONS, sortDisclosures, sortLabel, type SortKey } from '@/lib/sort'
import type { Disclosure } from '@/lib/types'
import { fromDateKey, toDateKey, todayKey } from '@/lib/date'
import homeStyles from './HomeScreen.module.css'
import styles from './CalendarScreen.module.css'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const DAY = 86400000

/**
 * S6 캘린더 — 두 가지 모드.
 *
 *  · 날짜 미선택 → **월 달력**. 이 달 어디에 예고가 몰려 있는지 한눈에 본다
 *  · 날짜 선택   → 달력이 **주간 스트립으로 접히고** 아래에 그 날의 리스트가 펼쳐진다
 *
 * 리스트를 볼 때 월 달력이 그대로 남아 있으면 화면의 3분의 2를 먹어 정작 볼 것이 안 보인다.
 * 접힌 뒤에도 좌우로 날짜를 옮길 수 있어야 하므로 주간 스트립을 남긴다.
 */
export default function CalendarScreen() {
  const today = todayKey()
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

  /** 예정 거래일별 예고 */
  const byDate = useMemo(() => {
    const map = new Map<string, Disclosure[]>()
    for (const d of data?.disclosures ?? []) {
      if (!d.isPlanned) continue
      if (!map.has(d.tradeDate)) map.set(d.tradeDate, [])
      map.get(d.tradeDate)!.push(d)
    }
    return map
  }, [data])

  /** 월 격자 — 앞쪽 빈칸 포함 */
  const monthGrid = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1)
    const days = new Date(cursor.year, cursor.month + 1, 0).getDate()
    const cells: ({ date: string; day: number } | null)[] = Array.from({ length: first.getDay() }, () => null)
    for (let day = 1; day <= days; day++) {
      cells.push({ date: toDateKey(new Date(cursor.year, cursor.month, day)), day })
    }
    return cells
  }, [cursor])

  const monthCount = useMemo(
    () => monthGrid.reduce((a, c) => a + (c ? (byDate.get(c.date)?.length ?? 0) : 0), 0),
    [monthGrid, byDate],
  )

  /** 선택일이 속한 주 7일 */
  const weekStrip = useMemo(() => {
    if (!selected) return []
    const d = fromDateKey(selected)
    const sunday = new Date(d.getTime() - d.getDay() * DAY)
    return Array.from({ length: 7 }, (_, i) => {
      const cur = new Date(sunday.getTime() + i * DAY)
      return { date: toDateKey(cur), day: cur.getDate(), weekday: WEEKDAYS[cur.getDay()] }
    })
  }, [selected])

  const dayList = useMemo(
    () => (selected ? sortDisclosures(byDate.get(selected) ?? [], sort) : []),
    [selected, byDate, sort],
  )

  const shiftMonth = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  const shiftWeek = (delta: number) => {
    if (!selected) return
    const next = toDateKey(new Date(fromDateKey(selected).getTime() + delta * 7 * DAY))
    setSelected(next)
    const d = fromDateKey(next)
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
  }

  return (
    <Screen title="캘린더" tight>
      {state === 'loading' && <LoadingState rows={3} />}
      {state === 'error' && <ErrorState message={error?.message} onRetry={retry} />}

      {state === 'ready' && (
        <>
          {selected ? (
            /* ── 접힌 상태: 주간 스트립 ── */
            <section className={styles.calendar}>
              <div className={styles.monthNav}>
                <button type="button" className={styles.navBtn} onClick={() => shiftWeek(-1)} aria-label="이전 주">
                  <Icon name="chevron_left" size="sm" />
                </button>
                <button
                  type="button"
                  className={styles.monthTitle}
                  onClick={() => setSelected(null)}
                  aria-label="월 달력으로 돌아가기"
                >
                  <span className="ty-title-s">
                    {cursor.year}년 {cursor.month + 1}월
                  </span>
                  <Icon name="expand_more" size="sm" />
                </button>
                <button type="button" className={styles.navBtn} onClick={() => shiftWeek(1)} aria-label="다음 주">
                  <Icon name="chevron_right" size="sm" />
                </button>
              </div>

              <div className={styles.strip} role="group" aria-label="주간 날짜 선택">
                {weekStrip.map((d) => (
                  <button
                    key={d.date}
                    type="button"
                    aria-pressed={selected === d.date}
                    className={`${styles.cell} ${d.date === today ? styles.todayCell : ''}`}
                    disabled={!byDate.has(d.date)}
                    onClick={() => setSelected(d.date)}
                  >
                    <span className="ty-micro">{d.weekday}</span>
                    <span className="ty-num">{d.day}</span>
                    {byDate.has(d.date) && (
                      <span className={`ty-micro ${styles.dot}`}>{byDate.get(d.date)!.length}</span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            /* ── 기본 상태: 월 달력 ── */
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

              <p className={`ty-caption ${styles.hint}`}>
                {monthCount > 0
                  ? `이 달 예고 ${monthCount}건 · 예고가 있는 날을 눌러주세요`
                  : '이 달에는 예고된 거래가 없습니다'}
              </p>

              <div className={styles.weekHead} aria-hidden="true">
                {WEEKDAYS.map((w) => (
                  <span key={w} className="ty-micro">{w}</span>
                ))}
              </div>

              <div className={styles.grid} role="grid" aria-label="예고 거래 달력">
                {monthGrid.map((cell, i) =>
                  cell === null ? (
                    <span key={`empty-${i}`} />
                  ) : (
                    <button
                      key={cell.date}
                      type="button"
                      role="gridcell"
                      aria-label={`${formatDate(cell.date)} 예고 ${byDate.get(cell.date)?.length ?? 0}건`}
                      className={`${styles.cell} ${cell.date === today ? styles.todayCell : ''}`}
                      disabled={!byDate.has(cell.date)}
                      onClick={() => setSelected(cell.date)}
                    >
                      <span className="ty-num">{cell.day}</span>
                      {byDate.has(cell.date) && (
                        <span className={`ty-micro ${styles.dot}`}>{byDate.get(cell.date)!.length}</span>
                      )}
                    </button>
                  ),
                )}
              </div>
            </section>
          )}

          {selected && (
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
