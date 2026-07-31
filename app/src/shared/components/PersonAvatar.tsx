import Icon from './Icon'
import type { PersonType } from '@/lib/types'
import styles from './PersonAvatar.module.css'

/**
 * 인물 유형 아바타 — 내부자는 회사(건물), 공직자는 사람(공공) 아이콘.
 *
 * 실명 인물의 사진을 쓰지 않는다(초상권·오인 위험). 유형을 알려주는 픽토그램만 쓴다.
 * 이모지는 금지이므로 Material Symbols 로 그린다(§6).
 */
export default function PersonAvatar({
  type,
  size = 'md',
}: {
  type: PersonType
  size?: 'md' | 'lg'
}) {
  const isOfficial = type === 'official'
  return (
    <span
      className={`${styles.avatar} ${size === 'lg' ? styles.lg : ''} ${isOfficial ? styles.official : styles.insider}`}
      aria-hidden="true"
    >
      <Icon name={isOfficial ? 'escalator_warning' : 'apartment'} size={size === 'lg' ? 'md' : 'sm'} />
    </span>
  )
}
