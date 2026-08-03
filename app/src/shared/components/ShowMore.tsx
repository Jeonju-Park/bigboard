import { useState } from 'react'
import homeStyles from '@/screens/HomeScreen.module.css'

/**
 * ShowMore — 긴 목록을 접어 두고 눌러서 펼친다.
 *
 * 종목 상세가 문제였다. 삼성전자는 내부자 공시가 745건, 보유 공직자가 72명이라
 * 그대로 다 그리면 화면이 끝없이 이어져 아래 섹션에 닿을 수가 없었다.
 *
 * 접힌 개수를 **버튼에 그대로 적는다** — 몇 개가 숨어 있는지 모르면
 * '이게 전부'라고 오해한다. 남은 게 적으면 그냥 다 편다(버튼이 더 번거롭다).
 */
export default function ShowMore<T>({
  items,
  initial = 5,
  step = 20,
  label = '건',
  children,
}: {
  items: T[]
  /** 처음 보여줄 개수 */
  initial?: number
  /** 한 번 누를 때 늘어나는 개수 */
  step?: number
  /** 버튼에 쓸 단위 ('건' · '명' 등) */
  label?: string
  children: (visible: T[]) => React.ReactNode
}) {
  const [limit, setLimit] = useState(initial)
  // 남은 게 두어 개면 버튼을 누르게 하는 편이 더 번거롭다
  const shown = items.length - limit <= 2 ? items.length : limit
  const rest = items.length - shown

  return (
    <>
      {children(items.slice(0, shown))}
      {rest > 0 && (
        <button
          type="button"
          className={`ty-body ${homeStyles.more}`}
          onClick={() => setLimit((l) => l + step)}
        >
          {rest.toLocaleString()}{label} 더 보기
        </button>
      )}
    </>
  )
}
