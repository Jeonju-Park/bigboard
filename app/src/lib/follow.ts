/**
 * follow.ts — 팔로우 · 최근 본 항목 · 증권사 설정 (localStorage).
 *
 * M1 은 로그인이 없으므로 전부 기기에만 저장한다.
 * 노션 오픈이슈 O5(팔로우 저장 방식)가 정해지면 여기가 마이그레이션 지점이 된다.
 */
import { useSyncExternalStore } from 'react'
import type { BrokerId } from './broker'

export type { BrokerId }

const KEYS = {
  persons: 'bigboard.follow.persons.v1',
  stocks: 'bigboard.follow.stocks.v1',
  recent: 'bigboard.recent.v1',
  broker: 'bigboard.broker.v1',
} as const

type Key = (typeof KEYS)[keyof typeof KEYS]

const listeners = new Set<() => void>()
function emit() {
  listeners.forEach((l) => l())
}

function read<T>(key: Key, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: Key, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 사파리 프라이빗 모드 등 — 저장 실패해도 앱은 계속 동작해야 한다
  }
  emit()
}

/** useSyncExternalStore 로 여러 화면이 같은 팔로우 상태를 보게 한다 */
function subscribe(cb: () => void) {
  listeners.add(cb)
  // 다른 탭에서 바뀐 것도 반영
  window.addEventListener('storage', cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('storage', cb)
  }
}

// 스냅샷은 참조가 안정적이어야 무한 리렌더가 안 난다 — 값이 바뀔 때만 새 배열을 만든다
const snapshots = new Map<Key, { raw: string | null; value: unknown }>()
function snapshot<T>(key: Key, fallback: T): T {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(key)
  } catch {
    /* noop */
  }
  const cached = snapshots.get(key)
  if (cached && cached.raw === raw) return cached.value as T
  const value = raw ? (JSON.parse(raw) as T) : fallback
  snapshots.set(key, { raw, value })
  return value
}

const EMPTY: string[] = []

function useList(key: Key): string[] {
  return useSyncExternalStore(
    subscribe,
    () => snapshot<string[]>(key, EMPTY),
    () => EMPTY,
  )
}

// ── 인물 팔로우 ───────────────────────────────────────────────────────────────

export function useFollowedPersons(): string[] {
  return useList(KEYS.persons)
}

export function toggleFollowPerson(id: string): void {
  const cur = read<string[]>(KEYS.persons, [])
  write(KEYS.persons, cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])
}

// ── 종목 팔로우 ───────────────────────────────────────────────────────────────

export function useFollowedStocks(): string[] {
  return useList(KEYS.stocks)
}

export function toggleFollowStock(code: string): void {
  const cur = read<string[]>(KEYS.stocks, [])
  write(KEYS.stocks, cur.includes(code) ? cur.filter((x) => x !== code) : [...cur, code])
}

// ── 최근 본 항목 (S5 탐색) ────────────────────────────────────────────────────

export type RecentItem = { kind: 'person' | 'stock'; id: string; label: string }

export function useRecent(): RecentItem[] {
  return useSyncExternalStore(
    subscribe,
    () => snapshot<RecentItem[]>(KEYS.recent, [] as RecentItem[]),
    () => [] as RecentItem[],
  )
}

export function pushRecent(item: RecentItem): void {
  const cur = read<RecentItem[]>(KEYS.recent, [])
  const next = [item, ...cur.filter((x) => !(x.kind === item.kind && x.id === item.id))].slice(0, 10)
  write(KEYS.recent, next)
}

// ── 증권사 설정 (S8 마이 · S2 거래 바로가기) ──────────────────────────────────

/**
 * 선택된 증권사 id 저장만 담당한다.
 * 목록·딥링크 생성은 lib/broker.ts 로 분리했다 (플랫폼 분기 로직이 붙어서).
 */
export function useBroker(): BrokerId {
  return useSyncExternalStore(
    subscribe,
    () => snapshot<BrokerId>(KEYS.broker, 'none'),
    () => 'none' as BrokerId,
  )
}

export function setBroker(id: BrokerId): void {
  write(KEYS.broker, id)
}

/** 개발·QA 용 초기화 */
export function clearAll(): void {
  for (const k of Object.values(KEYS)) {
    try {
      localStorage.removeItem(k)
    } catch {
      /* noop */
    }
  }
  snapshots.clear()
  emit()
}
