import Icon from './Icon'
import styles from './BookmarkButton.module.css'

/**
 * 북마크(팔로우) 토글 — 텍스트 칩 대신 아이콘 버튼.
 *
 * 리스트에서 "팔로잉" 글자 칩은 폭을 많이 먹어 정작 중요한 금액을 밀어낸다.
 * 아이콘 하나면 44pt 터치 타깃 안에서 상태를 다 표현할 수 있다.
 * 활성 색은 coral 을 쓴다 — 채워진 아이콘은 '면'에 가깝고, 화면에 한두 개만 켜지므로
 * 면적 예산(§2)을 넘기지 않는다.
 */
export default function BookmarkButton({
  active,
  onToggle,
  label = '팔로우',
}: {
  active: boolean
  onToggle: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `${label} 해제` : label}
      className={styles.button}
      onClick={(e) => {
        // 행 전체가 링크인 자리에서도 버튼만 눌리게 한다
        e.preventDefault()
        e.stopPropagation()
        onToggle()
      }}
    >
      <Icon name="bookmark" filled={active} className={active ? styles.on : styles.off} />
    </button>
  )
}
