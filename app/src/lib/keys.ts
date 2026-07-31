/**
 * keys.ts — 인물 식별자 생성.
 *
 * pipeline 의 derivePersons() 와 **같은 규칙**이어야 팔로우가 매칭된다.
 * 규칙이 어긋나면 팔로우 탭이 조용히 빈 화면이 되므로 한 곳에 고정한다.
 */
export function personKey(name: string, company: string): string {
  return `${company}-${name}`.replace(/\s+/g, '')
}
