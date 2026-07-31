# pipeline_design.md — 데이터 파이프라인 설계 (STEP 2-A 산출)

> 조사일 2026-07-31. 모든 결론은 **실제 DART OpenAPI 호출 결과**로 검증했다(추정 아님).
> 탐색 스크립트: `pipeline/src/explore.ts` (phase 1~5). 원본 샘플은 `pipeline/.explore/`(커밋 제외).

---

## 0. 한 줄 결론

**단가·거래일·세부변동내역은 요약 API에 없다. 원문 XML을 파싱해야 하며, 그 파싱은 어렵지 않다.**
DART 원문이 표를 시각적 마크업이 아니라 `ACODE`/`AUNIT` **의미 코드**로 태깅하기 때문이다.

---

## 1. 탐색 결과 요약

### 1-1. 지분공시(D) 보고서 유형 분포 — 최근 14일 500건 샘플

| 건수 | 보고서 |
|---:|---|
| 291 | 임원ㆍ주요주주특정증권등소유상황보고서 ← **주 소스** |
| 154 | 주식등의대량보유상황보고서(일반) |
| 31 | 주식등의대량보유상황보고서(약식) |
| 16 | 임원ㆍ주요주주특정증권등**거래계획**보고서 ← **isPlanned·dDay 소스** |
| 7 | 의결권대리행사권유참고서류 (대상 아님) |
| 1 | 임원ㆍ주요주주특정증권등거래계획**철회**보고서 ← 처리 필요 |

정정 표기 포함 15건 = **3.0%** → upsert 로직이 실제로 필요하다.

### 1-2. 요약 API에 무엇이 있고 없는가 (검증됨)

`elestock.json` (임원·주요주주 소유상황) 응답 필드:
```
rcept_no, rcept_dt, corp_code, corp_name, repror, isu_exctv_rgist_at,
isu_exctv_ofcps, isu_main_shrholdr, sp_stock_lmp_cnt, sp_stock_lmp_irds_cnt,
sp_stock_lmp_rate, sp_stock_lmp_irds_rate
```

| 필요한 값 | 요약 API에 있나 | 비고 |
|---|---|---|
| 보고자·직위·등기여부 | ✅ | `repror`, `isu_exctv_ofcps`, `isu_exctv_rgist_at` |
| 보유 총수 (holdingAfter) | ✅ | `sp_stock_lmp_cnt` |
| 증감 수량 (quantity) | ✅ | `sp_stock_lmp_irds_cnt` |
| **단가 (unitPrice)** | ❌ **없음** | 원문 파싱 필수 |
| **거래일 (tradeDate)** | ❌ **없음** | 원문 파싱 필수 (`rcept_dt`는 공시일이지 거래일이 아니다) |
| **세부변동내역 (details)** | ❌ **없음** | 원문 파싱 필수 |
| 보고사유 | ❌ | 원문 파싱 |

### 1-3. 원문 XML 구조 — 파싱 난이도 **낮음**

`document.xml` → ZIP(1개 파일) → UTF-8 XML. ZIP 해제는 `node:zlib.inflateRawSync` 로 자체 구현(의존성 0).

세부변동내역 표의 각 셀에 의미 코드가 박혀 있다:

| 코드 | 의미 | 예시 |
|---|---|---|
| `TU AUNIT="RPT_RSN"` | 보고사유 | `장내매수(+)` |
| `TU AUNIT="MDF_DM"` | **변동일** (`AUNITVALUE="20260727"` 기계값 내장) | `2026.07.27` |
| `TU AUNIT="STR_KND"` | 특정증권등의 종류 | `보통주` |
| `TE ACODE="BFR_STK_CNT"` | 변동 전 | `115,800` |
| `TE ACODE="MDF_STK_CNT"` | **증감** | `1,000` |
| `TE ACODE="AFR_STK_CNT"` | 변동 후 | `116,800` |
| `TE ACODE="ACI_AMT2"` | **취득/처분 단가** | `1,500` |
| `TE ACODE="RMK"` | 비고 | `주식매수선택권행사` |
| `TE ACODE="*_SUM"` | 합계행 | `MDF_STK_SUM` 등 |

**컬럼 위치가 아니라 코드로 읽으므로 표 서식이 바뀌어도 안전하다.**

### 1-4. 파싱 신뢰성 실측 (원문 20건 / 세부변동 90행)

| 항목 | 결과 |
|---|---|
| 파싱 성공 | **20 / 20** |
| **합계 검증 불일치** (개별행 증감 합 vs 공시 합계행) | **0건** |
| 단가 있음 | 78행 (87%) |
| 단가 `-` (무상증여·상속·권리행사 등) | **12행 (13%)** → `null` 필수 |

