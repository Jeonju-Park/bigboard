# 미장(US) 데이터 소스 쇼핑리스트

> 작성 2026-08-04. **모든 항목은 추측이 아니라 실제 호출로 확인했다.**
> 관보 API 때 명세만 보고 "된다"고 했다가 틀린 적이 있어, 이번엔 응답 본문까지 열어봤다.
> 국장 쪽은 [api_shopping_list.md](api_shopping_list.md) 참고.

---

## 0. 결론 요약

| # | 소스 | 키 | 상태 | 무엇을 주나 | 들어갈 화면 |
|---|---|---|---|---|---|
| **U1** | SEC EDGAR `submissions` / `daily-index` | **불필요** | ✅ 확인 | Form 4 = 미국 내부자 거래 (**정확한 단가·수량**) | 홈 피드 · 인물 · 종목 |
| **U2** | SEC EDGAR 13F-HR | **불필요** | ✅ 확인 | 기관 분기 보유 (버크셔·ARK 등) | 탐색 "기관" · 종목 |
| **U3** | House Clerk 재무공시 ZIP | **불필요** | ⚠️ 확인(PDF 파싱 필요) | 하원의원 거래 (**금액은 구간**) | 홈 피드 · 인물 |
| **U4** | Senate EFD | — | ❌ **차단됨** | 상원의원 거래 | (대안 필요) |
| **U5** | 미국 시세 API | **필요** | 🔑 발급 필요 | 종가·등락률·시총·52주 | 전 화면 시세 |
| **U6** | SEC `company_tickers.json` | **불필요** | ✅ 확인 | CIK↔티커 매핑 10,412종목 | 내부 전용 |

**당장 유저가 해야 할 일은 U5 하나뿐입니다.** U1~U3, U6 은 키 없이 지금 바로 붙일 수 있습니다.

---

## U1. SEC EDGAR — Form 4 (미국 내부자 거래) ★ 최우선

국장의 DART 임원·주요주주 보고서에 정확히 대응한다. **오히려 DART보다 낫다** — 단가가 소수점까지 나온다.

### 확인한 것
```
https://www.sec.gov/Archives/edgar/daily-index/2026/QTR3/form.20260731.idx  → HTTP 200, 1.1MB
  하루 제출 분포: 424B2 996 / SCHEDULE 806 / **4 712** / 497K 514 / 8-K 239
Form 4 XML 실제 파싱 결과:
  발행사 17 Education & Technology Group Inc. (YQ)
  보고자 Liu Chang · Chief Executive Officer
  2026-07-22 코드=A 2,420주 @ $2.2568 → 보유 46,634
  2026-07-23 코드=A   243주 @ $2.2320 → 보유 46,877  ... (7건)
```

### 얻는 법
- **키 발급 불필요.** 단, `User-Agent` 헤더에 **연락 가능한 이메일**이 없으면 SEC가 차단한다.
  `User-Agent: bigboard/0.1 (jjsa6316@ajou.ac.kr)` 형태.
- 요청 상한 **초당 10회**. 이걸 넘기면 IP 차단. pipeline 에 레이트리미터를 넣는다.
- robots.txt 확인함 — `/Archives/`, `/files/`, `data.sec.gov` 모두 **Disallow 아님**. 막힌 건 `/admin/`, `/search/`, `/user/` 등 사이트 운영 경로뿐.

### 수집 경로
1. `daily-index/{YYYY}/QTR{n}/form.{YYYYMMDD}.idx` 에서 `^4 ` 행만 뽑는다 (하루 ~712건)
2. 각 행의 accession 으로 `Archives/edgar/data/{CIK}/{accession}/ownership.xml`
3. `<nonDerivativeTransaction>` 마다 거래일·코드·주수·단가·거래후보유

### 주의 — 거래 코드가 방향을 결정한다
`transactionCode` + `transactionAcquiredDisposedCode` 조합을 읽어야 한다. **P/S 만 진짜 시장 거래**다.

