import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import styles from './LandingScreen.module.css'

/**
 * W0 랜딩 — 첫 방문 1스크린.
 * 하단 고지문은 BSR-CMN-01(고지문 규칙)에 따라 이 화면에도 필수다.
 * STEP 4-9 에서 카피·비주얼이 확정된다.
 */
export default function LandingScreen() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = '빅보드 BIG board'
  }, [])

  return (
    <main className={`${styles.wrap} gutter`}>
      <div className={styles.hero}>
        <h1 className="ty-display" style={{ margin: 0 }}>
          빅보드
        </h1>
        <p className="ty-body" style={{ margin: 0 }}>
          내부자와 고위공직자가 자기 회사 주식을 사고판 기록을, 공시가 올라온 순서대로 보여드립니다.
        </p>
        <p className="ty-micro" style={{ margin: 0 }}>
          숫자는 정색, 자막은 위트
        </p>
      </div>

      <div className={styles.spacer} />

      <div className={styles.actions}>
        <button type="button" className={`ty-label ${styles.cta}`} onClick={() => navigate('/onboarding')}>
          시작하기
        </button>
        <p className="ty-caption" style={{ margin: 0 }}>
          이 서비스는 투자자문·투자권유가 아닙니다. 공개된 공시 정보를 정리해 보여줄 뿐이며, 투자 판단과 그 결과는
          이용자 본인에게 있습니다. 출처: 금융감독원 전자공시시스템(DART).
        </p>
      </div>
    </main>
  )
}
