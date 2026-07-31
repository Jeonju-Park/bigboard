import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import { useEffect } from 'react'
import { hasOnboarded } from '@/lib/visit'
import TabLayout from '@/screens/TabLayout'
import HomeScreen from '@/screens/HomeScreen'
import ExploreScreen from '@/screens/ExploreScreen'
import CalendarScreen from '@/screens/CalendarScreen'
import RankingScreen from '@/screens/RankingScreen'
import MyScreen from '@/screens/MyScreen'
import FeedDetailScreen from '@/screens/FeedDetailScreen'
import PersonScreen from '@/screens/PersonScreen'
import StockScreen from '@/screens/StockScreen'
import LandingScreen from '@/screens/LandingScreen'
import OnboardingScreen from '@/screens/OnboardingScreen'
import NotFoundScreen from '@/screens/NotFoundScreen'
import DevGalleryScreen from '@/screens/DevGalleryScreen'
import SearchScreen from '@/screens/SearchScreen'

/**
 * 라우트 진입점.
 * HashRouter 를 쓰는 이유: GitHub Pages 는 SPA 폴백(rewrite)을 지원하지 않아서
 * BrowserRouter 로는 /ranking 을 새로고침하면 404 가 난다. 해시는 서버로 안 간다.
 */

/** 첫 방문이면 랜딩으로, 아니면 홈으로 */
function RootRedirect() {
  return <Navigate to={hasOnboarded() ? '/home' : '/landing'} replace />
}

/** 화면 전환 시 스크롤 위치를 맨 위로. 해시 라우팅은 이걸 자동으로 해주지 않는다 */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          {/* W0 / W1 — 탭 없이 단독 화면 */}
          <Route path="/landing" element={<LandingScreen />} />
          <Route path="/onboarding" element={<OnboardingScreen />} />

          {/* 하단 탭 5개 */}
          <Route element={<TabLayout />}>
            <Route path="/home" element={<HomeScreen />} />
            <Route path="/explore" element={<ExploreScreen />} />
            <Route path="/calendar" element={<CalendarScreen />} />
            <Route path="/ranking" element={<RankingScreen />} />
            <Route path="/my" element={<MyScreen />} />
          </Route>

          {/* 검색 — 탭 없이 앱바가 입력창이 된다 */}
          <Route path="/search" element={<SearchScreen />} />

          {/* 상세 — 탭 없이 뒤로가기 */}
          <Route path="/feed/:id" element={<FeedDetailScreen />} />
          <Route path="/person/:id" element={<PersonScreen />} />
          <Route path="/stock/:code" element={<StockScreen />} />

          {/* 개발용 — 탭에 노출하지 않는다 */}
          <Route path="/dev-gallery" element={<DevGalleryScreen />} />

          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </div>
    </HashRouter>
  )
}
