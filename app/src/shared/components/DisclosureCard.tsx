import { Link } from 'react-router'
import type { Disclosure } from '@/lib/types'
import { Emph, Num } from './Num'
import { formatAmountShort, formatDate, formatQuantity, formatWon, daysBetween } from '@/lib/format'
import styles from './DisclosureCard.module.css'

/**
 * DisclosureCard — 홈 피드의 기본 단위.
 *
 * 표기 원칙:
 *  - 단가가 없는 건(무상증여·복수단가)은 "단가 x 수량" 대신 수량만 보여준다. 0 을 지어내지 않는다.
 *  - 총액도 없으면 줄 자체를 숨긴다.
 *  - 위트는 micro 레이어에만. 여기서는 '거래일과 공시일의 시차' 같은 사실을 담담히 적는다.
 */
export default function DisclosureCard({ d }: { d: Disclosure }) {
  const amount = formatAmountShort(d.totalAmount)
  const price = formatWon(d.unitPrice)
  const qty = formatQuantity(d.quantity)
  const lag = daysBetween(d.tradeDate, d.discloseDate)

  return (
    <Link to={`/feed/${d.id}`} className={styles.card}>
      <div className={styles.head}>
        <p className={`ty-label ${styles.person}`}>{d.personName}</p>
        <p className={`ty-caption ${styles.company}`}>
          {d.company}
          {d.title ? ` · ${d.title}` : ''}
        </p>
        <div className={styles.badges}>
          {d.isPlanned && <span className={`ty-micro ${styles.flag}`}>예고</span>}
          {d.isAmended && <span className={`ty-micro ${styles.flag}`}>정정</span>}
        </div>
      </div>

      <p className={`ty-body ${styles.trade}`}>
        <span className={`${styles.direction} ${d.direction === 'buy' ? styles.buy : styles.sell}`}>
          {d.direction === 'buy' ? '매수' : '매도'}
        </span>
        {price && qty ? (
          <span>
            <Emph>{price}</Emph> × <Emph>{qty}</Emph>
          </span>
        ) : (
          qty && <Emph>{qty}</Emph>
        )}
        {amount && (
          <span className={styles.amount}>
            <Num>{amount}</Num>
          </span>
        )}
      </p>

      <p className={`ty-caption ${styles.meta}`}>
        <span>거래 {formatDate(d.tradeDate)}</span>
        {d.isPlanned && d.dDay !== null ? (
          <span>예정 D-{d.dDay}</span>
        ) : (
          lag !== null && lag > 0 && <span>공시까지 {lag}일</span>
        )}
        {!price && <span>단가 미기재</span>}
      </p>

      {d.details.length > 1 && (
        <p className={`ty-micro ${styles.micro}`}>세부 변동 {d.details.length}건이 한 건으로 보고됐습니다</p>
      )}
    </Link>
  )
}
