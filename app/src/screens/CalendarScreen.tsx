import Screen, { ScreenPlaceholder } from '@/shared/components/Screen'

/** S6 캘린더 — 주간 스트립 + 예고 리스트 (STEP 4-6) */
export default function CalendarScreen() {
  return (
    <Screen title="캘린더">
      <ScreenPlaceholder name="캘린더" note="주간 스트립과 사전공시 예고 리스트가 들어갑니다." />
    </Screen>
  )
}
