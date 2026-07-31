import Screen, { ScreenPlaceholder } from '@/shared/components/Screen'

/** S7 랭킹 — 순매수/순매도 세그먼트 + 기간 칩 + 레이스 바 (STEP 4-7) */
export default function RankingScreen() {
  return (
    <Screen title="랭킹">
      <ScreenPlaceholder name="랭킹" note="순매수·순매도 랭킹과 레이스 바가 들어갑니다. 집계 기준을 함께 표시합니다." />
    </Screen>
  )
}
