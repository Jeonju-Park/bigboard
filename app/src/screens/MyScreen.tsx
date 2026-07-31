import { useMemo } from 'react'
import Screen from '@/shared/components/Screen'
import { Button } from '@/shared/components/Controls'
import { FollowChip, PersonRow } from '@/shared/components/Rows'
import { Disclaimer, EmptyState, ErrorState, FreshnessLabel, LoadingState, SectionHeader } from '@/shared/components/Feedback'
import { getMeta, getPersons, getStocks } from '@/lib/data'
import { useAsync } from '@/lib/useData'
import {
  BROKERS, clearAll, setBroker, toggleFollowPerson, toggleFollowStock,
  useBroker, useFollowedPersons, useFollowedStocks,
} from '@/lib/follow'
import { formatDateTime } from '@/lib/format'
import homeStyles from './HomeScreen.module.css'
import styles from './MyScreen.module.css'

/** S8 마이 — 팔로우 관리 / 증권사 설정 / 알림(M3) / 출처·고지 */
export default function MyScreen() {
  const followedPersons = useFollowedPersons()
  const followedStocks = useFollowedStocks()
  const brokerId = useBroker()

  const { state, data, error, retry } = useAsync(async () => {
    const [persons, stocks, meta] = await Promise.all([getPersons(), getStocks(), getMeta()])
    return { persons, stocks, meta }
  })

  const persons = useMemo(
    () => (data ? data.persons.filter((p) => followedPersons.includes(p.id)) : []),
    [data, followedPersons],
  )
  const stocks = useMemo(
    () => (data ? data.stocks.filter((s) => followedStocks.includes(s.code)) : []),
    [data, followedStocks],
  )

  if (state === 'loading') return <Screen title="마이"><LoadingState rows={2} /></Screen>
  if (state === 'error') return <Screen title="마이"><ErrorState message={error?.message} onRetry={retry} /></Screen>

  return (
    <Screen title="마이">
      <section>
        <SectionHeader title="팔로우한 인물" note={`${persons.length}명`} />
        {persons.length ? (
          persons.map((p) => (
            <PersonRow key={p.id} person={p} right={<FollowChip following onToggle={() => toggleFollowPerson(p.id)} />} />
          ))
        ) : (
          <EmptyState
            icon="person_add"
            title="팔로우한 인물이 없습니다"
            micro="큰손들은 기다려주지 않습니다만,"
            actionLabel="탐색에서 찾기"
            actionTo="/explore"
          />
        )}
      </section>

      {stocks.length > 0 && (
        <section>
          <SectionHeader title="팔로우한 종목" note={`${stocks.length}개`} />
          {stocks.map((s) => (
            <div key={s.code} className={styles.row}>
              <div>
                <p className="ty-label" style={{ margin: 0 }}>{s.name}</p>
                <p className="ty-num ty-caption" style={{ margin: 0 }}>{s.code}</p>
              </div>
              <FollowChip following onToggle={() => toggleFollowStock(s.code)} />
            </div>
          ))}
        </section>
      )}

      <section>
        <SectionHeader title="거래 바로가기 증권사" />
        <div role="radiogroup" aria-label="증권사 선택">
          {BROKERS.map((b) => (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={brokerId === b.id}
              className={`ty-body ${styles.radio}`}
              onClick={() => setBroker(b.id)}
            >
              <span className={styles.dot} aria-hidden="true" />
              {b.name}
            </button>
          ))}
        </div>
        <p className="ty-micro" style={{ marginTop: 'var(--space-2)' }}>
          링크로 이동만 하며, 주문은 증권사 앱에서 직접 하셔야 합니다. 빅보드는 주문을 대신 넣지 않습니다.
          앱 딥링크는 아직 검증 전이라 각 사 공식 웹페이지로 연결합니다.
        </p>
      </section>

      <section>
        <SectionHeader title="알림" />
        <Button block disabled>알림 설정 (앱 출시 시 제공)</Button>
      </section>

      <section>
        <SectionHeader title="데이터 출처와 고지" />
        <ul className={`ty-body-s ${styles.list}`}>
          {data?.meta.sources.map((s) => <li key={s}>{s}</li>)}
          <li>고위공직자 재산 데이터는 아직 포함되지 않았습니다 (연 1회 공개, 이후 반영 예정)</li>
          {!data?.meta.priceDataAvailable && <li>시세 정보는 아직 연결되지 않아 관련 항목을 표시하지 않습니다</li>}
        </ul>
        <div style={{ marginTop: 'var(--space-3)' }}>
          <Disclaimer />
        </div>
        <p className="ty-caption" style={{ marginTop: 'var(--space-3)' }}>
          마지막 수집: {data?.meta.lastUpdated ? formatDateTime(data.meta.lastUpdated) : '수집 전'} · 버전 v0.1.0
        </p>
      </section>

      <section>
        <SectionHeader title="저장된 정보" />
        <p className="ty-body-s" style={{ margin: '0 0 var(--space-3)' }}>
          팔로우·최근 본 항목·증권사 설정은 이 기기에만 저장됩니다. 계정도 서버 전송도 없습니다.
        </p>
        <Button variant="secondary" onClick={() => { if (confirm('저장된 팔로우와 설정을 모두 지울까요?')) clearAll() }}>
          저장된 정보 지우기
        </Button>
      </section>

      <footer className={homeStyles.footer}>
        {data?.meta && <FreshnessLabel lastUpdated={data.meta.lastUpdated} />}
      </footer>
    </Screen>
  )
}
