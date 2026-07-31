import type { ReactNode } from 'react'
import { Link } from 'react-router'
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
}: {
  options: readonly { value: T; label: string }[]
  selected: readonly T[]
  onToggle: (v: T) => void
  label: string
}) {
  return (
    <div className={styles.chipRow} role="group" aria-label={label}>
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
