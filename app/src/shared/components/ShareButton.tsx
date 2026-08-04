import { useState } from 'react'
import Icon from './Icon'
import { Button } from './Controls'
import { getMarket } from '@/lib/market'

/**
 * ShareButton — 지금 보고 있는 화면의 링크를 공유한다.
 *
 * ⚠️ URL 에 **시장을 실어야 한다.**
 *    HashRouter 라 `#/stock/NVDA` 는 그 자체로 주소지만, 어느 시장의 NVDA 인지는
 *    받는 사람의 localStorage 가 정한다. 미장 종목 링크를 국장 이용자가 열면
 *    "종목을 찾을 수 없습니다"가 뜬다. 링크를 보낸 쪽은 멀쩡히 보였으니
 *    무엇이 잘못됐는지도 알 수 없다.
 *    그래서 `?m=us` 를 붙이고, market.ts 가 앱 시작 시 이 값을 읽는다.
 *
 * navigator.share 가 없으면(데스크톱 브라우저 다수) 클립보드로 떨어뜨리고
 * "복사됨"을 보여준다 — 아무 반응이 없으면 눌렸는지조차 알 수 없다.
 */
export default function ShareButton({
  text,
  /**
   * URL 에 함께 실을 화면 상태 (랭킹의 탭·기간 등).
   * 이게 없으면 '순매도 90일'을 보다가 공유해도 상대는 기본값인 '순매수 30일'을 본다.
   */
  params,
}: {
  text: string
  params?: Record<string, string>
}) {
  const [copied, setCopied] = useState(false)

  function buildUrl(): string {
    const url = new URL(location.href)
    url.searchParams.set('m', getMarket())
    for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v)
    return url.href
  }

  async function share() {
    const url = buildUrl()
    if (navigator.share) {
      try {
        await navigator.share({ title: '빅보드', text, url })
        return
      } catch {
        // 사용자가 공유 시트를 닫은 경우. 클립보드로 떨어뜨리지 않는다
        return
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 클립보드 권한이 없으면 할 수 있는 게 없다
    }
  }

  return (
    <Button variant="text" onClick={share}>
      <Icon name={copied ? 'check' : 'share'} size="sm" /> {copied ? '링크 복사됨' : '공유'}
    </Button>
  )
}
