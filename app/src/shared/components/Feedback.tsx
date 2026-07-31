import type { ReactNode } from 'react'
import Icon from './Icon'
import { Button } from './Controls'
import { formatDateTime, formatRelative } from '@/lib/format'
import styles from './Feedback.module.css'

export function SectionHeader({ title, note }: { title: string; note?: ReactNode }) {
  return (
    <div className={styles.sectionHeader}>
      <h2 className={`ty-title-s ${styles.sectionTitle}`}>{title}</h2>
      {note && <p className={`ty-caption ${styles.sectionNote}`}>{note}</p>}
    </div>
  )
}

/**
 * FreshnessLabel — 규칙 2("모든 데이터 블록에 기준시점 라벨").
 * lastUpdated 가 null 이면 현재 시각으로 대체하지 않고 "수집 전"이라고 말한다.
 * 6시간 이상 지나면 지연으로 표시한다.
 */
export function FreshnessLabel({ lastUpdated, prefix = '공시 수집' }: { lastUpdated: string | null; prefix?: string }) {
  if (!lastUpdated) {
    return <span className={`ty-caption ${styles.freshness}`}>아직 수집 전입니다</span>
  }
  const rel = formatRelative(lastUpdated)
  const stale = Date.now() - new Date(lastUpdated).getTime() > 6 * 3600_000
  return (
    <span className={`ty-caption ${styles.freshness} ${stale ? styles.stale : ''}`} title={formatDateTime(lastUpdated) ?? ''}>
      <Icon name="schedule" size="sm" />
      {prefix} {rel}
    </span>
  )
}

/** 데이터가 오래됐을 때의 안내 배너 (STEP 5 QA 항목 10) */
export function StaleBanner({ lastUpdated }: { lastUpdated: string | null }) {
  if (!lastUpdated) return null
  const hours = (Date.now() - new Date(lastUpdated).getTime()) / 3600_000
  if (hours < 6) return null
  return (
    <div className={styles.banner}>
      <Icon name="schedule" size="sm" />
      <p className="ty-caption" style={{ margin: 0 }}>
        마지막 수집이 {Math.floor(hours)}시간 전입니다. 최신 공시가 아직 반영되지 않았을 수 있습니다.
      </p>
    </div>
  )
}

/** §7 상태 4종 중 로딩 — 스켈레톤 */
export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div className={styles.skeletonList} aria-busy="true" aria-label="불러오는 중">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={styles.skeletonCard}>
          <div className={styles.bar} style={{ width: '40%' }} />
          <div className={styles.bar} style={{ width: '70%' }} />
          <div className={styles.bar} style={{ width: '55%' }} />
        </div>
      ))}
    </div>
  )
}

/**
 * §7 빈 상태 — 아이콘 + 안내 + 다음 행동 1개 + micro 위트 1줄.
 * 위트는 micro 레이어에만 존재한다.
 */
export function EmptyState({
  icon = 'inbox',
  title,
  micro,
  actionLabel,
  actionTo,
  onAction,
}: {
  icon?: string
  title: string
  micro?: string
  actionLabel?: string
  actionTo?: string
  onAction?: () => void
}) {
  return (
    <div className={styles.state}>
      <Icon name={icon} className={styles.stateIcon} />
      <p className={`ty-body ${styles.stateText}`}>{title}</p>
      {micro && <p className={`ty-micro ${styles.stateText}`}>{micro}</p>}
      {actionLabel && (
        <Button variant="secondary" to={actionTo} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

/** §7 에러 상태 — 원인 + 재시도 버튼 */
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className={styles.state}>
      <Icon name="error" className={styles.stateIcon} />
      <p className={`ty-body ${styles.stateText}`}>{message ?? '데이터를 불러오지 못했습니다.'}</p>
      <p className={`ty-micro ${styles.stateText}`}>네트워크가 잠깐 흔들렸을 수 있습니다</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  )
}

/** 법적 고지문 — BSR-CMN-01. 상세·마이 화면에 필수, 피드 하단 1회 */
export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <p className="ty-caption" style={{ margin: 0 }}>
      {compact
        ? '투자자문·투자권유가 아닙니다. 출처: 금융감독원 전자공시시스템(DART).'
        : '이 서비스는 투자자문·투자권유가 아닙니다. 공개된 공시 정보를 정리해 보여줄 뿐이며, 투자 판단과 그 결과는 이용자 본인에게 있습니다. 데이터 출처는 금융감독원 전자공시시스템(DART)이며, 원문과 다를 수 있으므로 반드시 원문을 확인하세요.'}
    </p>
  )
}
