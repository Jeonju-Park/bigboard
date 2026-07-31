import type { ReactNode } from 'react'
import { useEffect } from 'react'
import AppBar from './AppBar'
import styles from './Screen.module.css'

type Props = {
  title: string
  showBack?: boolean
  actions?: ReactNode
  children: ReactNode
}

/**
 * 화면 공통 골격 — 앱바 + 본문.
 * 하단 탭은 TabLayout 이 담당하므로 여기서는 다루지 않는다.
 */
export default function Screen({ title, showBack, actions, children }: Props) {
  // 해시 라우팅이라 문서 제목이 자동으로 바뀌지 않는다. 탭·공유·뒤로가기 목록에서 구분되게 직접 넣는다.
  useEffect(() => {
    document.title = `${title} · 빅보드`
  }, [title])

  return (
    <>
      <AppBar title={title} showBack={showBack} actions={actions} />
      <main className={`${styles.main} gutter`}>{children}</main>
    </>
  )
}

/** STEP 1 뼈대용 자리표시. STEP 4 에서 화면마다 실제 내용으로 대체된다. */
export function ScreenPlaceholder({ name, note }: { name: string; note?: string }) {
  return (
    <div className={styles.placeholder}>
      <p className="ty-body" style={{ margin: 0 }}>
        {name}
      </p>
      {note && (
        <p className="ty-caption" style={{ margin: 0 }}>
          {note}
        </p>
      )}
    </div>
  )
}
