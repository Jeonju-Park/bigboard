/**
 * Icon — Material Symbols Rounded 래퍼 (§6).
 * 이모지는 전면 금지이므로 모든 픽토그램은 이 컴포넌트를 거친다.
 *
 * 아이콘은 리거처(문자열)로 렌더되므로 스크린리더가 글자를 읽어버린다.
 * 기본은 aria-hidden 이고, 아이콘만으로 의미를 전달할 때만 label 을 준다.
 */
type Props = {
  /** Material Symbols 이름 (예: 'radar', 'trending_up') */
  name: string
  /** 20px | 24px — §6 이 정한 두 규격만 */
  size?: 'sm' | 'md'
  /** 채움 여부 — 활성 탭 표시 등에 쓴다 */
  filled?: boolean
  /** 지정하면 img 역할 + 접근 이름. 생략하면 장식용(aria-hidden) */
  label?: string
  className?: string
}

export default function Icon({ name, size = 'md', filled = false, label, className }: Props) {
  const cls = ['msr', className].filter(Boolean).join(' ')
  return (
    <span
      className={cls}
      data-size={size === 'sm' ? '20' : undefined}
      data-fill={filled ? '1' : undefined}
      translate="no"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {name}
    </span>
  )
}
