import { useMemo, useState } from 'react'
import Screen from '@/shared/components/Screen'
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
import { getMeta, getPersons, getRankings } from '@/lib/data'
import { officialsByStockValue } from '@/lib/officials'
import { useMarket } from '@/lib/market'
import { formatDate } from '@/lib/format'
import { useAsync } from '@/lib/useData'
import type { RankingPeriod } from '@/lib/types'
import styles from './HomeScreen.module.css'

/**
 * 랭킹 종류.
 *
 * 공직자는 순매수/순매도 축에 올릴 수 없다 — 재산공개는 **잔액 스냅샷**이라
 * '얼마어치 샀는지'가 아예 공개되지 않는다. 그래서 같은 세그먼트에 두되
 * 집계 축이 다르다는 걸 라벨과 설명으로 못박는다.
 */
const KINDS = [
  { value: 'netBuy', label: '순매수' },
  { value: 'netSell', label: '순매도' },
  { value: 'official', label: '공직자' },
] as const
type Kind = (typeof KINDS)[number]['value']

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
  const market = useMarket()
  const [kind, setKind] = useState<Kind>('netBuy')
  const [period, setPeriod] = useState<RankingPeriod>('30')

  const { state, data, error, retry } = useAsync(async () => {
    const [rankings, meta, persons] = await Promise.all([getRankings(), getMeta(), getPersons()])
    return { rankings, meta, persons }
  })

  // 공직자 랭킹은 미장에 없다 (대응물이 하원의원 거래인데 그건 거래라 순매수 축에 들어간다)
  const kinds = useMemo(
    () => (market === 'kr' ? KINDS : KINDS.filter((k) => k.value !== 'official')),
    [market],
  )
  // 미장으로 바꿨는데 공직자 탭이 선택돼 있으면 되돌린다
  const activeKind: Kind = market === 'us' && kind === 'official' ? 'netBuy' : kind

  const officials = useMemo(
    () => (data ? officialsByStockValue(data.persons).slice(0, 30) : []),
    [data],
  )

  const effectiveState = state
  const entries =
    activeKind === 'official'
      ? officials.map((p, i) => ({
          rank: i + 1,
          personId: p.id,
          personName: p.name,
          personType: p.type,
          company: `${p.company}${p.title ? ` · ${p.title}` : ''}`,
          amount: p.officialAssets?.[0]?.stockValue ?? 0,
        }))
      : data
        ? (data.rankings[activeKind][period] ?? [])
        : []
  const isEmpty = effectiveState === 'ready' && entries.length === 0
  const max = entries[0]?.amount ?? 0

  return (
    <Screen title="랭킹" tight>
      <div className={styles.controls}>
        <SegmentTab label="랭킹 종류" options={kinds} value={activeKind} onChange={setKind} />
        {/* 공직자는 기간 집계가 아니라 공개 시점 스냅샷이라 기간 칩이 의미가 없다 */}
        {activeKind !== 'official' && (
          <FilterChips label="집계 기간" options={PERIODS} selected={[period]} onToggle={setPeriod} />
        )}
      </div>

      {effectiveState === 'loading' && <LoadingState rows={5} />}
      {effectiveState === 'error' && <ErrorState message={error?.message} onRetry={retry} />}

      {effectiveState === 'ready' && isEmpty && (
        <EmptyState
          icon="leaderboard"
          title={
            activeKind === 'official'
              ? '공직자 재산 자료가 아직 없습니다'
              : `최근 ${period}일간 집계할 ${activeKind === 'netBuy' ? '순매수' : '순매도'}가 없습니다`
          }
          micro={activeKind === 'official' ? '재산공개는 연 1회와 수시로 이뤄집니다' : '조용한 기간도 있는 법입니다'}
        />
      )}

      {effectiveState === 'ready' && !isEmpty && (
        <section>
          <SectionHeader
            title={
              activeKind === 'official'
                ? '공직자 보유 주식'
                : `${period}일 ${activeKind === 'netBuy' ? '순매수' : '순매도'}`
            }
            note={
              activeKind === 'official'
                ? `상장주식 평가액 · 상위 ${entries.length}명`
                : `상위 ${entries.length}명`
            }
          />
          {entries.map((e) => (
            <RankingRow key={e.personId} entry={e} max={max} />
          ))}
          {activeKind === 'official' ? (
            <p className="ty-micro" style={{ marginTop: 'var(--space-4)' }}>
              {/* '투자액'이라 쓰지 않는다. 얼마에 샀는지는 공개되지 않는다 —
                  이건 공개 시점의 **보유 평가액**이다 */}
              {data?.meta.officialsAsOf ? `${formatDate(data.meta.officialsAsOf)}에 공개된 ` : ''}
              <b>보유 주식의 평가액</b> 순입니다. 얼마에 샀는지는 공개되지 않으므로 투자액이 아닙니다.
              비상장주식·채권은 제외했고, 증권 항목이 없는 공직자는 순위에서 뺐습니다.
            </p>
          ) : (
          <p className="ty-micro" style={{ marginTop: 'var(--space-4)' }}>
            집계 기준: 최근 {period}일 공시 중 단가가 확인된 건만 합산했습니다. 무상증여처럼 단가가 없는 공시와
            매수·매도가 섞인 보고서는 금액을 알 수 없어 제외했습니다. DART 원문이 아니라 빅보드가 계산한 값입니다.
          </p>
          )}
        </section>
      )}

      <footer className={styles.footer}>
        {data?.meta && <FreshnessLabel lastUpdated={data.meta.lastUpdated} />}
        <Disclaimer compact />
      </footer>
    </Screen>
  )
}
