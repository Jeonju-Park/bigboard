import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import Icon from '@/shared/components/Icon'
import { markOnboarded } from '@/lib/visit'
import styles from './OnboardingScreen.module.css'

/**
 * W1 온보딩 3스텝 — STEP 1 에서는 이동만 되는 빈 껍데기.
 * 실제 선택 UI(관심종목 칩 검색 / 큰손 팔로우 / 증권사 라디오)는 STEP 4-9 에서 붙인다.
 * 전 스텝 건너뛰기 가능하다.
 */
const STEPS = [
  { title: '관심 종목 고르기', note: '고른 종목의 공시가 홈 상단에 먼저 보입니다.' },
  { title: '큰손 팔로우', note: '팔로우한 인물의 거래만 따로 모아 볼 수 있습니다.' },
  { title: '증권사 선택', note: '거래 바로가기를 누르면 선택한 증권사 앱으로 이동합니다.' },
] as const

export default function OnboardingScreen() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  useEffect(() => {
    document.title = '시작하기 · 빅보드'
  }, [])

  function finish() {
    markOnboarded()
    navigate('/home', { replace: true })
  }

  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  return (
    <main className={`${styles.wrap} gutter`}>
      <div className={styles.topRow}>
        <div className={styles.progress} role="group" aria-label={`${STEPS.length}단계 중 ${step + 1}단계`}>
          {STEPS.map((s, i) => (
            <span key={s.title} className={`${styles.dot} ${i <= step ? styles.dotActive : ''}`} />
          ))}
        </div>
        <button type="button" className={`ty-caption ${styles.skip}`} onClick={finish}>
          건너뛰기
        </button>
      </div>

      <div className={styles.body}>
        <h1 className="ty-title" style={{ margin: 0 }}>
          {current.title}
        </h1>
        <p className="ty-body" style={{ margin: 0 }}>
          {current.note}
        </p>
        <p className="ty-caption" style={{ margin: 0 }}>
          (STEP 4 에서 선택 UI가 들어갑니다)
        </p>
      </div>

      <div className={styles.actions}>
        {step > 0 && (
          <button type="button" className={styles.prev} onClick={() => setStep(step - 1)} aria-label="이전 단계">
            <Icon name="arrow_back_ios_new" size="sm" />
          </button>
        )}
        <button
          type="button"
          className={`ty-label ${styles.next}`}
          onClick={() => (isLast ? finish() : setStep(step + 1))}
        >
          {isLast ? '시작하기' : '다음'}
        </button>
      </div>
    </main>
  )
}