| 코드 | 뜻 | 우리 표시 |
|---|---|---|
| `P` | Open market purchase | **매수** |
| `S` | Open market sale | **매도** |
| `A` | Grant/award (보상) | 매수 아님 — 별도 라벨 |
| `M` | 옵션 행사 | 매수 아님 |
| `F` | 세금 납부용 원천징수 | 매도 아님 |
| `G` | 증여 | 별도 |

⚠️ 위 샘플의 7건은 전부 `A`(보상)다. 이걸 "CEO가 7일 연속 매수"로 표시하면 **거짓**이다.
국장에서 무상취득 단가 0원을 null 처리했던 것과 같은 종류의 함정.

### 들어갈 영역
홈 피드(S1) · 인물 상세(S4) · 종목 상세(S5) · 캘린더 — **국장과 100% 같은 구조**라 화면 재사용 가능.

---

## U2. SEC EDGAR — 13F-HR (기관 보유) ★ Autopilot 의 "기관" 파트

### 확인한 것
```
버크셔 해서웨이 (CIK 1067983) 최근 13F-HR: 2026-05-15
https://www.sec.gov/Archives/edgar/data/1067983/000119312526226661/53405.xml → 45KB
  보유 종목 90개, 파싱 성공:
    AMERICAN EXPRESS CO   CUSIP 025816109  $45,087,984,892  149,061,045주
    COCA COLA CO          CUSIP 191216100  $21,501,063,540  282,722,729주
    APPLE INC             CUSIP 037833100  $20,471,924,668   80,664,820주
    OCCIDENTAL PETE CORP  CUSIP 674599105  $17,221,193,015  264,941,431주
    APPLE INC             CUSIP 037833100  $15,618,994,925   61,542,988주  ← 중복!
```

### 확인 과정에서 발견한 함정 2개
1. **`value` 단위** — 2023년 이전엔 천 달러 단위였으나 지금은 **달러 그대로**다. 옛 규칙으로 읽으면 1000배 틀린다.
2. **같은 종목이 여러 행** — 운용 재량(discretion)별로 나뉘어 신고된다. **CUSIP 기준 합산 필수.**
   위 애플 두 행을 안 합치면 보유 순위가 틀어진다.

### 얻는 법
키 불필요. 다만 **어느 기관을 추적할지 우리가 골라야 한다** (전체 13F 제출자는 약 6,000곳).
초기 큐레이션 예: 버크셔 · ARK · Bridgewater · Citadel · Renaissance · Scion(버리) · Pershing Square · Tiger Global.
CIK 는 `https://www.sec.gov/cgi-bin/browse-edgar?company=<이름>&action=getcompany&output=atom` 으로 1회 조회 후 상수로 박는다.

### ⚠️ 반드시 화면에 붙일 라벨
13F 는 **분기 종료 후 45일 이내** 제출이다. 즉 우리가 보는 건 **최대 4.5개월 묵은 스냅샷**이고,
공매도 포지션·채권·해외주식은 아예 안 들어간다. "지금 버크셔가 들고 있는 것"이 **아니다**.
공직자 재산공개에 "연 1회 공개"를 붙였듯, 여기엔 **"YYYY년 M분기 말 기준 · 45일 지연"** 이 의무다.

### 들어갈 영역
탐색(S3)에 **"기관" 섹션 신설** · 종목 상세(S5)에 "이 종목을 들고 있는 기관" · 인물 상세를 기관에도 재사용.

---

## U3. House Clerk — 하원의원 거래 (STOCK Act PTR) ★ Autopilot 의 간판

### 확인한 것
```
https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2026FD.zip
  → HTTP 200, 53KB, last-modified 2026-08-03 (어제 갱신됨. 살아있는 소스)
  내용물: 2026FD.xml (392KB) + 2026FD.txt (탭 구분, 같은 내용)
  총 1,457건 · FilingType 분포: C 694 / P 323 / X 244 / W 96 / D 63 / A 33
                                        ↑ P = Periodic Transaction Report = 거래 신고
```