보고사유 분포: 장내매수(+) 72 · 주식매수선택권(+) 3 · 신규선임(+) 2 · 장내매도(-) 2 · 주식매수청구권 행사(+) 1 · (병합셀로 비어있음) 10

> **`(+)`/`(-)` 접미가 매수/매도를 인코딩한다.** `MDF_STK_CNT` 부호와 함께 이중으로 방향을 판정한다.
> **병합셀(ROWSPAN) 10행** — 앞 행의 값을 forward-fill 해야 한다. 구현 시 반영.

### 1-5. 거래계획 사전공시 (isPlanned·dDay)

`pblntf_detail_ty=D005/D006` 필터는 **동작하지 않는다**(필터를 무시하고 전체 4,317건을 반환). → `report_nm` 문자열로 걸러야 한다.

원문에서 확보되는 값 (실측, 디젠스/디에이치코리아 20260731000504):

| 코드 | 값 | 매핑 |
|---|---|---|
| `MDF_STR_DT` | 2026.08.31 | 거래 예정 시작일 → **dDay 계산 기준** |
| `MDF_END_DT` | 2026.09.29 | 거래 예정 종료일 |
| `PLN_STR_STK` | 156,251 | 계획 수량 |
| `PLN_ACI_AMT2` | 1,920 | 계획 단가 |
| `PLN_TRAN_AMT` | 300,001,920 | 계획 금액 |
| `TRAN_PPS` | 책임경영 강화 | 거래 목적 |
| `CRP_CD` | 113810 | 종목코드 |

**산술 검증: 156,251 × 1,920 = 300,001,920 ✓** — 단가×수량=총액 모델이 공시 자체와 일치한다.

---

## 2. 소스 → 스키마 매핑표

### disclosures.json

| 필드 | 소스 | 가공 | 누락 시 |
|---|---|---|---|
| `id` | `rcept_no` | 그대로 (DART 접수번호 = 자연 PK) | — |
| `personName` | `list.flr_nm` / `elestock.repror` | 그대로 | 스킵 |
| `personType` | — | **M1은 전부 `insider`** (공직자는 M2, 부록 A-1) | — |
| `title` | `elestock.isu_exctv_ofcps` | 직위. `-`면 `주요주주`/`-` 판정 | `''` |
| `company` | `list.corp_name` | 그대로 | 스킵 |
| `stockCode` | `list.stock_code` | 비상장(공란)이면 **해당 건 스킵** | 스킵 |
| `direction` | 원문 `RPT_RSN` 의 `(+)/(-)` + `MDF_STK_CNT` 부호 | 둘이 충돌하면 수량 부호 우선 + 로그 | 스킵 |
| `unitPrice` | 원문 `ACI_AMT2` | 콤마 제거. `-`면 **`null`** | `null` |
| `quantity` | 원문 `MDF_STK_CNT` 합 (절댓값) | `elestock.sp_stock_lmp_irds_cnt` 와 교차검증 | 스킵 |
| `totalAmount` | **Σ(단가×수량) 파생** | 단가 `null` 행이 하나라도 있으면 **전체 `null`** | `null` |
| `tradeDate` | 원문 `MDF_DM` 의 `AUNITVALUE` | 여러 행이면 **가장 이른 날** | 스킵 |
| `discloseDate` | `list.rcept_dt` | — | — |
| `reportReason` | 원문 `RPT_RSN` | `(+)/(-)` 접미 제거 | `''` |
| `isPlanned` | `report_nm` 에 `거래계획` 포함 | — | `false` |
| `dDay` | 계획건의 `MDF_STR_DT` − 오늘 | 계획 아니면 `null` | `null` |
| `holdingBefore` | 원문 첫 행 `BFR_STK_CNT` | — | `0` |
| `holdingAfter` | 원문 합계 `AFR_STK_SUM` (없으면 마지막 행) | `elestock.sp_stock_lmp_cnt` 와 교차검증 | `0` |
| `details[]` | 원문 각 데이터 행 | `{date, price\|null, qty}` | `[]` |
| `dartUrl` | `https://dart.fss.or.kr/dsaf001/main.do?rcpNo={rcept_no}` | **모든 건에 필수** (실명 데이터 책임) | — |
| `isAmended` | `report_nm` 에 `정정` 포함 | — | `false` |

### stocks.json — ⚠️ 공공데이터포털 키 미발급 상태

2026-07-31 현재 포털 서버 점검으로 **키 발급 불가**. 따라서:

