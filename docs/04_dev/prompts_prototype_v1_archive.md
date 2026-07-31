# prompts_bigshot_radar_prototype.md
# 클로드 코드용 순차 프롬프트 — "겉만 작동하는" 프로토타입 (Step 0~4)

> 목적: 내부 기능(네트워크·DART·DB·푸시) 전부 없이, 목데이터로 화면과 전환·모션만 실제 앱처럼 동작.
> 원칙: 한 스텝 = 한 프롬프트 = 확인 후 다음. 각 스텝 끝에 git commit.
> 사전 준비: 프로젝트 루트에 ①bx_designsystem_source_bigshot_radar.md ②클로드 디자인에서 확정한 토큰 CSS 변수 ③CLAUDE.md 를 두고 시작.

---

## Step 0 — 셋업 + CLAUDE.md 갱신

```
큰손레이더 프로토타입 프로젝트를 초기화해주세요.

== 목표 ==
React Native + Expo (안드로이드 우선) 프로젝트 생성. 이것은 "겉만 작동하는 프로토타입"입니다.

== 절대 규칙 (CLAUDE.md에 추가) ==
1. 네트워크 요청, API 호출, DB, 푸시, 인증 코드 작성 금지. 모든 데이터는 /mocks 폴더의 JSON
2. 디자인 값 하드코딩 금지 — 모든 색·크기·간격은 /theme 토큰 파일에서만
3. 이모지 금지, 아이콘은 @expo/vector-icons 의 MaterialCommunityIcons 대신
   Material Symbols 웹폰트 또는 react-native-vector-icons MaterialIcons(Rounded 스타일 우선) 사용
4. "추천/시그널/매수하세요" 워딩 금지 (목데이터 포함)
5. absolute 포지션은 티커 바 1곳만 허용

== 이번 스텝 산출 ==
1. Expo 프로젝트 생성 + 폴더: app/ features/ shared/ theme/ mocks/
2. theme/tokens.ts: 첨부한 디자인 시스템 CSS 변수를 TS 상수로 이식
   (colors 60/30/10 구조 주석 포함, typography 8스케일, spacing 4pt, radius)
3. 폰트 로딩: Pretendard, IBM Plex Mono, Paperlogy(파일 없으면 임시로 Pretendard ExtraBold 대체 + TODO 주석)
4. README에 실행 방법 (npm run android)

== 진행 방식 ==
의존성 계획 먼저 보여주고 OK 받은 뒤 설치. 완료 후 "토큰이 코드에 어떻게 들어갔는지" 파일 경로와 함께 3줄 요약.
```

**확인 체크**: 에뮬레이터 실행됨 / 빈 화면에 Pretendard 텍스트 렌더 / tokens.ts에 하드코딩 없이 값 집중.

---

## Step 1 — 네비게이션 + 5화면 뼈대

```
5개 화면의 뼈대와 네비게이션을 만들어주세요. 기능·디자인 디테일은 다음 스텝.

== 화면 ==
홈 피드 / 검색·팔로우 / 예고 캘린더 / 랭킹 / 마이 — 하단 탭 5개 (MaterialIcons, 라벨 12px)

== 이번 스텝 규칙 ==
- 각 화면: 흰 배경 + 앱바(화면명 title 20px 하나) + "화면명 placeholder" 텍스트만
- 탭 전환 동작 확인이 목적. 애니메이션 없음
- 겹침 금지: SafeAreaView + 플로우 레이아웃만

== 완료 보고 ==
비개발자 확인 시나리오 3개 (예: "하단 탭을 눌러 5개 화면을 오간다")
```

**확인 체크**: 5탭 전환 / 뒤로가기 정상 / 빨간 에러 없음.

---

## Step 2 — 공통 컴포넌트 7종 (스토리북 화면)

```
디자인 시스템의 Tier 1 컴포넌트 7종을 shared/components 에 구현하고,
개발용 임시 화면(ComponentGallery)에서 전부 확인할 수 있게 해주세요.

== 컴포넌트 스펙 (첨부 디자인 시스템 문서 §5 준수) ==
1. TickerBar: 상단 고정 1줄, bg-secondary, IBM Plex Mono 12px, 좌로 흐르는 모션(유일한 상시 모션)
2. DisclosureCard: 인물명(label 15/600) + 직함(caption) + 방향 배지(매수 레드/매도 블루 텍스트+화살표 아이콘, 색면 없음)
   + 금액(Numeric 17/700, 핵심 숫자 뒤 옐로우 마커 하이라이트) + 경과시간(caption) + micro 자막(11/400/gray-400)
   radius 12, 배경 white, 보더 gray-200 1px. 카드는 이 컴포넌트 하나뿐
3. RankingRow: 순위(Numeric) + 이름 + 레이스 바(높이 6, 시맨틱 컬러, 마운트 시 200ms ease-out으로 채워짐) + 금액
4. FollowChip: 아바타 placeholder(placehold.co 40x40) + 이름, pressed 상태 bg-secondary
5. MarkerText: 텍스트 뒤 60% 높이 옐로우 형광펜 효과 (absolute 허용 예외)
6. AppBar / 7. SectionHeader(title-s + 우측 "더보기" caption)

== 상태 ==
각 컴포넌트 default / pressed / disabled (해당 시)

== 금지 ==
그림자 남발 금지(카드도 그림자 없음), 등장 fade-in 일괄 적용 금지, 이모지 금지

== 완료 보고 ==
갤러리 화면 스크린샷 찍는 법 + 토큰 외 하드코딩 값 0건임을 확인해 보고
```