**XML 은 색인일 뿐이다** (이름·주/선거구·제출일·DocID). 거래 내용은 PDF 안에 있다.
그래서 관보 때와 같은 상황인지 확인하려고 PDF를 실제로 받아 렌더링해봤다:

```
https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20034916.pdf → HTTP 200, 64KB
```

렌더링 결과 — **관보와 달리 진짜 텍스트 PDF다** (내장 폰트 15개, 벡터 텍스트):

> PERIODIC TRANSACTION REPORT · Filing ID #20034916
> Hon. Robert J. Wittman, Member, VA01
> **Crown Castle Inc. Common Stock (CCI) [ST] · S · 06/30/2026 · 통지 07/02/2026 · $1,001 – $15,000**
> Subholding Of: Morgan Stanley

### 🔴 가장 중요한 발견 — 금액이 "구간"이다
미국 의회 신고는 **정확한 금액을 요구하지 않는다.** 11개 구간 중 하나로만 신고한다:

| 구간 | 범위 |
|---|---|
| 1 | $1,001 – $15,000 |
| 2 | $15,001 – $50,000 |
| 3 | $50,001 – $100,000 |
| 4 | $100,001 – $250,000 |
| 5 | $250,001 – $500,000 |
| 6 | $500,001 – $1,000,000 |
| 7 | $1,000,001 – $5,000,000 |
| 8 | $5,000,001 – $25,000,000 |
| 9 | $25,000,001 – $50,000,000 |
| 10 | $50,000,000+ |

**이건 설계에 직접 영향을 준다.** 빅보드의 핵심 시각 요소가 "4,000억" 같은 큰 숫자인데,
미장 의회 데이터엔 그런 수가 없다. 대응 방향:
- 행에는 **구간 그대로** 표기 (`$1,001–$15,000`). 중간값으로 바꿔 단일 숫자처럼 보이게 하면 거짓이다.
- 정렬·합계가 필요하면 중간값을 쓰되 **"구간 중간값 기준 추정"** 라벨을 반드시 병기.
- 인물 순위는 "총액"보다 **거래 건수·종목 수**가 더 정직하다.

### 그 외 주의
- **신고 지연**: 거래일과 신고일이 다르다. 법정 기한은 거래 후 30~45일. 위 예도 6/30 거래 → 7/10 신고.
  국장에서 "거래일 vs 공시일 시차"를 정보 포인트로 삼았는데, 미장에선 **훨씬 크다.**
- **본인 거래가 아닐 수 있다**: `Owner` 열이 SP(배우자)·DC(자녀)·JT(공동)일 수 있다. 구분해서 표시.
- **종목이 아닐 수 있다**: `[ST]`=주식, `[MF]`=뮤추얼펀드, `[OP]`=옵션, `[GS]`=국채. **`[ST]`/`[OP]` 만 우리 대상.**
- 자산명에 티커가 `(CCI)` 형태로 들어있다. 티커 없는 항목(사모·부동산)은 버린다.

### 얻는 법
- 키 불필요, 로그인 불필요. robots.txt 는 404(= 규칙 없음)라 **크롤링 금지 표시가 없다.**
  다만 부하를 줄이려고 ZIP 색인은 하루 1회, PDF는 신규 DocID만 받는다.
- **🔑 결정 필요**: PDF 텍스트 추출기가 필요하다.
  - (a) pipeline 에 의존성 추가 (`pdfjs-dist` 등) — 확실하지만 지금까지의 0-의존성 원칙이 깨진다
  - (b) 직접 구현 — DART ZIP 리더를 자체 구현했듯 가능하지만 PDF는 훨씬 복잡하다 (추천 안 함)
  - **추천: (a).** pipeline 은 app 과 분리된 패키지라 웹앱 번들 크기에 영향이 없다.

### 들어갈 영역
홈 피드(S1) "정치인" 필터 · 인물 상세(S4) · **신규: 의원 프로필**(정당·주·선거구·위원회)

