import { Link } from 'react-router'
import type { Disclosure } from '@/lib/types'
import { formatAmountShort, formatDate, formatQuantity, formatWon, daysBetween } from '@/lib/format'
import styles from './DisclosureCard.module.css'

/**
 * DisclosureCard — 홈 피드의 기본 단위.
 *
 * 위계(위→아래):
 *   1행  누가       인물명(label) + 회사·직위(caption) + 예고/정정 배지
 *   2행  얼마       방향 태그 + **금액(ty-amount)** ← 이 카드에서 가장 큰 값
 *   3행  어떻게     단가 × 수량 (금액의 근거)
 *   4행  언제       거래일 · 시차
 *
 * 이전에는 금액이 본문과 같은 크기라 "무엇을 먼저 볼지"가 없었다.
 * 사용자가 스캔하는 축은 금액이므로 금액을 한 단계 승격하고 근거를 그 아래로 내렸다.
 *
 * 표기 원칙: 단가·총액이 없는 건(무상증여·복수단가·혼합보고서)은 줄을 숨긴다. 0 을 지어내지 않는다.
 */
export default function DisclosureCard({ d }: { d: Disclosure }) {
  const amount = formatAmountShort(d.totalAmount)
  const price = formatWon(d.unitPrice)
  const qty = formatQuantity(d.quantity)
  const lag = daysBetween(d.tradeDate, d.discloseDate)
  const isBuy = d.direction === 'buy'

  return (
    <Link to={`/feed/${d.id}`} className={styles.card}>
      <div className={styles.head}>
        <p className={`ty-label ${styles.person}`}>{d.personName}</p>
        <div className={styles.badges}>
          {d.isPlanned && <span className={`ty-micro ${styles.flag}`}>예고</span>}
          {d.isAmended && <span className={`ty-micro ${styles.flag}`}>정정</span>}
        </div>
      </div>

      <p className={`ty-caption ${styles.company}`}>
        {d.company}
        {d.title ? ` · ${d.title}` : ''}
      </p>

      <div className={styles.amountRow}>
        <span className={`ty-label ${isBuy ? styles.buy : styles.sell}`}>{isBuy ? '매수' : '매도'}</span>
        {amount ? (
          <span className={`ty-amount ${styles.amount}`}>{amount}</span>
        ) : (
          <span className={`ty-amount ${styles.amount}`}>{qty}</span>
        )}
      </div>

      <p className={`ty-body-s ${styles.basis}`}>
        {price && qty ? (
          <span className="ty-num">
            {price} × {qty}
          </span>
        ) : (
          <span>단가 미기재 · {qty}</span>
        )}
      </p>

      <p className={`ty-caption ${styles.meta}`}>
        <span>거래 {formatDate(d.tradeDate)}</span>
        {d.isPlanned && d.dDay !== null ? (
          <span>예정 D-{d.dDay}</span>
        ) : (
          lag !== null && lag > 0 && <span>공시까지 {lag}일</span>
        )}
        {d.details.length > 1 && <span>세부 {d.details.length}건</span>}
      </p>
    </Link>
  )
}
