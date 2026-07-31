/**
 * visit.ts — 첫 방문 판단 (localStorage).
 * M1 은 로그인이 없으므로 온보딩 노출 여부를 기기에만 저장한다.
 * 노션 오픈이슈 O5(팔로우 저장 방식)가 정해지면 이 키도 함께 마이그레이션 대상이 된다.
 */

const ONBOARDED_KEY = 'bigboard.onboarded.v1'

/** localStorage 는 사파리 프라이빗 모드 등에서 던질 수 있어 전부 감싼다 */
function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // 저장 못 해도 앱은 동작해야 한다 — 매번 온보딩이 뜰 뿐
  }
}

export function hasOnboarded(): boolean {
  return safeGet(ONBOARDED_KEY) === '1'
}

export function markOnboarded(): void {
  safeSet(ONBOARDED_KEY, '1')
}

/** 개발·QA 용 — 온보딩을 다시 보고 싶을 때 */
export function resetOnboarding(): void {
  try {
    localStorage.removeItem(ONBOARDED_KEY)
  } catch {
    /* noop */
  }
}
