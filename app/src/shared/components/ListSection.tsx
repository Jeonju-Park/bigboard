import type { ReactNode } from 'react'
import { Link } from 'react-router'
import Icon from './Icon'
import styles from './ListSection.module.css'

/** 설정형 리스트의 행 묶음 */
export function ListGroup({ children }: { children: ReactNode }) {
  return <div className={styles.group}>{children}</div>
}

type RowProps = {
  icon?: string
  label: string
  /** 라벨 아래 보조 설명 */
  note?: ReactNode
  /** 우측 값 (선택된 증권사 이름 등) */
  value?: ReactNode
  to?: string
  onClick?: () => void
  disabled?: boolean
  /** 탭 되지 않는 정보 행 */
  isStatic?: boolean
}

/**
 * ListRow — 아이콘 | 라벨·설명 | 값 | 화살표.
 *
 * 마이/설정의 모든 항목을 이 하나로 통일한다.
 * 항목마다 다른 모양을 쓰면 "무엇이 눌리는지"를 매번 다시 학습해야 한다.
 */
export function ListRow({ icon, label, note, value, to, onClick, disabled, isStatic }: RowProps) {
  const inner = (
    <>
      {icon && <Icon name={icon} className={styles.icon} />}
      <span className={styles.body}>
        <p className="ty-body">{label}</p>
        {note && <p className="ty-caption">{note}</p>}
      </span>
      {value && <span className={`ty-body-s ${styles.value}`}>{value}</span>}
      {!isStatic && !disabled && <Icon name="chevron_right" size="sm" className={styles.chevron} />}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={styles.row}>
        {inner}
      </Link>
    )
  }
  if (isStatic) {
    return <div className={`${styles.row} ${styles.static}`}>{inner}</div>
  }
  return (
    <button type="button" className={styles.row} onClick={onClick} disabled={disabled}>
      {inner}
    </button>
  )
}
