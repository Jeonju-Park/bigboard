# dev_prompts_webapp.md (v2.1) — 실데이터 기반 웹앱 개발 순차 프롬프트 (완전판)

> **이 문서 하나로 완결** — 모든 스텝의 프롬프트가 복붙 가능한 형태로 포함됨. (v1 아카이브 참조 불필요)
> 아키텍처: GitHub Actions cron 수집 → 정적 JSON 커밋 → 웹앱 fetch. 브라우저에서 외부 API 직접 호출 금지(CORS·키 노출).
> 운영 원칙: 한 스텝 = 한 프롬프트 = 확인 = git commit. 컨텍스트 40~60% 사용 시 새 세션(인계 요령은 부록 C).

## 모델 선택 가이드

| 모델 | 쓰는 곳 | 이유 |
|---|---|---|
| **Fable** | 아키텍처 설계, 파이프라인 설계, 까다로운 디버깅, 배포 | 최상위 추론 — 설계 실수는 뒤 전체를 오염시킴 |
| **Sonnet** | 화면·컴포넌트·스크립트 구현 대부분 | 속도·비용·품질 균형 — 구현 주력 |
| **Haiku** | 단순 카피 수정, 반복 치환 | 판단 불필요 작업 |
- 클로드 코드에서 `/model`로 전환. 기본은 Sonnet, "두 번 물어봐도 못 고치는 버그"만 Fable 승격.
- 모델 라인업·요금 변동 확인: https://docs.claude.com/en/docs/about-claude/models

## 사전 준비 (유저가 직접)
1. **DART OpenAPI 키**: https://opendart.fss.or.kr → 인증키 신청(무료). 일일 한도 발급 페이지에서 확인(2만 회 수준 [추정])
2. **공공데이터포털 키**: https://www.data.go.kr → "금융위원회_주식시세정보" 활용신청(무료)
3. 키는 메모만 — **코드에 붙여넣지 말 것** (.env·GitHub Secrets 전용)

---

## STEP 0 — 셋업 [Fable]

```
큰손레이더 모바일 웹앱을 app/ 폴더에 초기화해줘.

== 스택 (확정) ==
- Vite + React + TypeScript. 라우팅: react-router-dom의 HashRouter(GitHub Pages 호환 목적)
- 스타일: tokens.ts 강제가 가능한 방식 추천 1개 선택하고 이유 설명 (Tailwind 미사용 — 토큰 강제 목적)
- 상태: 전역 상태 라이브러리 없이 Context 최소 사용
- 데이터 계층: app/public/data/*.json 을 fetch하는 얇은 클라이언트(src/lib/data.ts) — 이후 파이프라인이 이 JSON을 생산

== 이번 스텝 산출 ==
1. app/ 초기화 + 폴더: src/screens src/shared/components src/theme src/lib
2. pipeline/ 폴더(저장소 루트) — 수집 스크립트 자리(Node+TS, app과 의존성 분리)
3. src/theme/tokens.ts — docs/03_design/bx_designsystem_source_bigshot_radar.md §2~4의 토큰 전체 이식
   (60/30/10 주석, L1~L5 타이포 계층, spacing, radius. 이후 모든 코드는 여기만 참조)
4. 웹폰트 로딩: Pretendard, IBM Plex Mono (Display 폰트는 브랜딩 확정값, 미확정 시 TODO 주석)
5. 모바일 뷰포트: 최대폭 480px 중앙 정렬, 바깥은 bg-secondary
6. CLAUDE.md의 절대 규칙을 읽고 요약해서 확인시켜줘

== 절대 규칙 (위반 시 재작업) ==
- 브라우저 코드에서 외부 API 직접 호출 금지. 데이터는 /data/*.json fetch만
- API 키를 코드·커밋에 포함 금지 (환경변수·Secrets만)
- raw 색상·px 하드코딩 금지 (tokens.ts만)
- 이모지 금지(아이콘은 Material Symbols), "추천/시그널/매수하세요" 워딩 금지
- 크롤링 추가 시 반드시 robots.txt·약관 확인 절차를 먼저 보고

== 진행 ==
의존성 계획 먼저 → 내가 OK → 설치. 완료 후 npm run dev 확인 방법 안내.
```
✅ 확인: `npm run dev` 빈 화면+폰트 적용 / tokens.ts에 값 집중 / pipeline·app 의존성 분리 / `git commit -m "step0: setup"`

## STEP 1 — 라우팅 + 5탭 뼈대 [Sonnet]

