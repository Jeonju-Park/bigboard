import { useEffect, useRef } from 'react'
import Icon from './Icon'
import styles from './BottomSheet.module.css'

/**
 * BottomSheet — 짧은 선택지 목록용.
 *
 * <dialog modal> 을 쓰는 이유: 포커스 트랩·ESC 닫기·백드롭·inert 처리를
 * 브라우저가 해준다. 직접 구현하면 접근성 항목을 하나씩 빠뜨리게 된다.
 */
export function OptionSheet<T extends string>({
  open,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  open: boolean
  title: string
  options: readonly { value: T; label: string; note?: string }[]
  value: T
  onSelect: (v: T) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      onClose={onClose}
      // 백드롭(시트 바깥) 클릭으로 닫기
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      <div className={styles.inner}>
        <div className={styles.grabber} aria-hidden="true" />
        <h2 className={`ty-title-s ${styles.title}`}>{title}</h2>
        <div role="radiogroup" aria-label={title}>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={value === o.value}
              className={`ty-body ${styles.option}`}
              onClick={() => {
                onSelect(o.value)
                onClose()
              }}
            >
              <span>
                {o.label}
                {o.note && <span className="ty-caption"> · {o.note}</span>}
              </span>
              {value === o.value && <Icon name="check" size="sm" />}
            </button>
          ))}
        </div>
      </div>
    </dialog>
  )
}
