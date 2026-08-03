import { Link } from 'react-router'
import type { OfficialHolder } from '@/lib/officials'
import { formatDate, formatQuantity } from '@/lib/format'
// ⚠️ 일부러 DisclosureCard 의 스타일시트를 그대로 쓴다.
//    클래스를 새로 만들면 '비슷하지만 미묘하게 다른' 카드가 되고,
//    한쪽 여백을 고칠 때 다른 쪽이 따라오지 않는다. 형식 통일은 스타일 공유가 답이다.
import styles from './DisclosureCard.module.css'

/**
 * HoldingCard — 공직자 보유를 DisclosureCard 와 **같은 위계**로 보여준다.
 *
 *   1행  누가       인물명 + '공직자' 배지
 *   2행  어디       소속 · 직위
 *   3행  얼마       '보유' 태그 + **수량(ty-amount)**
 *   4행  어떻게     명의별 내역 (금액의 근거 자리)
 *   5행  언제       공개일 · 보유 종목 수
 *
 * 다만 **거래 카드가 아니다.** 재산공개는 보유 스냅샷이라 매수/매도 색(빨강·파랑)을
 * 쓰지 않는다. 방향이 없는 데이터에 방향 색을 칠하면 거래로 읽힌다.
 */
export default function HoldingCard({ holder }: { holder: OfficialHolder }) {
  const { person, lots, total } = holder
  const asOf = person.officialAssets?.[0]?.asOf ?? null

  return (
    <Link to={`/person/${encodeURIComponent(person.id)}`} className={styles.card}>
      <div className={styles.head}>
        <p className={`ty-label ${styles.person}`}>{person.name}</p>
        <div className={styles.badges}>
          <span className={`ty-micro ${styles.flag}`}>공직자</span>
        </div>
      </div>

      <p className={`ty-caption ${styles.company}`}>
        {person.company}
        {person.title ? ` · ${person.title}` : ''}
      </p>

      <div className={styles.amountRow}>
        <span className="ty-label">보유</span>
        <span className={`ty-amount ${styles.amount}`}>{formatQuantity(total)}</span>
      </div>

      <p className={`ty-body-s ${styles.basis}`}>
        {/* 명의가 본인 하나뿐이면 굳이 반복하지 않는다.
            그 외에는 반드시 편다 — 합계만 보이면 배우자·자녀 보유가 본인 것으로 읽힌다 */}
        {lots.length === 1 && lots[0]?.owner === '본인' ? (
          <span>본인 명의</span>
        ) : (
          <span>
            {lots.map((l) => `${l.owner ?? '명의 미상'} ${formatQuantity(l.quantity)}`).join(' · ')}
          </span>
        )}
      </p>

      <p className={`ty-caption ${styles.meta}`}>
        {asOf && <span>{formatDate(asOf)} 공개</span>}
        <span>보유 {person.holdings.length}종목</span>
      </p>
    </Link>
  )
}
