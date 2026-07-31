import { Link } from 'react-router'
import type { Person, PersonType, RankingEntry } from '@/lib/types'
import { Num } from './Num'
import Icon from './Icon'
import { formatAmountShort } from '@/lib/format'
import styles from './Rows.module.css'

/** 인물 유형 배지 — 공직자 데이터는 연 1회 공개라 신선도 라벨이 따라붙어야 한다(규칙 2) */
export function PersonTypeBadge({ type }: { type: PersonType }) {
  return <span className={`ty-micro ${styles.badge}`}>{type === 'official' ? '공직자' : '내부자'}</span>
}

export function PersonRow({ person, right }: { person: Person; right?: React.ReactNode }) {
  return (
    <Link to={`/person/${encodeURIComponent(person.id)}`} className={styles.row}>
      <div className={styles.grow}>
        <p className={`ty-label ${styles.ellipsis}`}>{person.name}</p>
        <p className={`ty-caption ${styles.ellipsis}`}>
          {person.company}
          {person.title ? ` · ${person.title}` : ''}
        </p>
      </div>
      <PersonTypeBadge type={person.type} />
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