```
5개 화면 뼈대와 내비게이션을 만들어줘. 기능·디자인 디테일은 다음 스텝이므로 금지.
- 라우트: /home /explore /calendar /ranking /my + /feed/:id /person/:id /stock/:code (placeholder)
- 하단 탭 5개(Material Symbols, 라벨 12px), 각 화면은 앱바(화면명 title)+화면명 텍스트만
- 첫 방문 판단(localStorage) → /landing → /onboarding 3스텝 빈 껍데기 → /home
- SafeArea·플로우 레이아웃만(absolute 금지)
완료 후 비개발자 확인 시나리오 3개 제시.
```
✅ 확인: 탭 5개 전환 / 새로고침해도 동일 화면(해시 라우팅) / 온보딩 1회만 뜸 / 빨간 에러 없음 / commit

## STEP 2 — 데이터 파이프라인 (심장) [Fable 설계 → Sonnet 구현]

### 2-A. 스키마 확정 + 소스 탐색 [Fable]

```
데이터 파이프라인을 설계해줘. 구현 전 탐색·설계만.

== 목표 스키마 (화면 계약 — 이후 변경 최소화) ==
disclosures.json: {id, personName, personType(insider|official), title, company, stockCode,
  direction(buy|sell), unitPrice|null, quantity, totalAmount, tradeDate, discloseDate,
  reportReason, isPlanned, dDay|null, holdingBefore, holdingAfter,
  details[{date,price,qty}], dartUrl}
persons.json: {id, name, type, title, company, holdings[], totalNetBuy12m}
stocks.json: {code, name, prevClose, change, marketCap, volume, per|null, pbr|null,
  divYield|null, high52, low52, sparkline{m1[],m3[],y1[]}}
rankings.json(7/30/90일 순매수·순매도 파생 집계) / meta.json{lastUpdated}

== 탐색 과제 ==
1. DART OpenAPI 지분공시 API(임원·주요주주 소유보고, 대량보유)를 샘플 호출해 응답 필드 확인.
   단가·수량·세부변동내역이 요약 API에 포함되는지 검증. 미포함 시: 공시검색(list) → 원문(document)
   XML 파싱 경로를 설계하고 파싱 난이도 평가
2. 내부자 거래계획 사전공시(30일 예고)가 어떤 API/공시유형으로 잡히는지 확인 → isPlanned·dDay 소스
3. 공공데이터포털 금융위 주식시세정보로 prevClose·시총·거래량 확보 검증.
   PER·PBR·배당수익률이 공공 소스로 안 되면 null 허용 + 화면 숨김 처리로 설계
   (비공식 크롤링은 약관 리스크 보고 후 내 승인 없이 금지 — 노션 오픈이슈 O3)
4. 정정공시 처리: 같은 보고서 정정은 upsert(원본 대체) + 정정 표시 필드

== 산출 ==
- 소스→스키마 매핑 표 (필드별: 어느 API 어느 필드, 가공 로직, 누락 시 처리)
- 수집 주기 제안 (Actions cron 지연 특성 포함 — 30분~1시간 현실적)
- API 호출량 추정 vs 일일 한도
탐색용 키는 내가 pipeline/.env 로 제공. 설계 승인 후 2-B로.
```
✅ 확인: 단가·수량 확보 경로 명확 / 시세 항목별 소스·누락 처리 명확 / 승인 후 진행

### 2-B. 수집 스크립트 구현 [Sonnet]

```
승인된 설계대로 pipeline/을 구현해줘.
- pipeline/fetch.ts: DART 수집(최근 90일 초기 적재 + 증분 모드) → 스키마 변환 → app/public/data/*.json
- pipeline/stocks.ts: 시세 수집(등장 종목만) + sparkline(최근 종가 시계열)
- rankings 파생 집계, meta.json에 lastUpdated
- 실패 내성: 개별 건 파싱 실패는 스킵+로그, 전체 중단 금지. 정정공시 upsert
- 로컬 실행: pipeline/.env 키 사용(.gitignore에 .env 포함 확인), npm run pipeline
실행해서 실제 JSON 생성 → 데이터 3건을 DART 원문 링크와 대조한 결과를 보고해줘.
```
✅ 확인 (중요): disclosures.json 3건을 직접 DART 원문과 대조 — 단가·수량·총액 일치 / 실존 인물·기업 데이터이므로 **가공·왜곡 없이 원문 그대로**인지 / commit

### 2-C. GitHub Actions cron [Fable]

