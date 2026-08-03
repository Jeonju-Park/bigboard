/**
 * market.ts — 국장(kr) / 미장(us) 전환.
 *
 * 시장은 데이터 경로를 가르는 축이다 (`data/kr/*.json` vs `data/us/*.json`).
 * 그래서 값이 바뀌면 **data.ts 캐시를 반드시 비워야** 한다 — 안 그러면
 * 국장 화면에 미장 데이터가 남는다. 그 연결은 data.ts 가 구독해서 처리한다.
 *
 * ⚠️ 두 시장은 데이터의 성격이 다르다. 화면이 이 차이를 지우면 거짓말이 된다.
 *
 *   국장 — DART 공시. 금액이 **정확**하다 (단가x수량)
 *   미장 — 의회 신고는 금액이 **구간**이다 ($1,001~$15,000 중 하나로만 신고)
 *          기관 13F 는 **분기말 스냅샷 + 최대 45일 지연**이다
 *
 * 통화·금액 표기·기준 라벨이 시장마다 달라야 하는 이유가 여기 있다.
 */
import { useSyncExternalStore } from 'react'

export type Market = 'kr' | 'us'

const KEY = 'bigboard.market.v1'
/** 기존 이용자는 국장을 보고 있었다. 조용히 미장으로 바뀌면 안 된다 */
const DEFAULT: Market = 'kr'

export interface MarketMeta {
  id: Market
  /** 탭·칩에 쓰는 짧은 이름 */
  label: string
  /** 온보딩·설정에서 쓰는 설명 */
  description: string
  currency: 'KRW' | 'USD'
  /** 이 시장에서 추적하는 '큰손'의 종류 — 카피에 그대로 쓴다 */
  actors: string
}

export const MARKETS: Record<Market, MarketMeta> = {
  kr: {
    id: 'kr',
    label: '국내장',
    description: '코스피·코스닥 상장사의 임원·주요주주 공시',
    currency: 'KRW',
    actors: '내부자 · 고위공직자',
  },
  us: {
    id: 'us',
    label: '미국장',
    description: '뉴욕·나스닥 상장사의 내부자·의회·기관 공시',
    currency: 'USD',
    actors: '내부자 · 하원의원 · 기관',
  },
}

const listeners = new Set<() => void>()

function isMarket(v: unknown): v is Market {
  return v === 'kr' || v === 'us'
}

let current: Market = (() => {
  try {
    const raw = localStorage.getItem(KEY)
    return isMarket(raw) ? raw : DEFAULT
  } catch {
    // 사파리 프라이빗 모드 등에서 localStorage 접근 자체가 throw 한다
    return DEFAULT
  }
})()

export function getMarket(): Market {
  return current
}

export function setMarket(next: Market): void {
  if (next === current) return
  current = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    // 저장이 안 돼도 이번 세션 동안은 동작해야 한다
  }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useMarket(): Market {
  return useSyncExternalStore(subscribe, getMarket, () => DEFAULT)
}

/** data.ts 가 캐시를 비우려고 구독한다. 화면보다 **먼저** 실행돼야 한다 */
export function onMarketChange(fn: (m: Market) => void): () => void {
  return subscribe(() => fn(current))
}
