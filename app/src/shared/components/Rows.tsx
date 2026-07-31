import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Person, PersonType, RankingEntry } from '@/lib/types'
import { Num } from './Num'
import Icon from './Icon'
import PersonAvatar from './PersonAvatar'
import BookmarkButton from './BookmarkButton'
import { formatAmountShort } from '@/lib/format'
import styles from './Rows.module.css'

/** 인물 유형 배지 — 공직자 데이터는 연 1회 공개라 기준일 라벨이 따라붙어야 한다(규칙 2) */
export function PersonTypeBadge({ type }: { type: PersonType }) {
  return <span className={`ty-micro ${styles.badge}`}>{type === 'official' ? '공직자' : '내부자'}</span>
}

/**
 * PersonRow — 탐색·마이·검색 결과의 인물 행.
 *
 * 위계: 배지(유형) → 이름 → 소속 을 세로로 쌓고, 좌측에 유형 아바타, 우측에 금액과 북마크.
 * 이전에는 이름·소속만 있고 금액이 작아 "누가 얼마나 움직였는지"가 안 읽혔다.
 */
export function PersonRow({
  person,
  amount,
  amountNote,
  bookmarked,
  onToggleBookmark,
  right,
}: {
  person: Person
  /** 이 행의 대표 금액 (없으면 숨김) */
  amount?: number | null
  /** 금액 아래 작은 설명 — 공직자의 '기준일' 등 */
  amountNote?: string | null
  bookmarked?: boolean
  onToggleBookmark?: () => void
  right?: ReactNode
}) {
  const amountText = amount === undefined ? null : formatAmountShort(amount ?? null)
  return (
    <Link to={`/person/${encodeURIComponent(person.id)}`} className={styles.personRow}>
      <PersonAvatar type={person.type} />
      <div className={styles.grow}>
        <PersonTypeBadge type={person.type} />
        <p className={`ty-label ${styles.ellipsis} ${styles.name}`}>{person.name}</p>
        <p className={`ty-caption ${styles.ellipsis}`}>
          {person.company}
          {person.title ? ` · ${person.title}` : ''}
        </p>
      </div>
      {(amountText || amountNote) && (
        <div className={styles.amountBlock}>
          {amountText && <span className="ty-amount">{amountText}</span>}
          {amountNote && <span className={`ty-micro ${styles.amountNote}`}>{amountNote}</span>}
        </div>
      )}
      {onToggleBookmark && <BookmarkButton active={Boolean(bookmarked)} onToggle={onToggleBookmark} />}
      {right}
    </Link>
  )
}

export function FollowChip({
  following,
  onToggle,
  label = '팔로우',
}: {
  following: boolean
  onToggle: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={following}
      className={`ty-body-s ${styles.followChip}`}
      onClick={(e) => {
        // 행 전체가 링크인 자리에서도 칩만 눌리게 한다
        e.preventDefault()
        e.stopPropagation()
        onToggle()
      }}
    >
      <Icon name={following ? 'check' : 'add'} size="sm" />
      {following ? '팔로잉' : label}
    </button>
  )
}

/**
 * RankingRow — 레이스 바 200ms ease-out.
 * 1위 바만 coral-300, 2위 이하 gray-300 (§2 데이터 그래픽 규칙).
 * 파생 집계이므로 화면 어딘가에 "집계 기준"을 반드시 병기한다.
 */
export { default as BookmarkButton } from './BookmarkButton'
export { default as PersonAvatar } from './PersonAvatar'

export function RankingRow({ entry, max }: { entry: RankingEntry; max: number }) {
  const pct = max > 0 ? Math.max(2, Math.round((entry.amount / max) * 100)) : 0
  const isFirst = entry.rank === 1
  return (
    <div className={styles.rankRow}>
      <span className={`ty-num ${styles.rankNo} ${entry.rank <= 3 ? styles.rankTop : ''}`}>{entry.rank}</span>
      <div className={styles.raceWrap}>
        <div className={styles.row} style={{ border: 0, padding: 0, minHeight: 0 }}>
          <Link to={`/person/${encodeURIComponent(entry.personId)}`} className={styles.grow}>
            <p className={`ty-label ${styles.ellipsis} ${entry.rank <= 3 ? styles.rankTop : ''}`}>
              {entry.personName}
            </p>
            <p className={`ty-caption ${styles.ellipsis}`}>{entry.company}</p>
          </Link>
          <Num>{formatAmountShort(entry.amount)}</Num>
        </div>
        <div className={styles.raceTrack}>
          <div
            className={`${styles.raceBar} ${isFirst ? styles.raceBarFirst : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * StockInfoList — 값이 null 인 항목은 **행 자체를 렌더하지 않는다**.
 * 공공데이터포털 키가 없는 동안 시세 항목은 전부 null 이므로 이 목록이 비게 되고,
 * 화면은 "시세 정보 준비 중"만 보여준다. 0 이나 '-' 를 지어내지 않는다(규칙 2).
 */
export function StockInfoList({ items }: { items: readonly { term: string; value: string | null }[] }) {
  const shown = items.filter((i) => i.value !== null)
  if (!shown.length) return null
  return (
    <dl className={`ty-body-s ${styles.infoList}`}>
      {shown.map((i) => (
        <div key={i.term} style={{ display: 'contents' }}>
          <dt className={styles.infoTerm}>{i.term}</dt>
          <dd className={`ty-num ${styles.infoValue}`}>{i.value}</dd>
        </div>
      ))}
    </dl>
  )
}