---

## U4. Senate EFD — 상원의원 거래 ❌ 막힘

### 확인한 것
```
https://efdsearch.senate.gov/search/home/  → HTTP 403 (Akamai "Access Denied")
https://efdsearch.senate.gov/robots.txt    → HTTP 403 (robots.txt 조차 못 읽음)
```

브라우저가 아닌 요청을 차단한다. 게다가 검색 전에 **"약관 동의" 체크박스**를 눌러야 세션이 열린다.

### 그래서 제 판단
**자동 우회는 하지 않겠습니다.** 봇 차단을 뚫는 것이고, 약관 동의를 유저 대신 클릭하는 것이라 둘 다 제가 하면 안 되는 일입니다. 선택지:

- **(A) 상원은 일단 제외** — 하원(435명)만으로도 Autopilot 스타일은 성립. 화면에 "하원만 포함" 명시. **가장 빠르고 깨끗함.**
- **(B) 유저가 직접 내려받기** — efdsearch 에서 검색 결과 CSV 를 직접 받아 `pipeline/data/` 에 넣는다. 국장 공직자 재산 파일과 **완전히 같은 경로** (`readSheet()` 재사용 가능).
- **(C) 유료 API 구매** — 아래 U4-alt.

### U4-alt. 이미 파싱된 상용 API (하원+상원 한 번에)
> ⚠️ 아래는 **가격·무료 티어를 제가 확인하지 못했습니다.** 키 없이는 응답이 안 와서 실제 검증 불가.
> 붙이기로 하면 그때 실제 호출해 확인하겠습니다.

| 서비스 | 커버리지 | 비고 |
|---|---|---|
| Quiver Quantitative | 하원+상원, 정부계약, 로비 | Autopilot 이 쓰는 것으로 알려진 계열 |
| Financial Modeling Prep | `senate-trading`, `house-disclosure` | 무료 티어 있으나 의회 엔드포인트는 유료일 가능성 |
| Finnhub | `congressional-trading` | Premium 전용으로 알려짐 |

- 참고: 커뮤니티 무료본이던 **House/Senate Stock Watcher S3 는 지금 403** 입니다 (직접 확인). 죽은 소스.

---

## U5. 미국 시세 API 🔑 **유일하게 유저 작업이 필요한 항목**

### 확인한 것 (키 없이 호출한 실제 응답)
```
Finnhub        {"error":"Please use an API key."}
Polygon        {"status":"ERROR","error":"API Key was not provided"}
Tiingo         {"detail":"Please supply a token"}
Alpha Vantage  demo 키로 IBM 종가 $223.65 정상 응답 ✅
Stooq          자바스크립트 PoW 챌린지 → 봇 차단. **사용 불가·시도 안 함**
```

### 추천: **Finnhub** → 차선 **Twelve Data**

| 후보 | 무료 한도 | 장점 | 단점 |
|---|---|---|---|
| **Finnhub** ★ | 분당 60회 | 시세+기업정보+실적, 미국 커버리지 넓음 | 시총·52주는 별도 엔드포인트 |
| Twelve Data | 하루 800회 | 한 번에 여러 심볼 | 한도 관리 필요 |
| Polygon | 분당 5회 | 데이터 품질 최상 | 분당 5회는 **너무 적음** — 우리 종목 수로는 불가 |
| Alpha Vantage | 하루 25회 | 키 발급 즉시 | **하루 25회는 사실상 사용 불가** |

> 국장 시세는 "날짜 하나로 전 종목"이 와서 하루 3회면 끝났는데(865회 → 3회로 줄인 그 구조),
> 미국 무료 API 는 대부분 **심볼당 1회**다. 그래서 추적 종목 수를 제한하거나 갱신 주기를 늘려야 한다.
> 초기엔 **의회·기관·내부자 데이터에 등장한 종목만** 시세를 받는 방식을 권합니다.

