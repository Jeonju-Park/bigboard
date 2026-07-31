import { Link } from 'react-router'
import Screen from '@/shared/components/Screen'

export default function NotFoundScreen() {
  return (
    <Screen title="찾을 수 없음">
      <p className="ty-body" style={{ margin: 0 }}>
        요청하신 화면이 없습니다.
      </p>
      <Link to="/home" className="ty-label">
        홈으로 가기
      </Link>
    </Screen>
  )
}
