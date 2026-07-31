import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Icon from './Icon'
import Logotype from './Logotype'
import styles from './AppBar.module.css'

type Props = {
  /** 화면 이름. wordmark 가 true 면 무시되고 스크린리더 이름으로만 쓰인다 */
  title: string
  /** 제목 대신 워드마크를 노출 (홈 전용) */
  wordmark?: boolean
  /** 뒤로가기 — 탭 최상위 화면에는 붙이지 않는다 */
  showBack?: boolean
  /** 제목 왼쪽 슬롯. 검색 화면의 입력창처럼 앱바를 통째로 차지하는 요소에 쓴다 */
  center?: ReactNode
  /** 우측 액션 슬롯 */
  actions?: ReactNode
}

export default function AppBar({ title, wordmark = false, showBack = false, center, actions }: Props) {
  const navigate = useNavigate()

  return (
    <header className={styles.bar}>
      {showBack && (
        <button
          type="button"
          className={`${styles.iconButton} ${styles.leading}`}
          onClick={() => navigate(-1)}
          aria-label="뒤로 가기"
        >
          <Icon name="arrow_back_ios_new" size="sm" />
        </button>
      )}

      {center ?? (
        wordmark ? (
          <div className={styles.logo}>
            <Logotype height={22} />
            <span className="sr-only">{title}</span>
          </div>
        ) : (
          <h1 className={`ty-title-s ${styles.title}`}>{title}</h1>
        )
      )}

      {!center && <div className={styles.spacer} />}
      {actions && <div className={`${styles.actions} ${styles.trailing}`}>{actions}</div>}
    </header>
  )
}

/** 앱바 우측에 놓는 아이콘 버튼 (검색·설정 등) */
export function AppBarAction({
  icon, label, to, onClick,
}: { icon: string; label: string; to?: string; onClick?: () => void }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      className={styles.iconButton}
      aria-label={label}
      onClick={() => (to ? navigate(to) : onClick?.())}
    >
      <Icon name={icon} />
    </button>
  )
}
