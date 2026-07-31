import { useEffect, useState } from 'react'
import Screen from '@/shared/components/Screen'
import DisclosureCard from '@/shared/components/DisclosureCard'
import { SegmentTab, FilterChips, Button } from '@/shared/components/Controls'
import { PersonRow, FollowChip, RankingRow, StockInfoList, PersonTypeBadge } from '@/shared/components/Rows'
import {
  SectionHeader,
  FreshnessLabel,
  StaleBanner,
  LoadingState,
  EmptyState,
  ErrorState,
  Disclaimer,
} from '@/shared/components/Feedback'
import { Emph, Num, Promote } from '@/shared/components/Num'
import Placeholder from '@/shared/components/Placeholder'
import Icon from '@/shared/components/Icon'
import { getDisclosures, getMeta, getPersons, getRankings } from '@/lib/data'
import type { Disclosure, Meta, Person, Rankings } from '@/lib/types'
import { formatAmountFull, formatAmountShort, formatWon } from '@/lib/format'

/**
 * /dev-gallery — 개발용 컴포넌트 갤러리 (STEP 3).
 *
 * 목데이터가 아니라 **실제 수집된 공시**로 렌더한다. 극단값(긴 회사명·큰 금액·단가 null·
 * 세부내역 다건)에서 깨지지 않는지 여기서 먼저 확인한다.
 * 배포 대상 화면이 아니며 탭에도 노출하지 않는다.
 */
