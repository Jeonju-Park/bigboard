# decisions_log.md — 결정 기록

---
## 🔖 재개용 인계 노트 (세션이 끊기면 여기부터 읽을 것)

**현재 STEP: 2-A 대기 — STEP 0·1 완료·커밋됨. `pipeline/.env` 키 입력이 있어야 진행 가능**

직전 3줄:
1. STEP 0·1 완료 — 셋업·토큰 이식 + 라우팅 9개 라우트·5탭·랜딩·온보딩 3스텝. 타입체크·토큰검사·브라우저 실동작 전부 자체 검증 통과
2. **하위 경로 배포를 미리 검증함** — `dist/` 를 `/bigshot-radar/` 아래에 서빙해 `#/ranking` 렌더와 `data/meta.json` 200 확인. STEP 6 의 base 경로 리스크 해소
3. 콘솔 오류 0건 (검증 중 뜬 "Invalid hook call" 4건은 Vite HMR 잔재로 확인 — 클린 로드에서 재현 안 됨)

다음 할 일:
- **STEP 2-A 는 유저가 `pipeline/.env` 에 키를 넣어야 시작 가능** (`cp pipeline/.env.example pipeline/.env`)
- 미해결 게이트: ①API 키 입력 ②GitHub 저장소·Secrets ③GA4 측정 ID

---

## 2026-07-31 (STEP 0 — 셋업)
- **스타일 방식 = CSS Modules + CSS 변수** (vanilla-extract 탈락). 클로드 디자인 프로젝트가 이미 순수 CSS 변수로 작성돼 있어 재작성·동기화 비용이 없고, Vite 내장이라 의존성 0. 토큰 강제는 `npm run check:tokens` 로 보완
- **tokens.ts 가 유일 소스, CSS 는 생성물**. `scripts/build-tokens.mjs` 가 tokens.ts → `tokens.generated.css` 를 만들고 predev/prebuild 에 연결. Node 24 네이티브 TS 실행이라 빌드 의존성 0개. CSS 를 직접 고치면 덮어써짐
- **폰트 = 하이브리드 조달**. Pretendard 는 jsdelivr 동적 서브셋 woff2, Paperlogy 800·IBM Plex Mono·Material Symbols 는 CDN. 4종 모두 실제 로드 확인
- **라우터 = `react-router` v8.3.0** (`react-router-dom` 아님). v2 문서는 react-router-dom 을 지정했으나 해당 패키지의 7.12.0~8.2.0 이 CSRF 권고(GHSA-qwww-vcr4-c8h2) 범위이고 7.x 최신(7.18.2)도 포함된다. 우리는 RSC·서버 액션을 안 쓰므로 실제 노출은 없지만, STEP 1 착수 전이라 전환 비용이 0이어서 옮김
- **tsconfig 3분할** (app/node/솔루션). 브라우저 코드에 Node 타입을 넣지 않아 `process.env` 사용이 타입 단계에서 막힌다 = 규칙 5의 구조적 방어
- 아이콘 규격(20/24px)을 `iconSize` 토큰으로 신설 — §6 이 정한 값인데 토큰이 없어 하드코딩되고 있었음
- 검사기 자체 버그 1건: 경로에 공백이 있으면(`07_1bigshot-radar 2`) `import.meta.url.pathname` 이 `%20` 을 남겨 **아무 파일도 스캔하지 않고 "통과"** 로 보였음. `fileURLToPath` 로 수정 + 스캔 0건이면 실패하도록 가드 추가

## 2026-07-31 (데이터 전략 v2)
- M1부터 실데이터 사용으로 변경 (목데이터 폐기) — 유저 지시
- 아키텍처: GitHub Actions cron(30분~1시간) → DART OpenAPI+공공데이터포털 수집 → 정적 JSON 커밋 → 웹앱 fetch. 브라우저 직접 API 호출 금지(CORS·키 노출), 키는 Secrets만
- 시세는 공공 소스(전일 종가) 우선, PER/PBR 등 미확보 항목은 화면 숨김. 비공식 크롤링은 O3 해소 전 금지, 추가 시 robots.txt·약관 확인 승인제
- 실명 데이터 원칙: 원문 그대로 + DART 원문 링크, QA에 원문 대조 필수

## 2026-07-30 (v0.2)
- 메인 = 홈(속보/팔로우 세그먼트)로 변경, 티커 바 존치는 O1(제거 권고)
- 피드 상세(S2) 신설: 거래+인물+종목 정보 통합 1페이지
- 거래 표기에 단가×수량 추가 — DART 세부변동내역으로 가능 확인(무상증여 등 단가 미기재 예외 처리)
- 고위공직자 인물 유형 추가(M2) — 연 1회 데이터, 신선도 라벨 의무
- '거래 바로가기' 아웃링크 확정 — 링크 이동만, 주문은 사용자 실행 = 일임 아님(합법). 계좌 연동·자동 주문은 계속 금지
- 배포 전략: 모바일 웹앱(Vite+React+HashRouter, GitHub Pages) 선배포 → 반응 검증(4~6주) → M3 앱+푸시
- 로그인 M1 제외(localStorage), 푸시 M3
- IA를 노션 3개 DB로 관리(구조표 57행/오픈이슈 8건/변경색인 10건) — ia_snapshot.md에 요약 유지

## 2026-07-29 (v0.1)
- 원형(정치인 실시간 카피트레이딩) 법적·데이터적 불가 → 내부자 공시 레이더로 피벗
- 디자인 방향 "개표방송 스튜디오": 60/30/10, 옐로우 마커, 3서체, micro 위트 레이어, 안티 AI 체크리스트
- PSF 게이트: H4 경쟁 실사 미통과 시 중단(차순위 소각레이더)
