import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Icon from './Icon'
import styles from './AppBar.module.css'

type Props = {
  title: string
  /** 뒤로가기 버튼 노출 — 탭 최상위 화면에는 붙이지 않는다 */
  showBack?: boolean
  /** 우측 액션 슬롯 (STEP 4 의 개발용 상태 토글 등) */
  actions?: ReactNode
}

export default function AppBar({ title, showBack = false, actions }: Props) {
  const navigate = useNavigate()

  return (
    <header className={styles.bar}>
      {showBack && (
        <button type="button" className={styles.back} onClick={() => navigate(-1)} aria-label="뒤로 가기">
          <Icon name="arrow_back_ios_new" size="sm" />
        </button>
      )}
      <h1 className={`ty-title-s ${styles.title}`}>{title}</h1>
      <div className={styles.spacer} />
      {actions}
    </header>
  )
}