| 필드 | 상태 |
|---|---|
| `code`, `name` | ✅ DART `list.json` 에서 확보 |
| `prevClose`, `change`, `marketCap`, `volume`, `high52`, `low52`, `sparkline` | ⛔ **`null` / 빈 배열** — 키 확보 후 `pipeline/src/stocks.ts` 활성화 |
| `per`, `pbr`, `divYield` | ⛔ `null` (공공 소스로 확보 여부도 미검증) |

**화면 처리**: `null` 항목은 행을 숨긴다(문서 §2-A 3번 지시). 값을 추정·보간하지 않는다.
**금지**: 포털 시세 크롤링은 약관 리스크로 오픈이슈 O3 해소 전까지 하지 않는다.

### persons.json / rankings.json
`disclosures` 에서 파생 집계한다. 랭킹에는 **"집계 기준" 문구를 화면에 병기**한다(원문이 아니라 우리 계산이므로).

### meta.json
`lastUpdated`(ISO), `sources`(출처 표기), `counts`. 한 번도 안 돌았으면 `lastUpdated: null` — **현재 시각으로 대체하지 않는다**(규칙 2).

---

## 3. 수집 주기와 호출량

### 호출량 실측 기반 추정

| 구분 | 계산 | 호출 수 |
|---|---|---|
| D002 발생량 | 844건 / 7일 | **약 120건/일** |
| 증분 실행 1회 (30분 간격) | list 1 + document ≈ 3 | **약 4회** |
| 하루 증분 총합 (18회 실행) | | **약 190회** |
| 초기 적재 30일 | list 12 + document 3,600 | **약 3,612회** |
| 초기 적재 90일 | list 36 + document 10,800 | 약 10,836회 |

DART 일일 한도 20,000회 대비:
- **증분 운영: 약 1%** — 여유 충분
- **초기 적재 30일: 약 18%** — 안전. 이걸 기본값으로 한다
- 초기 90일은 54%로 가능하지만 느리다(문서 캐시로 재실행은 0회)

### 결정
- **초기 적재 기본 30일**, `--days` 로 조정 가능
- **원문 디스크 캐시**(`pipeline/.cache/`) — 같은 `rcept_no` 는 다시 받지 않는다. 재실행·디버깅 비용 0
- Actions cron: 장 운영일 09~18시 30분 간격 + `workflow_dispatch`
  GitHub Actions cron 은 **정시 실행이 보장되지 않고 수 분~수십 분 지연**된다(무료 러너 혼잡). 신선도 라벨을 `meta.lastUpdated` 실값으로 표시하는 이유다

---

## 4. 정정공시 처리 (upsert)

DART 정정은 **새 `rcept_no` 로 별도 접수**되고 보고서명에 `[기재정정]` 등이 붙는다.
따라서 `rcept_no` 만으로는 원본과 정정을 묶을 수 없다.

**채택 방식**: `(corp_code, personName, tradeDate)` 를 논리 키로 삼아
같은 키의 건이 있으면 **접수일이 늦은 것으로 대체**하고 `isAmended: true` 를 세운다.
원본은 버리지 않고 `dartUrl` 은 각각 유지한다 → 화면에서 "정정됨" 표시.

**한계(기록)**: 논리 키가 완벽하지 않다. 같은 인물이 같은 날 두 건을 별도 보고하면 오탐 가능.
실데이터에서 정정이 3%뿐이므로 M1은 이 방식으로 가고, 오탐 사례가 관측되면 재검토한다.

---

## 5. 실패 내성

- 개별 건 파싱 실패 → **스킵 + 로그**, 전체 중단 금지
- 원문이 ZIP 이 아니거나 세부변동 행 0개 → 스킵하고 `skipped[]` 에 사유 기록
- 실행 끝에 `수집 N건 / 스킵 M건 / 사유별 집계` 를 반드시 출력
- 네트워크 실패는 3회 지수 백오프 후 스킵

---

## 6. 미결·유저 확인 필요

1. **공공데이터포털 키** — 발급되면 `stocks.ts` 활성화. 그때까지 시세 항목은 화면에서 숨김
2. **오픈이슈 O3(시세 소스)** — 포털이 PER·PBR·배당수익률을 안 주면 이 항목들은 M1에서 영구 제외할지 결정 필요
3. **초기 적재 기간** — 기본 30일로 진행. 더 길게 원하면 `npm run pipeline -- --days 90`
4. **비상장 보고 건** — `stock_code` 가 비면 스킵한다(종목 화면으로 못 가므로). 스킵 건수를 로그로 보고
