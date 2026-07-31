import Screen, { ScreenPlaceholder } from '@/shared/components/Screen'

/** S1 홈 — 세그먼트[속보|팔로우] + 필터 칩 + 날짜 그룹 + 공시 카드 리스트 (STEP 4-1) */
export default function HomeScreen() {
  return (
    <Screen title="홈">
      <ScreenPlaceholder name="홈" note="속보·팔로우 세그먼트와 공시 카드 리스트가 들어갑니다." />
    </Screen>
  )
}