```
.github/workflows/pipeline.yml 을 만들어줘.
- 스케줄: 장 운영일 09~18시 30분 간격 + workflow_dispatch(수동 트리거)
- Secrets(DART_KEY, DATA_GO_KR_KEY) 사용, 실행 후 data/*.json 변경 시에만 자동 커밋
- Actions cron 지연 특성과 무료 한도 내 예상 사용량을 보고에 포함
Secrets 등록 방법을 클릭 단위로 안내해줘 (GitHub 웹 화면 기준).
```
✅ 확인: 수동 트리거 1회 성공 → data/ 커밋 생김 / `grep -r "키 문자열"` 결과 0건

## STEP 3 — 공통 컴포넌트 [Sonnet, 피그마 핸드오프 병용]

```
피그마 02 Components 페이지의 컴포넌트를 순서대로 구현해줘. 지금 [컴포넌트명] 프레임을 선택했어.
(MCP 미사용 시: assets/figma-exports/[컴포넌트명]@2x.png 와 .spec.md 참조 — figma_export_handoff.md 방식)
- 값은 tokens.ts만, variants는 피그마 프로퍼티와 동일한 props로
- 순서(한 번에 하나): DisclosureCard → SegmentTab → FilterChip → PersonRow/FollowChip(유형 배지 포함)
  → RankingRow → StockInfoList → Button → SectionHeader/AppBar/FreshnessLabel → StatePlaceholder
- 각 완료 시 /dev-gallery 라우트(개발용)에 추가. 갤러리 표시 데이터는 실데이터 JSON에서 뽑기
- 스펙에 없는 간격·값은 추측하지 말고 나에게 질문
```
✅ 확인 (컴포넌트마다): 갤러리에서 variants 전부 보임 / 실데이터 극단값(긴 회사명·큰 금액·단가 null)에서 안 깨짐 / 피그마와 나란히 비교 / commit

## STEP 4 — 화면 구현 (한 번에 한 화면) [Sonnet]

공통 골격 — [ ]만 바꿔서 화면마다 사용:
```
피그마에서 선택한 [프레임명]을 /[라우트]에 구현해줘.
- 데이터: src/lib/data.ts 경유 fetch(/data/*.json). 로딩=스켈레톤, 실패=재시도 화면
- 기존 shared/components 재사용, 상태 4종(정상/로딩/빈/에러) — 개발용 상태 토글을 화면 우상단에
- 신선도 라벨은 meta.json lastUpdated 실값 ("공시 수집 N분 전")
- 값은 tokens.ts만. 스펙에 없는 건 질문
완료 후 확인 시나리오 3개 제시.
```
화면별 추가 지시 (골격 뒤에 덧붙이기):
1. **S1 홈** — `세그먼트 [속보|팔로우](ink 밑줄) + 필터 칩(매수만/매도만/대형 10억+/예고) + 날짜 그룹 헤더 + DisclosureCard 리스트(그룹 내 12px·그룹 간 24px·섹션 40px) + 무한 스크롤. 팔로우 탭은 localStorage 팔로우 기준 필터, 빈 상태 → "탐색에서 팔로우하기" CTA + micro 위트 1줄`
2. **S2 피드 상세** — `섹션 7개 순서: ①거래 요약(방향/단가×수량=총액/거래일vs공시일 시차/보고사유/보유 전→후) ②세부변동내역 접힌 테이블 ③인물 컨텍스트(12개월 미니 타임라인+누적 순매수+팔로우+micro 자막) ④종목 정보(전일종가 라벨·스파크라인 1M/3M/1Y 토글·시총·PER·PBR·배당·52주·거래량 — null 항목은 행 숨김) ⑤내부자 동향(90일 순매수 바+타 거래 3건) ⑥예고 배너(해당 시, 좌측 4px ink 바) ⑦액션: [거래 바로가기] Primary + 바로 아래 고지문 caption + DART 원문/공유 텍스트 버튼. 거래 바로가기는 brokers 설정의 딥링크 시도→1.5초 미반응 시 웹 URL 폴백`
3. **S3 인물 프로필** — `유형 배지(내부자/공직자)+아바타 placeholder+팔로우. 보유 현황, 거래 타임라인(항목 탭→S2). 공직자면 재산공개 연혁 차트(경량 SVG 직접 구현, 라이브러리 금지)+"기준일·연 1회 공개" 라벨 고정`
4. **S4 종목** — `종목 정보 블록(S2와 동일 컴포넌트 재사용)+이 종목 전체 내부자 거래+예고+종목 팔로우+거래 바로가기`
5. **S5 탐색** — `통합검색(종목/인물, 클라이언트 필터+자동완성)+인기 큰손 리스트(유형 필터 칩: 전체/내부자/공직자)+최근 본 항목(localStorage)`
6. **S6 캘린더** — `주간 스트립(선택일 ink 밑줄, 예고 건수 표시)+예고 리스트(D-N|종목|인물|규모, 좌측 4px ink 바)`
7. **S7 랭킹** — `세그먼트 순매수/순매도+기간 칩(7/30/90일)+RankingRow(레이스 바 200ms ease-out 1회, 1~3위 weight 700+마커)`
8. **S8 마이** — `팔로우 관리 / 증권사 설정(3사 라디오) / 알림 설정(M3 — "앱 출시 시 제공" 비활성 표시) / 데이터 출처·고지(DART·국회공보, 투자자문 아님, 피드백 링크, 버전)`
9. **W0/W1 온보딩** — `랜딩 1스크린(한 줄 소개+시작하기+하단 고지문) → 3스텝(관심종목 칩 검색 선택→큰손 팔로우 추천 토글→증권사 라디오, 전 스텝 건너뛰기 가능) → /home`
✅ 확인 (화면마다): 실데이터 렌더 정상 / 상태 4종 / 피그마 대조 / 360·412폭 겹침·잘림 없음 / commit

