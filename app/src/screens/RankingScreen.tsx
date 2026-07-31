import { useState } from 'react'
import Screen from '@/shared/components/Screen'
import DevStateToggle from '@/shared/components/DevStateToggle'
import { SegmentTab, FilterChips } from '@/shared/components/Controls'
import { RankingRow } from '@/shared/components/Rows'
import {
  Disclaimer,
  EmptyState,
  ErrorState,
  FreshnessLabel,
  LoadingState,
  SectionHeader,
} from '@/shared/components/Feedback'
import { getMeta, getRankings } from '@/lib/data'
import { useAsync, useForcedState } from '@/lib/useData'
import type { RankingKind, RankingPeriod } from '@/lib/types'
import styles from './HomeScreen.module.css'

const KINDS = [
  { value: 'netBuy', label: '순매수' },
  { value: 'netSell', label: '순매도' },
] as const

const PERIODS = [
  { value: '7', label: '7일' },
  { value: '30', label: '30일' },
  { value: '90', label: '90일' },
] as const

/**
 * S7 랭킹 — 레이스 바 200ms ease-out (§5).
 *
 * 파생 집계이므로 "집계 기준"을 반드시 병기한다(법적 메모: DART 원문이 아니라 우리 계산값).
 * 단가가 없어 금액을 모르는 공시는 집계에서 제외했다 — 0 으로 넣으면 순위가 거짓이 된다.
 */
export default function RankingScreen() {
  const [forced, setForced] = useForcedState()
  const [kind, setKind] = useState<RankingKind>('netBuy')
  const [period, setPeriod] = useState<RankingPeriod>('30')

  const { state, data, error, retry } = useAsync(async () => {
    const [rankings, meta] = await Promise.all([getRankings(), getMeta()])
    return { rankings, meta }
  })

  const effectiveState = forced === 'loading' ? 'loading' : forced === 'error' ? 'error' : state
  const entries = data ? (data.rankings[kind][period] ?? []) : []
  const isEmpty = forced === 'empty' || (effectiveState === 'ready' && entries.length === 0)
  const max = entries[0]?.amount ?? 0

  return (
    <Screen title="랭킹" actions={<DevStateToggle value={forced} onChange={setForced} />}>
      <div className={styles.controls}>
        <SegmentTab label="랭킹 종류" options={KINDS} value={kind} onChange={setKind} />
        <FilterChips label="집계 기간" options={PERIODS} selected={[period]} onToggle={setPeriod} />
      </div>

      {effectiveState === 'loading' && <LoadingState rows={5} />}
      {effectiveState === 'error' && <ErrorState message={error?.message} onRetry={retry} />}

      {effectiveState === 'ready' && isEmpty && (
        <EmptyState
          icon="leaderboard"
          title={`최근 ${period}일간 집계할 ${kind === 'netBuy' ? '순매수' : '순매도'}가 없습니다`}
          micro="조용한 기간도 있는 법입니다"
        />
      )}

      {effectiveState === 'ready' && !isEmpty && (
        <section>
          <SectionHeader
            title={`${period}일 ${kind === 'netBuy' ? '순매수' : '순매도'}`}
            note={`상위 ${entries.length}명`}
          />
          {entries.map((e) => (
            <RankingRow key={e.personId} entry={e} max={max} />
          ))}
          <p className="ty-micro" style={{ marginTop: 'var(--space-4)' }}>
            집계 기준: 최근 {period}일 공시 중 단가가 확인된 건만 합산했습니다. 무상증여처럼 단가가 없는 공시와
            매수·매도가 섞인 보고서는 금액을 알 수 없어 제외했습니다. DART 원문이 아니라 빅보드가 계산한 값입니다.
          </p>
        </section>
      )}

      <footer className={styles.footer}>
        {data?.meta && <FreshnessLabel lastUpdated={data.meta.lastUpdated} />}
        <Disclaimer compact />
      </footer>
    </Screen>
  )
}
