import { Outlet } from 'react-router'
import TabBar from '@/shared/components/TabBar'

/** 하단 탭이 있는 5개 최상위 화면의 공통 레이아웃 */
export default function TabLayout() {
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  )
}
