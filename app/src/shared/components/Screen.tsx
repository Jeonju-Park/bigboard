import type { ReactNode } from 'react'
import { useEffect } from 'react'
import AppBar from './AppBar'
import styles from './Screen.module.css'

type Props = {
  title: string
  /** 제목 대신 워드마크 (홈) */
  wordmark?: boolean
  showBack?: boolean
  /** 앱바를 통째로 차지하는 요소 (검색 입력창) */
  center?: ReactNode
  actions?: ReactNode
  /**
   * 본문 바로 위에 세그먼트 탭·날짜 스트립처럼 자체 여백을 가진 컨트롤이 오는 화면.
   * 이 경우 본문 상단 여백을 24 → 8 로 줄여 헤더와 붙여 보이게 한다.
   */
  tight?: boolean
  children: ReactNode
}

/**
 * 화면 공통 골격 — 앱바(56pt) + 본문.
 * 하단 탭은 TabLayout 이 담당한다.
 */
export default function Screen({ title, wordmark, showBack, center, actions, tight, children }: Props) {
  // 해시 라우팅이라 문서 제목이 자동으로 바뀌지 않는다. 탭·공유·뒤로가기 목록에서 구분되게 직접 넣는다.
  useEffect(() => {
    document.title = `${title} · 빅보드`
  }, [title])

  return (
    <>
      <AppBar title={title} wordmark={wordmark} showBack={showBack} center={center} actions={actions} />
      <main className={`${styles.main} ${tight ? styles.tight : ''} gutter`}>{children}</main>
    </>
  )
}