export default function DevGalleryScreen() {
  const [data, setData] = useState<{ d: Disclosure[]; p: Person[]; r: Rankings; m: Meta } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [seg, setSeg] = useState<'breaking' | 'following'>('breaking')
  const [chips, setChips] = useState<string[]>(['buy'])
  const [following, setFollowing] = useState(false)

  useEffect(() => {
    Promise.all([getDisclosures(), getPersons(), getRankings(), getMeta()])
      .then(([d, p, r, m]) => setData({ d, p, r, m }))
      .catch((e) => setErr(String(e)))
  }, [])

  if (err) return <Screen title="컴포넌트 갤러리"><ErrorState message={err} /></Screen>
  if (!data) return <Screen title="컴포넌트 갤러리"><LoadingState /></Screen>

  const { d, p, r, m } = data

  // 극단값 골라내기 — 갤러리의 목적은 "예쁜 케이스"가 아니라 "깨지는 케이스" 확인이다
  const longestCompany = [...d].sort((a, b) => b.company.length - a.company.length)[0]
  const biggestAmount = [...d].filter((x) => x.totalAmount).sort((a, b) => b.totalAmount! - a.totalAmount!)[0]
  const nullPrice = d.find((x) => x.unitPrice === null)
  const manyDetails = [...d].sort((a, b) => b.details.length - a.details.length)[0]
  const planned = d.find((x) => x.isPlanned)
  const amended = d.find((x) => x.isAmended)
  const sell = d.find((x) => x.direction === 'sell')

  const cases: [string, Disclosure | undefined][] = [
    ['가장 긴 회사명', longestCompany],
    ['가장 큰 금액', biggestAmount],
    ['단가 없음(무상·복수단가)', nullPrice],
    [`세부내역 최다 (${manyDetails?.details.length}건)`, manyDetails],
    ['예고(거래계획)', planned],
    ['정정 공시', amended],
    ['매도', sell],
  ]

  const top = r.netBuy['30'].slice(0, 5)
  const max = top[0]?.amount ?? 0

  return (
    <Screen title="컴포넌트 갤러리">
      <StaleBanner lastUpdated={m.lastUpdated} />

      <section>
        <SectionHeader title="데이터 상태" note={<FreshnessLabel lastUpdated={m.lastUpdated} />} />
        <StockInfoList
          items={[
            { term: '공시', value: `${m.counts.disclosures.toLocaleString()}건` },
            { term: '인물', value: `${m.counts.persons.toLocaleString()}명` },
            { term: '종목', value: `${m.counts.stocks.toLocaleString()}개` },
            { term: '스킵', value: `${m.skipped.total}건` },
            { term: '시세 소스', value: m.priceDataAvailable ? '연결됨' : '미연결 (항목 숨김)' },
          ]}
        />
      </section>

      <section>
        <SectionHeader title="DisclosureCard — 극단값" note="깨지는 케이스 우선" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {cases.map(([label, item]) =>
            item ? (
              <div key={label}>
                <p className="ty-micro" style={{ margin: '0 0 var(--space-1)' }}>
                  {label}
                </p>
                <DisclosureCard d={item} />
              </div>
            ) : null,
          )}
        </div>
      </section>

      <section>
        <SectionHeader title="SegmentTab" />
        <SegmentTab
          label="갤러리 세그먼트"
          value={seg}
          onChange={setSeg}
          options={[
            { value: 'breaking', label: '속보' },
            { value: 'following', label: '팔로우' },
          ]}
        />
      </section>

      <section>
        <SectionHeader title="FilterChip" note={`선택: ${chips.join(', ') || '없음'}`} />
        <FilterChips
          label="갤러리 필터"
          selected={chips}
          onToggle={(v) => setChips((c) => (c.includes(v) ? c.filter((x) => x !== v) : [...c, v]))}
          options={[
            { value: 'buy', label: '매수만' },
            { value: 'sell', label: '매도만' },
            { value: 'big', label: '대형 10억+' },
            { value: 'planned', label: '예고' },
          ]}
        />
      </section>

      <section>
        <SectionHeader title="PersonRow · FollowChip · 유형 배지" />
        {p.slice(0, 4).map((person) => (
          <PersonRow
            key={person.id}
            person={person}
            right={<FollowChip following={following} onToggle={() => setFollowing((f) => !f)} />}
          />
        ))}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
          <PersonTypeBadge type="insider" />
          <PersonTypeBadge type="official" />
        </div>
      </section>

      <section>
        <SectionHeader title="RankingRow — 레이스 바" note="30일 순매수 · 집계 기준: 단가가 확인된 공시만" />
        {top.map((e) => (
          <RankingRow key={e.personId} entry={e} max={max} />
        ))}
      </section>

      <section>
        <SectionHeader title="StockInfoList — null 행 숨김" />
        <StockInfoList
          items={[
            { term: '전일종가', value: null },
            { term: 'PER', value: null },
            { term: '표시되는 항목', value: '값이 있는 행만 렌더됩니다' },
          ]}
        />
        <p className="ty-micro" style={{ margin: 'var(--space-2) 0 0' }}>
          위에서 전일종가·PER 행이 아예 없는 게 정상입니다 — 값을 지어내지 않습니다
        </p>
      </section>

      <section>
        <SectionHeader title="타이포 강조 3단계" />
        <p className="ty-body" style={{ margin: 0 }}>
          본문 안 최대 강조는 <Emph>{formatWon(biggestAmount?.unitPrice ?? 5120)}</Emph> 까지입니다.
        </p>
        <p className="ty-body" style={{ margin: 'var(--space-2) 0' }}>
          리스트 표기: <Num>{formatAmountShort(biggestAmount?.totalAmount ?? null)}</Num>
        </p>
        <Promote label="총 거래금액" value={formatAmountFull(biggestAmount?.totalAmount ?? null)} />
      </section>

      <section>
        <SectionHeader title="Button" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Button block>거래 바로가기</Button>
          <Button variant="secondary" block>
            DART 원문 보기
          </Button>
          <Button variant="text">공유</Button>
          <Button disabled block>
            알림 (앱 출시 시 제공)
          </Button>
        </div>
      </section>

      <section>
        <SectionHeader title="상태 4종 (§7)" />
        <LoadingState rows={2} />
        <EmptyState
          title="아직 아무도 팔로우하지 않으셨네요"
          micro="큰손들은 기다려주지 않습니다만,"
          actionLabel="탐색에서 찾아보기"
          actionTo="/explore"
        />
        <ErrorState onRetry={() => location.reload()} />
      </section>

      <section>
        <SectionHeader title="Placeholder · Icon" />
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          <Placeholder label="인물" size={48} />
          <Placeholder label="배너" ratio="wide" size={120} />
          <Icon name="radar" />
          <Icon name="trending_up" size="sm" />
          <Icon name="share" size="sm" />
        </div>
      </section>

      <section>
        <SectionHeader title="고지문 (BSR-CMN-01)" />
        <Disclaimer />
      </section>
    </Screen>
  )
}
