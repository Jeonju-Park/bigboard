# figma_guide.md — 피그마 디자인 작업 가이드

> 목적: 클로드 디자인 v2 초안을 피그마에서 정식 디자인으로 완성하되, **클로드 코드로의 핸드오프가 깨지지 않게** 작업하는 규칙.
> 원칙: 피그마에서의 모든 구조적 결정(변수·오토레이아웃·네이밍)이 곧 코드 품질을 결정한다. 예쁘게 그리는 것보다 "기계가 읽을 수 있게" 그리는 것이 우선.

---

## 1. 파일 세팅

- 파일 1개, 페이지 구성: `00 Cover` / `01 Foundations` / `02 Components` / `03 Screens` / `99 Archive`
- 프레임: **360 × 800** (안드로이드 기준 유지 — 웹앱이지만 모바일 뷰포트 동일). 스크롤 화면은 높이 자유, 뷰포트 가이드만 표시
- 그리드: 4pt. 레이아웃 그리드에 좌우 마진 20px 컬럼 설정

## 2. Variables (토큰) — 가장 중요

디자인 시스템 문서 §2~4의 값을 **피그마 Variables로 등록**하고, 모든 색·간격은 변수 참조로만 사용 (raw HEX 직접 지정 금지). 코드의 tokens와 1:1 대응이 핸드오프의 핵심.

컬렉션 구성:
```
color/bg/primary=#FFFFFF · color/bg/secondary=#F6F7F8
color/gray/50~900 (9단계)
color/brand/marker=#FFD338 · color/ink=#17191C
color/semantic/buy=#D93B3B · color/semantic/sell=#2563A8
space/1=4 ... space/12=48
radius/sm=4 · radius/md=8 · radius/card=12
```
- 텍스트 스타일 8종을 L1~L5 계층 이름으로 등록: `L1/display-24-800`, `L2/title-s-17-600`, `L3/body-15-400`, `L4/caption-12-400`, `L5/micro-11-400`
- 폰트: Pretendard·IBM Plex Mono는 로컬 설치, Display(Paperlogy/Gmarket Sans)는 라이선스 확인 후 설치

## 3. 오토레이아웃 규칙 (코드의 flex와 1:1)

- **모든 프레임은 오토레이아웃**. 절대 위치는 마커 하이라이트 1곳만 예외
- 그룹핑을 간격으로 표현: 관련 요소 gap 4~8 / 그룹 사이 24 / 섹션 사이 40 — **간격값은 반드시 space 변수**
- 리스트는 디바이더(1px gray/200) + 상하 패딩 12~16, 카드 프레임 금지 (공시 카드만 예외: radius/card + 1px gray/200 보더)
- 텍스트는 hug, 컨테이너는 fill — 긴 이름(예: "메리츠금융지주")으로 넘침 테스트 후 truncate 설정

## 4. 컴포넌트화 대상 (이것만 컴포넌트로)

| 컴포넌트 | Variants | 비고 |
|---|---|---|
| DisclosureCard | direction(buy/sell) × size(feed/compact) | 단가×수량 caption 포함 |
| SegmentTab | selected(t/f) | ink 밑줄 |
| FilterChip | selected(t/f) | |
| PersonRow / FollowChip | type(insider/official) × following(t/f) | 유형 배지 포함 |
| RankingRow | rank(1-3/other) | 레이스 바 포함 |
| StockInfoList | - | 2열 정의 리스트 |
| Button | style(primary/text) × state(default/pressed/disabled) | |
| SectionHeader / AppBar / BottomNav / FreshnessLabel | - | |
| StatePlaceholder | kind(loading/empty/error) | |

- 네이밍: PascalCase, 프로퍼티는 camelCase — 코드 컴포넌트명과 동일하게 (클로드 코드가 이름으로 매핑)
- 아이콘: Material Symbols 플러그인 사용, 24px 프레임에 배치 후 컴포넌트화. 이모지 절대 금지

## 5. 화면 제작 순서 (03 Screens)

1. S1 홈(속보) → 2. S1 홈(팔로우·빈 상태 포함) → 3. S2 피드 상세 → 4. S3 인물 프로필 → 5. S4 종목 → 6. S5 탐색 → 7. S6 캘린더 → 8. S7 랭킹 → 9. S8 마이 → 10. W0·W1 온보딩
- 각 화면 프레임명: `S1-Home-Breaking`, `S1-Home-Follow-Empty` 형식 (화면ID-이름-상태)
- 상태 프레임: 핵심 화면(S1·S2)만 4종(정상/로딩/빈/에러), 나머지는 정상+빈
- 이미지 자리는 회색 사각형 + "IMG" 라벨 프레임(`Placeholder/1x1`, `Placeholder/16x9` 컴포넌트) — 코드에서 placehold.co로 치환됨

## 6. 셀프 검수 (핸드오프 전 필수)

- [ ] 변수 미참조 raw 색상 0건 (Selection colors 패널에서 확인)
- [ ] 오토레이아웃 아닌 프레임 0건 (마커 예외)
- [ ] 계층 위반 0건: 같은 정보 레벨에 다른 텍스트 스타일 사용 없음
- [ ] 메인 컬러(마커+시맨틱 합산) 면적 체감 10% 이하
- [ ] 컴포넌트 인스턴스 detach 0건
- [ ] 긴 텍스트 오버플로 테스트 (종목명 8자·인물명 4자·금액 999.9억)
- [ ] 안티 AI 체크리스트(디자인 시스템 문서 §8) 전 항목
- [ ] 거래 바로가기 버튼 + 고지문 caption 세트 유지

## 7. 하지 말 것

- 클로드 디자인 초안을 이미지로 붙여넣고 위에 그리기 (구조 정보 소실 — 참고 모니터에만 띄우기)
- 화면마다 다른 간격 즉흥 조정 (변수 밖 값 발생 = 코드에서 하드코딩 유발)
- 디자인하다가 새 기능 추가 (IA 밖 요소는 노션 오픈이슈에 먼저 등록)
- 그림자·그라데이션 추가 (안티 AI 규칙)