## STEP 5 — 통합 QA [Fable]

```
출시 전 통합 점검을 하고 결과를 표(항목|OK/이슈|심각도)로 보고해줘. Critical은 바로 수정.
1. IA M1 기능 전부 동작? — docs/04_dev/ia_snapshot.md 대조 체크리스트로 출력
2. grep 검사: raw hex 0건 / 토큰 외 하드코딩 px / 이모지 / 금지 워딩("추천","매수하세요","시그널") / API 키 문자열
3. 모든 화면 고지문 노출 (상세·마이 필수, 피드 하단 1회)
4. 라우트 직접 진입(새로고침) 전부 정상 / 뒤로가기 동선 일관
5. Lighthouse 모바일 성능·접근성 측정 — 접근성 90 미만이면 수정
6. 320px 초소형 폭 깨짐 확인
7. 데이터 정합성: 무작위 공시 5건 DART 원문 대조 표 (단가·수량·총액·날짜·인물명)
8. 엣지: 단가 null(무상증여 등)·details 다건·정정공시 표시·공시 0건인 날의 홈
9. 실명 데이터 책임: 가공/추정값 혼입 없는지, 모든 상세에 DART 원문 링크 있는지
10. meta.lastUpdated 6시간 이상 과거 시 지연 배너 동작
```
✅ 확인: Critical 0건 / 직접 5분 사용 / commit `v0.1.0`

## STEP 6 — GitHub Pages 배포 [Fable]

```
GitHub Pages 배포 파이프라인을 만들어줘.
1. GitHub 저장소 생성 안내(내가 웹에서 생성) → remote 연결 명령 제시
2. vite.config의 base 경로를 저장소명에 맞게 설정 (HashRouter라 라우팅 문제 없음 확인)
3. .github/workflows/deploy.yml: main 푸시 시 빌드→Pages 배포. STEP 2-C의 pipeline.yml과 연결
   (data 커밋 → 자동 재배포)
4. 배포 후 확인: 공개 URL, 휴대폰용 QR 생성(로컬 스크립트)
5. README에 배포 절차 기록
비개발자 기준으로 각 단계에서 '어디를 클릭하는지'까지 설명해줘.
```
✅ 확인: 공개 URL이 폰에서 열림 / 30분 후 데이터 자동 갱신 / 이후 `git push`만으로 자동 배포

## STEP 7 — 반응 계측 [Sonnet]

```
반응 검증용 최소 계측을 붙여줘. 개인정보 수집 없이.
- GA4(또는 무료 대안 추천 1개) 페이지뷰 + 커스텀 이벤트: card_tap, follow_add,
  broker_outlink_tap, segment_switch, share_tap — snake_case 택소노미
- 마이 화면에 수집 항목 고지 1줄
```
✅ 확인: GA4 실시간 보고서에 내 이벤트 보임 / commit → **커뮤니티 공유·PSF 검증 시작** (psf_bigshot_radar.md)

---

## 부록 A — 다음 라운드 프롬프트

