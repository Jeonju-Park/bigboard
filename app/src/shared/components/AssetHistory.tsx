import type { OfficialAssetYear } from '@/lib/types'
import { formatAmountShort, formatDate } from '@/lib/format'
import styles from './AssetHistory.module.css'

/**
 * 공직자 재산공개 연혁 — 경량 SVG 막대 (차트 라이브러리 금지, IA S3).
 *
 * ⚠️ 연 1회 공개 자료다. 연도 사이를 선으로 잇지 않는다 —
 *    이어 그리면 그 사이에도 관측값이 있는 것처럼 읽힌다. 막대로 '점'을 찍는다.
 * ⚠️ 주식 평가액이 자료에 없는 해는 막대를 그리지 않고 '미공개'로 표시한다.
 */
export default function AssetHistory({ years }: { years: OfficialAssetYear[] }) {
  if (!years.length) return null
  const sorted = [...years].sort((a, b) => a.year - b.year)
  const max = Math.max(...sorted.map((y) => y.totalAssets))

  return (
    <div className={styles.wrap}>
      <ul className={styles.bars}>
        {sorted.map((y) => {
          const pct = max > 0 ? Math.max(2, Math.round((y.totalAssets / max) * 100)) : 0
          const stockPct = y.stockValue !== null && max > 0 ? Math.round((y.stockValue / max) * 100) : null
          return (
            <li key={y.year} className={styles.col}>
              <span className={`ty-micro ${styles.value}`}>{formatAmountShort(y.totalAssets)}</span>
              <div className={styles.track} title={`${formatDate(y.asOf)} 기준`}>
                <div className={styles.total} style={{ height: `${pct}%` }}>
                  {/* 총재산 안에서 주식이 차지하는 비중 */}
                  {stockPct !== null && (
                    <div className={styles.stock} style={{ height: `${max > 0 ? (stockPct / pct) * 100 : 0}%` }} />
                  )}
                </div>
              </div>
              <span className="ty-micro">{y.year}</span>
            </li>
          )
        })}
      </ul>
      <p className={`ty-micro ${styles.legend}`}>
        <span className={styles.swatchTotal} aria-hidden="true" /> 총재산
        <span className={styles.swatchStock} aria-hidden="true" /> 주식
        {sorted.some((y) => y.stockValue === null) && ' · 주식 평가액이 자료에 없는 해는 표시하지 않습니다'}
      </p>
    </div>
  )
}
