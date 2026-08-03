import { useId, useMemo, useState } from 'react'
import type { Sparkline as SparklineData } from '@/lib/types'
import { formatPrice } from '@/lib/format'
import styles from './Sparkline.module.css'

const RANGES = [
  { key: 'm1', label: '1개월' },
  { key: 'm3', label: '3개월' },
  { key: 'y1', label: '1년' },
] as const

type RangeKey = (typeof RANGES)[number]['key']

/**
 * Sparkline — 종가 추이 (차트 라이브러리 금지, IA S2·S4).
 *
 * ⚠️ **0 기준선을 쓰지 않는다.** 주가는 0 에서 시작하지 않으므로 min~max 로 스케일한다.
 *    대신 축 라벨(최고·최저)을 함께 보여줘 "얼마나 오른 것처럼 보이는지"가 과장되지 않게 한다.
 * ⚠️ 선 색은 시맨틱(빨강/파랑)을 쓴다 — 기간 첫 값 대비 마지막 값 기준. 국장 관습(§2).
 *    coral 은 브랜드 면 전용이라 데이터 선에 쓰지 않는다.
 */
export default function Sparkline({ data, priceAsOf }: { data: SparklineData; priceAsOf: string | null }) {
  const [range, setRange] = useState<RangeKey>('m3')
  const gradId = useId()

  const series = data[range] ?? []
  const shape = useMemo(() => {
    if (series.length < 2) return null
    const min = Math.min(...series)
    const max = Math.max(...series)
    const span = max - min || 1
    // viewBox 좌표계. 실제 크기는 CSS 가 정한다
    const W = 100
    const H = 32
    const pts = series.map((v, i) => {
      const x = (i / (series.length - 1)) * W
      const y = H - ((v - min) / span) * H
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    return {
      min, max,
      line: `M${pts.join('L')}`,
      area: `M${pts.join('L')}L${W},${H}L0,${H}Z`,
      up: series[series.length - 1] >= series[0],
    }
  }, [series])

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs} role="group" aria-label="기간 선택">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            aria-pressed={range === r.key}
            className={`ty-caption ${styles.tab}`}
            onClick={() => setRange(r.key)}
            disabled={(data[r.key] ?? []).length < 2}
          >
            {r.label}
          </button>
        ))}
      </div>

      {shape ? (
        <>
          <svg
            className={styles.chart}
            viewBox="0 0 100 32"
            preserveAspectRatio="none"
            role="img"
            aria-label={`${RANGES.find((r) => r.key === range)?.label} 종가 추이. 최저 ${shape.min.toLocaleString()}원, 최고 ${shape.max.toLocaleString()}원`}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g className={shape.up ? styles.up : styles.down}>
              <path d={shape.area} fill={`url(#${gradId})`} />
              <path d={shape.line} fill="none" stroke="currentColor" strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
            </g>
          </svg>

          <div className={styles.axis}>
            <span className="ty-micro">최저 {formatPrice(shape.min)}</span>
            <span className="ty-micro">최고 {formatPrice(shape.max)}</span>
          </div>
          <p className="ty-micro" style={{ margin: 0 }}>
            종가 기준{priceAsOf ? ` · ${priceAsOf} 까지` : ''} · 세로축은 기간 내 최저~최고 범위입니다
          </p>
        </>
      ) : (
        <p className="ty-caption" style={{ margin: 0 }}>이 기간의 시세 자료가 없습니다.</p>
      )}
    </div>
  )
}