**A-1. 공직자 데이터 적재 (M2)** [Sonnet]
```
정보공개센터 등 공개 스프레드시트 기반으로 고위공직자 재산공개 데이터를 적재해줘.
- pipeline/officials.ts: 원본 → persons 스키마 변환(yearlyHoldings 배열, 기준일 필드, 출처 표기)
- 크롤링 아님(공개 자료 다운로드). 인물-종목 표기 비표준 건은 스킵+목록 보고 (내가 수기 보정 판단)
- S3 재산공개 연혁·S7 공직자 랭킹·탐색 유형 필터 활성화
```
**A-2. 크롤링 소스 추가 절차** [Fable]
```
[대상 사이트]를 데이터 소스로 추가하고 싶어. 구현 전에: robots.txt와 이용약관에서 자동 수집·재배포
관련 조항을 확인해 원문 인용과 함께 허용/금지/모호 판정을 보고해줘. 모호하면 구현하지 말 것.
```
**A-3. 네이티브 앱 + 푸시 (M3)** [Fable]
```
현 React 웹앱의 안드로이드 앱 전환 계획을 세워줘.
- 비교: Capacitor(코드 재사용 최대) vs Expo 재작성 — FCM 푸시 요구 포함 추천 1개+이유
- 푸시 발송 백엔드(팔로우 매칭→발송) 최소 구성안: Supabase 등 옵션 비용 비교
- localStorage 팔로우 데이터의 앱 마이그레이션 경로 (노션 O5)
계획 승인 후 단계별 구현.
```
**A-4. 파이프라인 고도화 판단 기준** — Actions→Supabase 전환은 ①30분 지연 불만이 피드백으로 확인 ②JSON 수 MB 비대 ③서버 검색·필터 필요, 셋 중 하나 발생 시.
**A-5. 공유 카드 (M2)** [Sonnet]
```
피드 상세를 공유 이미지 카드로 저장하는 기능을 만들어줘. canvas 렌더(브랜드 토큰 사용),
하단에 서비스명+URL 워터마크, 저장/OS 공유. share_tap 이벤트 연결.
```
**A-6. 시즌 리포트 (M2, 3월 대비)** [Fable 설계 → Sonnet 구현]
```
연 1회 재산공개 시즌 스페셜 페이지(S9)를 설계해줘: 의원 포트폴리오 전년 대비 변화 시각화,
공유 최적화(카드·OG), "거래 시점 비공개" 안내 필수. 설계 승인 후 구현.
```

## 부록 B — 반응이 애매할 때
- 계측 데이터로 진단: 세그먼트 전환율·card_tap률·재방문(GA4 코호트). AARRR 어디가 새는지 식별 → ICE 백로그로 실험 우선순위 (04_MARKETING_GROWTH_GUIDE §7)
- 작은 실험부터: 홈 카피/필터 A/B, 예고 캘린더 전면 배치, 랜딩 헤드라인 변형. **대공사 금지** — 4~6주 검증 기간 안에 판단
- 진단 프롬프트:
```
GA4 데이터 요약을 줄게: [수치]. AARRR 프레임으로 가장 큰 누수 단계를 진단하고,
ICE 스코어링한 실험 3개를 제안해줘. 각 실험: 가설/대상 지표/성공 기준/구현 난이도.
```

## 부록 C — 트러블슈팅 습관 (비개발자용)
- 에러는 **그대로 복붙** + "재현 방법: 어디서 뭘 누르면" + "기대 동작" + "직전에 바꾼 것"
- 같은 버그 2회 실패 시 `/model` Fable 승격 + "지금까지 시도와 실패를 요약하고 접근을 바꿔줘"
- 세션 종료 전: "지금까지 한 것과 다음 할 일 3줄 요약" → docs/decisions_log.md에 붙이기
- 새 세션 시작 시 붙여넣기: CLAUDE.md는 자동 로드되므로, ①직전 3줄 요약 ②현재 STEP 번호만 주면 됨
- 매 스텝 commit — 망하면 클로드에 "직전 커밋으로 되돌려줘" 요청 (git checkout/revert 위임)

## 법적 메모
- DART·공공데이터포털은 공공 개방 데이터 — 출처 표기하고 사용 (각 포털 약관의 표기 방식 준수)
- 실명 공시 데이터는 **원문 그대로 + 원문 링크**가 원칙. 파생 집계(랭킹)는 "집계 기준" 문구 병기
- 비공식 크롤링(포털 시세 등)은 약관 위반 소지 — 노션 O3 해소 전 금지 유지
