import { useParams } from 'react-router'
import Screen, { ScreenPlaceholder } from '@/shared/components/Screen'

/** S2 피드 상세 — 7개 섹션 (STEP 4-2) */
export default function FeedDetailScreen() {
  const { id } = useParams()
  return (
    <Screen title="공시 상세" showBack>
      <ScreenPlaceholder name={`공시 상세 (id: ${id})`} note="거래 요약부터 거래 바로가기까지 7개 섹션이 들어갑니다." />
    </Screen>
  )
}
