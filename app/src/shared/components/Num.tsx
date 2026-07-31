import type { ReactNode } from 'react'

/**
 * Num — 모든 숫자는 이 컴포넌트를 거친다 (§3).
 * IBM Plex Mono + tabular-nums 로 자릿수를 정렬한다.
 */
export function Num({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={['ty-num', className].filter(Boolean).join(' ')}>{children}</span>
}

/**
 * Emph — 본문 안 강조의 **최대치** (§3): Numeric + 600 + ink.
 * 배경·색·밑줄·크기 키우기는 금지. 더 강조할 값은 Promote 로 문장 밖에 내보낸다.
 */
export function Emph({ children }: { children: ReactNode }) {
  return <span className="ty-emph">{children}</span>
}

/**
 * Promote — 문장 밖으로 승격된 값 (§3). 22px Mono 700 + 11px 라벨.
 * 화면에서 가장 중요한 수치 하나에만 쓴다.
 */
export function Promote({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="ty-promote-label">{label}</div>
      <div className="ty-promote">{value}</div>
    </div>
  )
}
