/**
 * Placeholder — 모든 이미지는 이 컴포넌트를 거친다 (§6).
 * 실제 이미지가 준비되면 이 한 곳만 바꾸면 된다.
 */
type Props = {
  label: string
  /** 프로필 1:1, 배너 16:9 */
  ratio?: 'square' | 'wide'
  /** 렌더 폭(px). 요청 URL 크기를 정한다 */
  size?: number
  className?: string
}

export default function Placeholder({ label, ratio = 'square', size = 48, className }: Props) {
  const w = size
  const h = ratio === 'square' ? size : Math.round((size * 9) / 16)
  const src = `https://placehold.co/${w * 2}x${h * 2}/F6F7F8/8A9199?text=${encodeURIComponent(label)}`
  return (
    <img
      src={src}
      width={w}
      height={h}
      alt=""
      aria-hidden="true"
      loading="lazy"
      className={className}
      style={{ borderRadius: ratio === 'square' ? 'var(--radius-chip)' : 'var(--radius-field)', display: 'block' }}
    />
  )
}
