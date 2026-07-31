import type { ReactNode } from 'react'
import { Link } from 'react-router'
import Icon from './Icon'
import styles from './Controls.module.css'

/** 세그먼트 탭 — [속보|팔로우], [순매수|순매도]. 활성은 ink 밑줄 */
export function SegmentTab<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className={styles.segment} role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={`ty-body ${styles.segmentItem}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** 필터 칩 줄 — 선택 시 coral 면 + ink 글자 (§2 면 전용 규칙 준수) */
export function FilterChips<T extends string>({
  options,
  selected,
  onToggle,
  label,
  bare = false,
}: {
  options: readonly { value: T; label: string }[]
  selected: readonly T[]
  onToggle: (v: T) => void
  label: string
  /** 이미 가로 스크롤되는 줄 안에 놓일 때 — 자체 스크롤·거터를 만들지 않는다 */
  bare?: boolean
}) {
  return (
    <div className={bare ? styles.chipGroup : styles.chipRow} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={selected.includes(o.value)}
          className={`ty-body-s ${styles.chip}`}
          onClick={() => onToggle(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

type ButtonProps = {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'text'
  block?: boolean
  onClick?: () => void
  disabled?: boolean
  /** 외부 링크(증권사 아웃링크 등) */
  href?: string
  /** 내부 라우트 */
  to?: string
}

export function Button({ children, variant = 'primary', block, onClick, disabled, href, to }: ButtonProps) {
  const cls = [`ty-label`, styles.button, styles[variant], block && styles.block].filter(Boolean).join(' ')
  if (href) {
    // 아웃링크만 허용 — 주문 실행 코드는 넣지 않는다 (CLAUDE.md 규칙 1)
    return (
      <a className={cls} href={href} target="_blank" rel="noopener noreferrer" onClick={onClick}>
        {children}
      </a>
    )
  }
  if (to) {
    return (
      <Link className={cls} to={to} onClick={onClick}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

/** 누르면 바텀시트가 열리는 칩. 기본값이 아니면 coral 면으로 활성 표시 */
export function DropdownChip({
  label,
  active,
  onOpen,
}: {
  label: string
  active: boolean
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      data-active={active}
      className={`ty-body-s ${styles.dropdownChip}`}
      onClick={onOpen}
      aria-haspopup="dialog"
    >
      {label}
      <Icon name="expand_more" size="sm" />
    </button>
  )
}

/** 리스트 위 정렬 바 — 왼쪽 건수, 오른쪽 정렬 드롭다운 */
export function SortBar({
  count,
  sortLabel,
  onOpenSort,
}: {
  count: number
  sortLabel: string
  onOpenSort: () => void
}) {
  return (
    <div className={styles.sortBar}>
      <p className="ty-caption" style={{ margin: 0 }}>
        {count.toLocaleString()}건
      </p>
      <button
        type="button"
        className={`ty-body-s ${styles.sortButton}`}
        onClick={onOpenSort}
        aria-haspopup="dialog"
      >
        {sortLabel}
        <Icon name="unfold_more" size="sm" />
      </button>
    </div>
  )
}
