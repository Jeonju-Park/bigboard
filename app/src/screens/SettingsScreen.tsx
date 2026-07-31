import { useState } from 'react'
import Screen from '@/shared/components/Screen'
import { ListGroup, ListRow } from '@/shared/components/ListSection'
import { OptionSheet } from '@/shared/components/BottomSheet'
import { ErrorState, LoadingState, SectionHeader, Disclaimer } from '@/shared/components/Feedback'
import { getMeta } from '@/lib/data'
import { useAsync } from '@/lib/useData'
import { clearAll, setBroker, useBroker, type BrokerId } from '@/lib/follow'
import { BROKERS, brokerStoreUrl, detectPlatform } from '@/lib/broker'
import { resetOnboarding } from '@/lib/visit'
import { formatDate, formatDateTime } from '@/lib/format'
import styles from './SettingsScreen.module.css'

/**
 * 설정 — 마이에서 분리했다.
 *
 * 마이는 '내가 모아둔 것', 설정은 '앱이 동작하는 방식'이다. 한 화면에 있으면
 * 팔로우 목록을 보러 들어왔다가 고지문·초기화 버튼까지 스크롤해야 한다.
 *
 * 계정 항목은 로그인 도입 대비로 자리만 잡아두고 비활성으로 둔다 —
 * 동작하지 않는 버튼을 눌리게 두면 신뢰를 잃는다.
 */
export default function SettingsScreen() {
  const brokerId = useBroker()
  const [sheet, setSheet] = useState<'broker' | null>(null)
  const { state, data, error, retry } = useAsync(getMeta)

  const broker = BROKERS.find((b) => b.id === brokerId) ?? BROKERS[0]
  const platform = detectPlatform()
  const storeUrl = brokerStoreUrl(broker, platform)

  if (state === 'loading') return <Screen title="설정" showBack><LoadingState rows={2} /></Screen>
  if (state === 'error')
    return <Screen title="설정" showBack><ErrorState message={error?.message} onRetry={retry} /></Screen>

  return (
    <Screen title="설정" showBack>
      <section>
        <SectionHeader title="계정" />
        <ListGroup>
          <ListRow icon="login" label="로그인" note="준비 중입니다" disabled />
          <ListRow icon="sync" label="기기 간 동기화" note="로그인하면 팔로우 목록을 함께 씁니다" disabled />
        </ListGroup>
        <p className="ty-micro" style={{ marginTop: 'var(--space-2)' }}>
          지금은 계정 없이 동작합니다. 저장한 항목은 이 기기에만 있습니다.
        </p>
      </section>

      <section>
        <SectionHeader title="거래" />
        <ListGroup>
          <ListRow
            icon="account_balance"
            label="증권사"
            note={broker.appName ? `${broker.appName} 앱을 엽니다` : '거래 바로가기가 열리는 곳'}
            value={broker.name}
            onClick={() => setSheet('broker')}
          />
        </ListGroup>
        <p className="ty-micro" style={{ marginTop: 'var(--space-2)' }}>
          빅보드는 주문을 대신 넣지 않습니다. 종목이나 주문 정보를 넘기지 않고 앱만 엽니다.
          {platform === 'android'
            ? ' 앱이 설치돼 있으면 앱이, 없으면 증권사 웹페이지가 열립니다.'
            : ' 앱이 설치돼 있으면 앱이, 없으면 증권사 웹페이지가 열립니다. (iOS 는 증권사가 앱 연결을 등록해 둔 경우에만 앱이 열립니다)'}
        </p>
        {storeUrl && (
          <p className="ty-micro" style={{ marginTop: 'var(--space-1)' }}>
            <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="tap-safe">
              {broker.appName} 앱 설치하기
            </a>
          </p>
        )}
      </section>

      <section>
        <SectionHeader title="알림" />
        <ListGroup>
          <ListRow icon="notifications" label="새 공시 알림" note="앱 출시 시 제공" disabled />
          <ListRow icon="event_upcoming" label="예고 거래 알림" note="앱 출시 시 제공" disabled />
        </ListGroup>
      </section>

      <section>
        <SectionHeader title="데이터 출처" />
        <ListGroup>
          {data?.sources.map((s) => (
            <ListRow key={s} icon="database" label={s} isStatic />
          ))}
          <ListRow
            icon="how_to_reg"
            label="고위공직자 재산공개"
            note={
              data?.officialsAsOf
                ? `${formatDate(data.officialsAsOf)} 기준 · 연 1회 공개`
                : '아직 포함되지 않았습니다'
            }
            isStatic
          />
          {!data?.priceDataAvailable && (
            <ListRow icon="show_chart" label="시세 정보" note="아직 연결되지 않아 관련 항목을 숨깁니다" isStatic />
          )}
          <ListRow
            icon="schedule"
            label="마지막 수집"
            value={data?.lastUpdated ? formatDateTime(data.lastUpdated) : '수집 전'}
            isStatic
          />
        </ListGroup>
      </section>

      <section>
        <SectionHeader title="고지" />
        <div className={styles.disclaimerBox}>
          <Disclaimer />
        </div>
      </section>

      <section>
        <SectionHeader title="저장된 정보" />
        <ListGroup>
          <ListRow
            icon="restart_alt"
            label="온보딩 다시 보기"
            onClick={() => {
              resetOnboarding()
              location.hash = '#/landing'
            }}
          />
          <ListRow
            icon="delete_outline"
            label="저장된 정보 지우기"
            note="팔로우·최근 본 항목·증권사 설정"
            onClick={() => {
              if (confirm('저장된 팔로우와 설정을 모두 지울까요? 되돌릴 수 없습니다.')) clearAll()
            }}
          />
        </ListGroup>
        <p className="ty-micro" style={{ marginTop: 'var(--space-2)' }}>
          계정도 서버 전송도 없습니다. 전부 이 기기에만 저장됩니다.
        </p>
      </section>

      <p className="ty-caption" style={{ margin: 0, textAlign: 'center' }}>
        빅보드 v0.1.0
      </p>

      <OptionSheet
        open={sheet === 'broker'}
        title="증권사"
        options={BROKERS.map((b) => ({
          value: b.id as BrokerId,
          label: b.name,
          note: b.appName ?? undefined,
        }))}
        value={brokerId}
        onSelect={setBroker}
        onClose={() => setSheet(null)}
      />
    </Screen>
  )
}
