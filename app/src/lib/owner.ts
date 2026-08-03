/**
 * owner.ts — 거래 계좌의 주체 표기.
 *
 * 미국 의회 신고는 의원 **본인이 아닌** 거래가 많다.
 * 실제 수집 결과: 본인 1,367 · 자녀 221 · 공동 196 · 배우자 159.
 * 배우자 거래를 의원 본인 거래로 표시하면 실명 데이터에서 명백한 오보이므로
 * 화면은 본인이 아닌 건에 반드시 명의를 붙인다.
 */
import type { OwnerType } from './types'

const LABEL: Record<OwnerType, string> = {
  self: '본인',
  spouse: '배우자',
  child: '자녀',
  joint: '공동',
}

export function ownerLabel(o: OwnerType | null | undefined): string | null {
  return o ? (LABEL[o] ?? null) : null
}
