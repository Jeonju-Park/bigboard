import { useParams } from 'react-router'
import Screen, { ScreenPlaceholder } from '@/shared/components/Screen'

/** S4 종목 (STEP 4-4) */
export default function StockScreen() {
  const { code } = useParams()
  return (
    <Screen title="종목" showBack>
      <ScreenPlaceholder name={`종목 (코드: ${code})`} note="종목 정보 블록과 이 종목의 내부자 거래가 들어갑니다." />
    </Screen>
  )
}
