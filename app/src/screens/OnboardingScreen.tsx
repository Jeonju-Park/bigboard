import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import Icon from '@/shared/components/Icon'
import { Button } from '@/shared/components/Controls'
import { LoadingState } from '@/shared/components/Feedback'
import { getDisclosures, getPersons, getStocks } from '@/lib/data'
import { useAsync } from '@/lib/useData'
import {
  BROKERS, setBroker, toggleFollowPerson, toggleFollowStock,
  useBroker, useFollowedPersons, useFollowedStocks, type BrokerId,
} from '@/lib/follow'
import { markOnboarded } from '@/lib/visit'
import { formatAmountShort } from '@/lib/format'
import styles from './OnboardingScreen.module.css'

/**
 * W1 온보딩 3스텝 — 관심 종목 → 큰손 팔로우 → 증권사 선택. 전 스텝 건너뛰기 가능.
 * 여기서 고른 값은 그대로 localStorage 에 들어가 홈의 '팔로우' 탭을 채운다.
 */
export default function OnboardingScreen() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [q, setQ] = useState('')

  const followedStocks = useFollowedStocks()
  const followedPersons = useFollowedPersons()
  const brokerId = useBroker()

  const { state, data } = useAsync(async () => {
    const [stocks, persons, disclosures] = await Promise.all([getStocks(), getPersons(), getDisclosures()])
    return { stocks, persons, disclosures }
  })

  useEffect(() => {
    document.title = '시작하기 · 빅보드'
  }, [])

  // 공시가 많은 종목 = 볼거리가 있는 종목. 검색어가 있으면 이름·코드로 좁힌다
  const stockOptions = useMemo(() => {
    if (!data) return []
    const counts = new Map<string, number>()
    for (const d of data.disclosures) counts.set(d.stockCode, (counts.get(d.stockCode) ?? 0) + 1)
    const query = q.trim()
    return data.stocks
      .filter((s) => (query ? s.name.includes(query) || s.code.includes(query) : true))
      .sort((a, b) => (counts.get(b.code) ?? 0) - (counts.get(a.code) ?? 0))
      .slice(0, 24)
  }, [data, q])

  const personOptions = useMemo(() => {
    if (!data) return []
    return data.persons
      .filter((p) => p.totalNetBuy12m !== 0)
      .sort((a, b) => Math.abs(b.totalNetBuy12m) - Math.abs(a.totalNetBuy12m))
      .slice(0, 12)
  }, [data])

  function finish() {
    markOnboarded()
    navigate('/home', { replace: true })
  }

  const STEPS = ['관심 종목 고르기', '큰손 팔로우', '증권사 선택'] as const
  const isLast = step === STEPS.length - 1

  return (
    <main className={`${styles.wrap} gutter`}>
      <div className={styles.topRow}>
        <div className={styles.progress} role="group" aria-label={`${STEPS.length}단계 중 ${step + 1}단계`}>
          {STEPS.map((s, i) => (
            <span key={s} className={`${styles.dot} ${i <= step ? styles.dotActive : ''}`} />
          ))}
        </div>
        <button type="button" className={`ty-caption ${styles.skip}`} onClick={finish}>
          건너뛰기
        </button>
      </div>

      <div className={styles.body}>
        <h1 className="ty-title" style={{ margin: 0 }}>{STEPS[step]}</h1>

        {state === 'loading' && <LoadingState rows={2} />}

        {state === 'ready' && step === 0 && (
          <>
            <p className="ty-caption" style={{ margin: 0 }}>
              고른 종목의 공시를 홈 '팔로우' 탭에서 모아 봅니다. 나중에 바꿀 수 있습니다.
            </p>
            <input
              className={`ty-body ${styles.search}`}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="종목명 또는 코드로 찾기"
              aria-label="종목 검색"
            />
            <div className={styles.chipGrid}>
              {stockOptions.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  aria-pressed={followedStocks.includes(s.code)}
                  className={`ty-body-s ${styles.selectChip}`}
                  onClick={() => toggleFollowStock(s.code)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </>
        )}

        {state === 'ready' && step === 1 && (
          <>
            <p className="ty-caption" style={{ margin: 0 }}>
              최근 12개월 거래 규모가 큰 순서입니다. 집계 기준은 단가가 확인된 공시만입니다.
            </p>
            <div className={styles.chipGrid}>
              {personOptions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={followedPersons.includes(p.id)}
                  className={`ty-body-s ${styles.selectChip}`}
                  onClick={() => toggleFollowPerson(p.id)}
                >
                  {p.name}
                  <span className="ty-micro"> · {formatAmountShort(Math.abs(p.totalNetBuy12m))}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="ty-caption" style={{ margin: 0 }}>
              '거래 바로가기'를 누르면 선택한 증권사 페이지로 이동합니다. 주문은 직접 하셔야 합니다.
            </p>
            <div role="radiogroup" aria-label="증권사 선택" className={styles.radioGroup}>
              {BROKERS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="radio"
                  aria-checked={brokerId === b.id}
                  className={`ty-body ${styles.radio}`}
                  onClick={() => setBroker(b.id as BrokerId)}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className={styles.actions}>
        {step > 0 && (
          <button type="button" className={styles.prev} onClick={() => setStep(step - 1)} aria-label="이전 단계">
            <Icon name="arrow_back_ios_new" size="sm" />
          </button>
        )}
        <Button block onClick={() => (isLast ? finish() : setStep(step + 1))}>
          {isLast ? '시작하기' : '다음'}
        </Button>
      </div>
    </main>
  )
}
