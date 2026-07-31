import { NavLink } from 'react-router'
import Icon from './Icon'
import styles from './TabBar.module.css'

/** IA v0.2 탭 순서: S1 홈 / S5 탐색 / S6 캘린더 / S7 랭킹 / S8 마이 */
const TABS = [
  { to: '/home', label: '홈', icon: 'radar' },
  { to: '/explore', label: '탐색', icon: 'search' },
  { to: '/calendar', label: '캘린더', icon: 'calendar_month' },
  { to: '/ranking', label: '랭킹', icon: 'leaderboard' },
  { to: '/my', label: '마이', icon: 'person' },
] as const

export default function TabBar() {
  return (
    <nav className={styles.bar} aria-label="주요 화면">
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} className={styles.tab}>
          {({ isActive }) => (
            <>
              <span className={styles.iconSlot}>
                <Icon name={tab.icon} size="sm" filled={isActive} />
              </span>
              <span className={styles.label}>{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
