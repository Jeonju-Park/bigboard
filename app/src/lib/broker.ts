/**
 * broker.ts — '거래 바로가기' 링크 생성.
 *
 * ⚠️ 법적 경계(CLAUDE.md 규칙 1): **링크로 이동만 한다.** 주문 파라미터를 실어 보내거나
 *    계좌를 연동하지 않는다. 종목 코드조차 넘기지 않는다 — 특정 종목 주문 화면으로
 *    바로 보내면 '권유'로 읽힐 여지가 생긴다. 앱을 열어주는 데서 멈춘다.
 *
 * ── 어떻게 앱을 여는가 (조사 결과) ────────────────────────────────────────────
 *
 * 증권 3사 모두 **커스텀 스킴을 공개 문서로 내지 않는다.** 검증 안 된 스킴을 넣으면
 * iOS 에서 "주소가 유효하지 않습니다" 오류창이 떠 앱이 고장난 것처럼 보인다.
 * 그래서 스킴을 추측하지 않고, 플랫폼별로 **검증 가능한 수단**만 쓴다.
 *
 *  · Android → `intent:` 스킴. 구글 플레이에서 확인한 **패키지명**으로 앱을 직접 실행하고,
 *              앱이 없으면 `S.browser_fallback_url` 로 크롬이 알아서 웹으로 보낸다.
 *              스킴 추측이 필요 없고 실패해도 웹으로 떨어지므로 안전하다.
 *  · iOS     → 증권사 웹 URL. 각 사가 유니버설 링크를 등록해 뒀다면 앱이 열리고,
 *              아니면 웹페이지가 열린다. 어느 쪽이든 오류창은 안 뜬다.
 *              (커스텀 스킴은 충돌 시 해결 수단이 없어 iOS 에서 특히 위험하다)
 *  · 데스크톱 → 웹 URL.
 *
 * ⚠️ 실기기 미검증: 이 환경에 안드로이드/아이폰이 없어 앱이 실제로 열리는지는 확인하지 못했다.
 *    다만 최악의 경우가 '웹페이지가 열림'(= 이전 동작)이라 회귀 위험은 없다.
 *    실기기에서 확인되면 BROKERS 의 verified 를 true 로 올린다.
 *
 * 패키지명 출처: Google Play 스토어 페이지 (2026-08 확인)
 */

export type BrokerId = 'none' | 'kiwoom' | 'mirae' | 'samsung'

export interface Broker {
  id: BrokerId
  name: string
  /** 앱 이름 — 사용자가 폰에서 찾는 이름과 맞춘다 */
  appName: string | null
  /** Google Play 패키지명. intent: 로 앱을 직접 실행하는 데 쓴다 */
  androidPackage: string | null
  /** 앱 미설치 시(그리고 iOS 에서) 열릴 웹 주소 */
  webUrl: string | null
  /** App Store 앱 ID. 확인된 것만 넣는다 */
  iosAppId: string | null
  /** 실기기에서 앱이 열리는 것까지 확인했는가 */
  verified: boolean
}

export const BROKERS: readonly Broker[] = [
  { id: 'none', name: '선택 안 함', appName: null, androidPackage: null, webUrl: null, iosAppId: null, verified: false },
  {
    id: 'kiwoom',
    name: '키움증권',
    appName: '영웅문S#',
    androidPackage: 'com.kiwoom.heromts',
    webUrl: 'https://www.kiwoom.com',
    iosAppId: null, // 대표 MTS 의 App Store ID 를 확인하지 못했다 — 추측하지 않는다
    verified: false,
  },
  {
    id: 'mirae',
    name: '미래에셋증권',
    appName: 'M-STOCK',
    androidPackage: 'com.miraeasset.trade',
    // 미래에셋이 직접 운영하는 앱 연결 페이지. 앱이 있으면 앱으로, 없으면 안내로 이어진다
    webUrl: 'https://securities.miraeasset.com/public/mts/html/AppLink.html',
    iosAppId: '1248716281',
    verified: false,
  },
  {
    id: 'samsung',
    name: '삼성증권',
    appName: 'mPOP',
    androidPackage: 'com.samsungpop.android.mpop',
    webUrl: 'https://www.samsungpop.com',
    iosAppId: '1150231646',
    verified: false,
  },
] as const

export function findBroker(id: BrokerId): Broker {
  return BROKERS.find((b) => b.id === id) ?? BROKERS[0]
}

type Platform = 'android' | 'ios' | 'other'

export function detectPlatform(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent): Platform {
  if (/android/i.test(ua)) return 'android'
  // iPadOS 13+ 는 UA 에 Macintosh 로 나오므로 터치 지원 여부로 갈라낸다
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1) return 'ios'
  return 'other'
}

/**
 * 실제로 <a href> 에 넣을 주소를 만든다.
 *
 * 자동 실행(location.href 대입)을 쓰지 않는 이유: 브라우저가 사용자 제스처 없는
 * 앱 전환을 막는다. 사용자가 직접 누르는 링크여야 열린다.
 */
export function brokerHref(broker: Broker, platform: Platform = detectPlatform()): string | null {
  if (!broker.webUrl) return null

  if (platform === 'android' && broker.androidPackage) {
    // 앱의 런처 액티비티를 직접 띄운다. 앱이 없으면 크롬이 fallback URL 로 보낸다.
    const fallback = encodeURIComponent(broker.webUrl)
    return [
      'intent:#Intent',
      `package=${broker.androidPackage}`,
      'action=android.intent.action.MAIN',
      'category=android.intent.category.LAUNCHER',
      `S.browser_fallback_url=${fallback}`,
      'end',
    ].join(';')
  }

  // iOS·데스크톱은 웹 주소. iOS 는 증권사가 유니버설 링크를 걸어 뒀다면 앱이 열린다.
  return broker.webUrl
}

/** 앱이 없을 때 안내할 스토어 주소 (설정 화면용) */
export function brokerStoreUrl(broker: Broker, platform: Platform = detectPlatform()): string | null {
  if (platform === 'android' && broker.androidPackage) {
    return `https://play.google.com/store/apps/details?id=${broker.androidPackage}`
  }
  if (platform === 'ios' && broker.iosAppId) {
    return `https://apps.apple.com/kr/app/id${broker.iosAppId}`
  }
  return null
}

/** 버튼에 쓸 문구 — 앱 이름을 알면 그걸 보여주는 편이 무엇이 열릴지 분명하다 */
export function brokerActionLabel(broker: Broker): string {
  if (!broker.webUrl) return '거래할 증권사 선택하기'
  return broker.appName ? `${broker.name} ${broker.appName} 열기` : `${broker.name}으로 이동`
}
