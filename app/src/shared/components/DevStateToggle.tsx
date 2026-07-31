import type { ForcedState } from '@/lib/useData'
import styles from './DevStateToggle.module.css'

/**
 * 개발용 상태 토글 — 화면 우상단(앱바 액션 슬롯).
 * 상태 4종(정상/로딩/빈/에러)을 실제로 눌러 확인하기 위한 장치이며,
 * 배포 빌드에서는 렌더하지 않는다.
 */
export default function DevStateToggle({
  value,
  onChange,
}: {
  value: ForcedState
  onChange: (s: ForcedState) => void
}) {
  if (!import.meta.env.DEV) return null
  const opts: { v: ForcedState; label: string }[] = [
    { v: null, label: '정상' },
    { v: 'loading', label: '로딩' },
    { v: 'empty', label: '빈' },
    { v: 'error', label: '에러' },
  ]
  return (
    <div className={styles.wrap} role="group" aria-label="개발용 상태 전환">
      {opts.map((o) => (
        <button
          key={o.label}
          type="button"
          aria-pressed={value === o.v}
          className={`ty-micro ${styles.btn}`}
          onClick={() => onChange(o.v)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
