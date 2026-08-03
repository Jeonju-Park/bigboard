/**
 * source.ts — 원문 링크가 어디로 가는지 이름 붙이기.
 *
 * 버튼에 'DART 원문 보기'가 하드코딩돼 있었는데, 미장 공시에 그대로 붙으니
 * 미 하원 PDF 를 열면서 'DART' 라고 말하는 꼴이 됐다. URL 이 진실이므로 URL 로 판단한다.
 */
export function sourceLabel(url: string | null | undefined): string {
  if (!url) return '원문'
  if (url.includes('dart.fss.or.kr')) return 'DART'
  if (url.includes('sec.gov')) return 'SEC EDGAR'
  if (url.includes('disclosures-clerk.house.gov')) return '미 하원 공시'
  if (url.includes('gwanbo.go.kr')) return '관보'
  return '원문'
}
