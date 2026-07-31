# dev_prompts_webapp.md (v2) — 실데이터 기반 웹앱 개발 순차 프롬프트

> v1 대비 변경: 목데이터 → **실데이터 파이프라인**(DART OpenAPI + 공공 시세). GitHub Pages 제약(정적 호스팅) 때문에
> 아키텍처는 "GitHub Actions cron 수집 → 정적 JSON 커밋 → 웹앱이 같은 저장소의 JSON을 fetch" 구조로 확정.
> 브라우저에서 외부 API 직접 호출 금지(CORS·키 노출) — 이 원칙이 v2의 핵심. v1은 dev_prompts_webapp_v1_archive.md.
>
> 모델 가이드: 설계·파이프라인·디버깅·배포 = **Fable** / 화면·컴포넌트 구현 = **Sonnet** / 단순 반복 = **Haiku**. `/model`로 전환.

## 사전 준비 (유저가 직접, 개발 시작 전)
1. **DART OpenAPI 키 발급**: https://opendart.fss.or.kr → 인증키 신청(무료). 일일 호출 한도 있음(2만 회 수준 [추정] — 발급 페이지에서 확인)
2. **공공데이터포털 키 발급**: https://www.data.go.kr → "금융위원회_주식시세정보" 활용신청(무료) — 전일 종가·시총·거래량 소스
3. 두 키를 메모 (STEP 2/6에서 .env·GitHub Secrets로 등록. **코드에 직접 붙여넣지 말 것**)

---

## STEP 0 — 셋업 [Fable]

```
큰손레이더 모바일 웹앱을 app/ 폴더에 초기화해줘.

== 스택 ==
- Vite + React + TS, HashRouter(GitHub Pages 호환)
- 스타일: tokens.ts 강제 가능한 방식 추천 1개(이유 포함), Tailwind 미사용
- 데이터 계층: app/public/data/*.json 을 fetch하는 얇은 클라이언트(src/lib/data.ts) — 이후 파이프라인이 이 JSON을 생산

== 산출 ==
1. app/ 초기화 + src/screens src/shared/components src/theme src/lib
2. pipeline/ 폴더(저장소 루트) — 수집 스크립트 자리(Node+TS, app과 의존성 분리)
3. src/theme/tokens.ts — docs/03_design/bx_designsystem_source_bigshot_radar.md §2~4 이식
4. 웹폰트(Pretendard·IBM Plex Mono, Display는 브랜딩 확정값), 모바일 뷰포트(최대 480px 중앙)

== 절대 규칙 (CLAUDE.md 반영) ==
- 브라우저 코드에서 외부 API 직접 호출 금지. 데이터는 /data/*.json fetch만
- API 키를 코드·커밋에 포함 금지 (환경변수·Secrets만)
- raw 색상·px 금지(tokens.ts만), 이모지 금지, "추천/시그널" 워딩 금지
- 크롤링 추가 시 반드시 robots.txt·약관 확인 절차를 먼저 보고
```
✅ 확인: `npm run dev` 빈 화면+폰트 / pipeline·app 의존성 분리 / commit

## STEP 1 — 라우팅 + 5탭 뼈대 [Sonnet]
v1과 동일: /home /explore /calendar /ranking /my + /feed/:id /person/:id /stock/:code, 온보딩 1회 플로우.
✅ 탭 전환·새로고침·온보딩 1회 / commit

## STEP 2 — 데이터 파이프라인 (v2의 심장) [Fable 설계 → Sonnet 구현]

### 2-A. 스키마 확정 + 소스 탐색 [Fable]
```
데이터 파이프라인을 설계해줘. 구현 전 탐색·설계만.

== 목표 스키마 (화면 계약 — 이후 변경 최소화) ==
disclosures.json: {id, personName, personType, title, company, stockCode, direction,
  unitPrice|null, quantity, totalAmount, tradeDate, discloseDate, reportReason,
  isPlanned, dDay|null, holdingBefore, holdingAfter, details[{date,price,qty}], dartUrl}
persons.json / stocks.json(prevClose, change, marketCap, volume, per|null, pbr|null,
  divYield|null, high52, low52, sparkline) / rankings.json(파생 집계) / meta.json{lastUpdated}

== 탐색 과제 ==
1. DART OpenAPI 지분공시 API(임원·주요주주 소유보고, 대량보유)를 샘플 호출해 응답 필드 확인,
   단가·수량·세부변동내역이 요약 API에 포함되는지 검증. 미포함 시: 공시검색(list) → 원문(document)
   XML 파싱 경로 설계 (파싱 난이도 평가 포함)
2. 내부자 거래계획 사전공시(30일 예고)가 어떤 API/공시유형으로 잡히는지 확인 → isPlanned·dDay 소스
3. 공공데이터포털 금융위 주식시세정보로 prevClose·시총·거래량 확보 검증.
   PER·PBR·배당수익률이 공공 소스로 안 되면 null 허용 + 화면 숨김 처리로 설계
   (비공식 크롤링은 약관 리스크 보고 후 내 승인 없이 금지 — 노션 O3)
4. 정정공시 처리: 같은 보고서 정정은 upsert(원본 대체) + 정정 표시 필드

== 산출 ==
- 소스→스키마 매핑 표 (필드별: 어느 API 어느 필드, 가공 로직, 누락 시 처리)
- 수집 주기 제안 (Actions cron 지연 특성 포함, 30분~1시간 현실적)
- API 호출량 추정 vs 일일 한도
탐색용 API 키는 내가 pipeline/.env 로 제공. 설계 승인 후 2-B로.
```
✅ 확인: 매핑 표에서 단가·수량 확보 경로 명확 / 시세 항목별 소스·누락 처리 명확