### 얻는 법 (Finnhub 기준)
1. https://finnhub.io/register — 이메일만으로 가입 (신용카드 불필요)
2. 로그인 → Dashboard 에 **API Key** 가 바로 보입니다
3. `pipeline/.env` 에 추가:
   ```
   FINNHUB_KEY=여기에붙여넣기
   ```
4. 배포용으로 GitHub 저장소 Settings → Secrets and variables → Actions → `FINNHUB_KEY` 등록

### 들어갈 영역
종목 상세(S5) 시세 블록 · 홈/탐색 행의 등락률 · 스파크라인 — **국장 구조 그대로 재사용.**

---

## U6. SEC `company_tickers.json` (내부 전용)

```
https://www.sec.gov/files/company_tickers.json → HTTP 200, 797KB
  10,412 종목 · {"cik_str":320193,"ticker":"AAPL","title":"Apple Inc."}
```
CIK↔티커 매핑. Form 4/13F 는 CIK·CUSIP 으로 오고 화면엔 티커를 보여야 하므로 필수.
키 불필요. 주 1회 갱신이면 충분. **CUSIP↔티커는 이 파일로 안 되므로** 13F 는 별도 매핑이 필요하다 (13F 종목 목록이 SEC에서 분기별로 제공됨 — 붙일 때 확인 예정).

---

## 국장/미장 전환 — 구조 제안

### 데이터
```
app/public/data/
  kr/  disclosures.json persons.json stocks.json rankings.json sparklines.json gazette.json meta.json
  us/  disclosures.json persons.json stocks.json rankings.json sparklines.json congress.json institutions.json meta.json
```
`getDisclosures()` 가 현재 시장을 보고 경로를 고르게 한다. **화면 코드는 거의 안 바뀐다** —
`Disclosure` 스키마가 양쪽 공통이기 때문. 미장 전용 필드만 optional 로 추가:
- `amountRange?: [number, number]` (의회 구간)
- `ownerType?: 'self' | 'spouse' | 'child' | 'joint'`
- `filingLagDays?: number` (거래→신고 지연)

### 시장 선택 UI
1. **온보딩(W1)에 1스텝 추가** — "어느 시장을 보시겠어요?" 국장 / 미장
2. **홈 헤더 로고 옆 전환 칩** — 언제든 바꿀 수 있게. 설정에도 동일 항목
3. `localStorage` 저장. 기본값은 **국장** (기존 사용자 경험 유지)

### 법적 가드레일 (규칙 1) — 미장에서 더 조심할 것
- Autopilot 은 "따라 사기(copy trading)" 서비스지만 **우리는 정보 서비스다.** "따라하기/복사" 워딩 금지 — `scripts/check-tokens.mjs` 금지어에 `copy trade`, `따라 사기`, `포트폴리오 복제` 추가 예정
- 미국 증권사 딥링크는 국장과 별개다 (Robinhood/Schwab/Fidelity). **아웃링크만**, 종목·주문 정보 전달 금지 — 현재 `broker.ts` 정책 그대로 확장

---

## 실행 순서 제안

| 순서 | 내용 | 유저 작업 | 비고 |
|---|---|---|---|
| 1 | 시장 선택 + 데이터 경로 분리 | 없음 | 화면 골격 |
| 2 | **U1 Form 4** | 없음 | 국장 화면 그대로 재사용, 효과 즉시 |
| 3 | **U6 + U2 13F** | 추적 기관 목록 확인 | 탐색에 "기관" 신설 |
| 4 | **U3 하원 PTR** | PDF 파서 의존성 승인 | 간판 기능 |
| 5 | **U5 시세** | 🔑 Finnhub 키 발급 | 언제든 병행 가능 |
| 6 | U4 상원 | (A)(B)(C) 중 선택 | 미룰 수 있음 |

**2~4번은 지금 바로 시작할 수 있습니다.** 유저 작업은 5번 키 발급과 4번 의존성 승인 둘뿐입니다.