**확인 체크**: 마커가 텍스트를 가리지 않음 / 레이스 바 모션 1회만 / 긴 이름(10자+)에서 겹침·잘림 없음.

---

## Step 3 — 화면 채우기 (목데이터)

```
5개 화면을 목데이터로 채워주세요. 클로드 디자인 초본(첨부)의 레이아웃을 따릅니다.

== 목데이터 (mocks/*.json) ==
- disclosures.json 12건: {인물, 직함, 회사(가상: △△전자 등), 방향, 금액, 경과시간, microCaption, 예고여부, dDay}
- rankings.json 순매수/순매도 각 8건 / follows.json 6명 / searches.json
- microCaption 톤: "올해만 세 번째 매도입니다" 급의 절제된 위트. 과장·이모지·추천 워딩 금지

== 화면별 ==
1. 홈: TickerBar + 날짜 그룹(SectionHeader) + DisclosureCard 리스트. 그룹 내 카드 간 12px, 그룹 간 24px, 섹션 40px
2. 검색·팔로우: 검색필드(bg-secondary) + FollowChip 가로 스크롤 + borderless 인물 로우(디바이더)
3. 캘린더: 주간 스트립(선택일 ink 밑줄) + 예고 리스트(좌측 4px ink 바)
4. 랭킹: 세그먼트(ink 밑줄) + RankingRow, 1~3위 weight 700 + MarkerText
5. 마이: 설정 그룹(디바이더 구분) + 하단 고지문 caption:
   "본 서비스는 투자 자문이 아니며, 공시 정보를 재가공한 참고 자료입니다."

== 한 번에 한 화면씩 ==
홈부터. 화면 하나 끝나면 확인 요청 후 다음 화면 진행 (한 프롬프트에 다 만들지 말 것)
```

**확인 체크 (화면마다)**: 60/30/10 체감 / 그룹핑이 선 없이 읽힘 / 스크롤 끝까지 겹침 없음 / micro 자막 외 위트 없음.

---

## Step 4 — 상태·인터랙션·검수

```
프로토타입 마감 단계입니다. 기능 추가 금지, 아래만 수행.

== 1. 상태 4종 ==
각 화면에 개발용 상태 토글(정상/로딩/빈/에러).
- 로딩: 스켈레톤(gray-100, 미약한 shimmer)
- 빈: MaterialIcons 아이콘 + 안내 + 행동 버튼 1개 + micro 위트 1줄
- 에러: 원인 + "다시 시도" 버튼 (탭하면 정상 상태로 전환되는 척)

== 2. 가짜 인터랙션 ==
- 카드 탭 → 상세 시트(목데이터 상세 + 공유 버튼은 토스트 "이미지 저장됨(프로토타입)")
- 팔로우 버튼 → 상태만 토글
- CTA 탭 시 scale 0.97 / 100ms. 그 외 모션 추가 금지

== 3. 셀프 검수 후 보고 ==
첨부 문서 §8 안티 AI 체크리스트 + 아래를 표로 통과/실패 보고:
- 토큰 외 하드코딩 색상 grep 결과 0건
- absolute 사용처가 TickerBar, MarkerText 뿐인지
- 360x800, 412x915 두 해상도에서 겹침·잘림 없음
- 터치 타깃 44pt 미만 요소 0건
- 이모지·금지 워딩 grep 결과 0건
실패 항목은 수정 후 재보고. 완료되면 git commit "prototype v0.1".
```

**최종 확인 (비개발자용)**: ①앱 켜고 5초 안에 "공시 중계 앱"임이 읽히는가 ②아무 데나 눌러도 죽지 않는가 ③"AI가 만든 것 같다"는 인상이 드는 화면이 있는가 — 있다면 어느 요소인지 적어서 다음 라운드로.

---

## 이후 (프로토타입 검증 끝나면)
- 이 프로토타입은 PSF Sprint의 솔루션 인터뷰 데모로 사용 (psf_bigshot_radar.md H3)
- 실기능 개발은 PSF 통과 후 04_dev/prd_bigshot_radar.md 부터 — 03_DEVELOPMENT_GUIDE 워크플로우로 복귀
