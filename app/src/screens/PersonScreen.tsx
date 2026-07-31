import { useParams } from 'react-router'
import Screen, { ScreenPlaceholder } from '@/shared/components/Screen'

/** S3 인물 프로필 (STEP 4-3) */
export default function PersonScreen() {
  const { id } = useParams()
  return (
    <Screen title="인물" showBack>
      <ScreenPlaceholder name={`인물 프로필 (id: ${id})`} note="유형 배지, 보유 현황, 거래 타임라인이 들어갑니다." />
    </Screen>
  )
}