### 2-B. 수집 스크립트 구현 [Sonnet]
```
승인된 설계대로 pipeline/을 구현해줘.
- pipeline/fetch.ts: DART 수집(최근 90일 초기 적재 + 증분 모드) → 스키마 변환 → app/public/data/*.json
- pipeline/stocks.ts: 시세 수집(등장 종목만) + sparkline(최근 종가 시계열)
- rankings 파생 집계(7/30/90일 순매수·순매도), meta.json에 lastUpdated
- 실패 내성: 개별 건 파싱 실패는 스킵+로그, 전체 중단 금지. 정정공시 upsert
- 로컬 실행: pipeline/.env 키 사용(.gitignore 확인), npm run pipeline
실행해서 실제 JSON 생성 → 데이터 3건을 DART 원문 링크와 대조한 결과를 보고해줘.
```
✅ 확인 (중요): disclosures.json 3건을 직접 DART 원문과 대조 — 단가·수량·총액 일치 / 실존 인물·기업이므로 **가공·왜곡 없이 원문 그대로**인지 / commit

### 2-C. Actions cron [Fable]
```
.github/workflows/pipeline.yml: 스케줄(장 운영일 09~18시 30분 간격 + 수동 트리거),
Secrets(DART_KEY, DATA_GO_KR_KEY) 사용, 실행 후 data/*.json 변경 시에만 자동 커밋.
Actions cron 지연 특성과 무료 한도 내 예상 사용량을 보고에 포함.
```
✅ 확인: 수동 트리거 1회 성공 → data/ 커밋 / 코드에 키 없음 grep 확인

## STEP 3 — 공통 컴포넌트 [Sonnet, 피그마 핸드오프]
v1과 동일 (DisclosureCard 등 10종, /dev-gallery). 단, 갤러리 표시 데이터도 실데이터 JSON에서.
✅ 피그마 대조 / 실데이터 극단값(긴 회사명·큰 금액·단가 null) 테스트 / commit

## STEP 4 — 화면 구현 [Sonnet]
v1과 동일 순서(홈→상세→인물→종목→탐색→캘린더→랭킹→마이→온보딩). 차이:
- 모든 화면은 src/lib/data.ts 경유 fetch, 로딩=스켈레톤, 실패=재시도 화면
- 데이터 신선도 라벨은 meta.json lastUpdated 기반 실값 ("공시 수집 N분 전")
- 상세의 종목 정보: per/pbr 등 null 항목은 행 자체를 숨김
- 거래 바로가기: brokers 정적 설정 파일, 딥링크→웹 폴백
✅ 화면마다: 실데이터 렌더 정상 / 상태 4종 / 겹침 없음 / commit

## STEP 5 — 통합 QA [Fable]
v1 항목 + 실데이터 특화 추가:
```
7. 데이터 정합성: 무작위 공시 5건 DART 원문 대조 표 (단가·수량·총액·날짜·인물명)
8. 엣지: 단가 null(무상증여 등)·details 다건·정정공시 표시·공시 0건인 날의 홈
9. 실명 데이터 책임: 가공/추정값 혼입 없는지, 모든 상세에 DART 원문 링크·고지문 있는지
10. meta.lastUpdated 6시간 이상 과거 시 지연 배너 동작
```
✅ Critical 0건 / 직접 5분 사용 / commit v0.1.0

## STEP 6 — GitHub Pages 배포 [Fable]
v1과 동일 + 추가: pipeline 워크플로와 배포 워크플로 연결(데이터 커밋 → 자동 재배포), base 경로, 비개발자용 클릭 단위 안내.
✅ 공개 URL 폰에서 열림 / 30분 후 데이터 자동 갱신 확인

## STEP 7 — 계측 [Sonnet]
v1과 동일 (GA4, card_tap·follow_add·broker_outlink_tap·segment_switch·share_tap) → PSF 검증 시작.

---

## 부록 A — 다음 라운드
1. **공직자 데이터 적재(M2)** [Sonnet]: 정보공개센터 스프레드시트 → persons 스키마 변환 + 출처·기준일 필드 (공개 자료 활용)
2. **크롤링 소스 추가 절차** [Fable]: 대상 robots.txt·이용약관 확인 보고 → 승인 → 구현. 시세 재배포 라이선스 O3 해소 전 비공식 소스 금지
3. **네이티브 앱+푸시(M3)** [Fable]: Capacitor vs Expo, FCM, localStorage 마이그레이션(O5). 푸시 발송 서버 필요 시점 = Supabase 등 백엔드 도입 검토 시점
4. **파이프라인 고도화**: Actions → Supabase 전환 기준 = ①30분 지연 불만이 피드백으로 확인 ②JSON 수 MB 비대 ③서버 검색·필터 필요
5. **공유 카드·시즌 리포트(M2)**: v1 부록과 동일

## 부록 B·C — v1과 동일 (반응 애매 시 진단 / 트러블슈팅 습관)

## 법적 메모 (v2 신설)
- DART·공공데이터포털은 공공 개방 데이터 — 출처 표기하고 사용 (각 포털 약관의 표기 방식 준수)
- 실명 공시 데이터는 **원문 그대로 + 원문 링크**가 원칙. 가공·추정치를 사실처럼 표기하면 정정 리스크 — 파생 집계(랭킹)는 "집계 기준" 문구 병기
- 비공식 크롤링(포털 시세 등)은 약관 위반 소지 — O3 해소 전 금지 유지
