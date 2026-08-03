/**
 * MarketSwitch — 국장/미장 전환.
 *
 * 두 가지 모양으로 쓴다.
 *   chip    헤더 로고 옆의 작은 토글 (항상 보이는 전환 경로)
 *   choice  온보딩·설정의 큰 선택 카드 (설명까지 읽고 고르는 자리)
 *
 * 시장이 바뀌면 useAsync 가 전 화면을 다시 로드한다 (lib/useData.ts).
 * 여기서는 값만 바꾸고 데이터 걱정은 하지 않는다.
 */
import { MARKETS, setMarket, useMarket, type Market } from '@/lib/market'
import styles from './MarketSwitch.module.css'

const ORDER: Market[] = ['kr', 'us']

export function MarketChip() {
  const market = useMarket()
  return (
    <div className={styles.chip} role="radiogroup" aria-label="시장 선택">
      {ORDER.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={market === id}
          className={`ty-micro ${styles.chipItem}`}
          onClick={() => setMarket(id)}
        >
          {/* 칩은 좁아서 '국내장' 대신 2글자로 줄인다 */}
          {id === 'kr' ? '국장' : '미장'}
        </button>
      ))}
    </div>
  )
}

export function MarketChoice() {
  const market = useMarket()
  return (
    <div className={styles.choice} role="radiogroup" aria-label="시장 선택">
      {ORDER.map((id) => {
        const m = MARKETS[id]
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={market === id}
            className={styles.card}
            onClick={() => setMarket(id)}
          >
            <span className={`ty-label ${styles.cardTitle}`}>{m.label}</span>
            <span className="ty-caption">{m.description}</span>
            <span className={`ty-micro ${styles.cardActors}`}>{m.actors}</span>
          </button>
        )
      })}
    </div>
  )
}
