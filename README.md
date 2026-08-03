# 빅보드 (BIG board)

큰손들이 주식을 사고판 기록을, 공시가 올라온 순서대로 보여주는 **정보 서비스**.

**https://jeonju-park.github.io/bigboard/**

> 이 서비스는 투자자문·투자권유가 아닙니다. 공개된 공시·공공데이터를 정리해 보여줄 뿐이며,
> 투자 판단과 그 결과는 이용자 본인에게 있습니다.

> 기획 문서: `docs/00_brief/PROJECT_BRIEF.md` → `docs/01_research/` → `docs/02_idea/idea_bigshot_radar.md`
> 작업 규칙: `CLAUDE.md` · 개발 순서: `docs/04_dev/dev_prompts_webapp.md`
> 배포·운영: `docs/04_dev/deploy_guide.md`

---

## 다루는 데이터

| 시장 | 대상 | 출처 |
|---|---|---|
| **국내장** | 임원·주요주주 소유변동, 거래계획 | 금융감독원 DART |
| | 고위공직자 보유 주식 | 행정안전부 관보 (원문 PDF) |
| | 시세·시가총액·52주 | 공공데이터포털 |
| **미국장** | 내부자 거래 (Form 4) | SEC EDGAR |
| | 하원의원 거래 (STOCK Act) | 미 하원 사무처 |
| | 기관 분기 보유 (13F) | SEC EDGAR |
| | 시세·지표 | Finnhub |

상원의원 거래는 포함돼 있지 않습니다 — 소스가 자동 수집을 막고 있어
자동화하지 않았습니다 (`docs/04_dev/api_shopping_list_us.md` §U4).

---

## 데이터를 다루는 원칙

이 저장소의 코드가 반복해서 지키는 규칙입니다. 대부분 **실제로 한 번 틀리고 나서** 생겼습니다.

- **모르는 값은 지어내지 않는다.** 단가가 공시에 없으면 `null` 로 두고 화면이 그 줄을 숨깁니다.
  0 으로 채우면 합계와 순위가 조용히 거짓이 됩니다.
- **원문을 고치지 않는다.** 제출자 오타(2030년 거래일, 주당 \$748,119 단가)는 실제로 있습니다.
  원문은 그대로 두고 우리가 계산한 **대표값만** 버립니다.
- **건너뛴 것은 세어서 남긴다.** `meta.skipped` 에 사유별 건수가 들어갑니다.
- **기준 시점을 항상 붙인다.** 13F 는 분기말 + 최대 45일 지연, 공직자 재산은 연 1회 공개입니다.
  "지금 보유"가 아닌 것을 지금인 척 보여주지 않습니다.
- **성격이 다른 데이터를 섞지 않는다.** 공직자 재산공개는 거래가 아니라 보유 스냅샷이라
  시간순 피드에 카드로 넣지 않습니다.
- **숫자끼리 안 맞으면 안 보여준다.** 시가총액이 (주식수 x 주가)와 어긋나면 null 로 둡니다.

---

## 처음 실행하기

```bash
npm run setup          # app/ 과 pipeline/ 의존성 설치
cp pipeline/.env.example pipeline/.env
#   → pipeline/.env 를 열어 DART_KEY 를 채웁니다 (커밋되지 않습니다)
npm run pipeline       # DART 수집 → app/public/data/*.json
npm run dev            # http://localhost:5173
```

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 배포용 빌드 (`app/dist`) |
| `npm run pipeline` | 최근 30일 수집. `-- --days 90` 으로 기간 조정 |
| `npm run check` | 규칙 검사(색·간격·이모지·금지워딩·키유출) + 타입 검사 |
| `npm --prefix pipeline run verify` | 수집 데이터를 DART 원문과 대조 |
| `npm --prefix pipeline run gazette:pdf` | 공직자 재산 (관보 PDF 를 `pipeline/data/` 에 두고) |
| `npm --prefix pipeline run form4` | 미장 내부자 (SEC Form 4) |
| `npm --prefix pipeline run house` | 미 하원의원 (STOCK Act PTR) |
| `npm --prefix pipeline run 13f` | 기관 분기 보유 (13F) |
| `npm --prefix pipeline run us:stocks` | 미장 시세. `-- --full` 로 지표까지 |
| `npm run qr <URL>` | 배포 URL QR (qrencode 필요) |

개발용 화면: `#/dev-gallery` (컴포넌트 갤러리). 각 화면 우상단에 상태 토글(정상/로딩/빈/에러)이 있습니다.

---

## 배포

이미 배포돼 있습니다 — **https://jeonju-park.github.io/bigboard/**

`main` 에 푸시하면 `deploy` 워크플로가 검사(토큰·카피·스키마·타입)를 통과한 뒤 자동 배포합니다.
데이터는 `pipeline` 워크플로가 평일 30분 간격으로 수집해 커밋하고, 그 커밋이 다시 배포를 트리거합니다.

저장소를 새로 만들거나 Secrets 를 다시 넣어야 하면 **[docs/04_dev/deploy_guide.md](docs/04_dev/deploy_guide.md)** 를 보세요.

필요한 Secrets (저장소 Settings > Secrets and variables > Actions):

| 이름 | 없으면 |
|---|---|
| `DART_KEY` | 워크플로 실패 (필수) |
| `DATA_GO_KR_KEY` | 국장 시세·관보 색인 건너뜀 |
| `FINNHUB_KEY` | 미장 시세 건너뜀 |

키가 없어도 앱은 동작합니다 — 해당 항목을 **숨기고** 이유를 설정 화면에 적습니다.

---

## 폴더 구조

```
app/         웹앱 (Vite + React + TypeScript, HashRouter, CSS Modules)
  src/theme/tokens.ts      디자인 토큰 — 색·간격·타이포의 raw 값은 여기에만 존재
  src/lib/data.ts          유일한 데이터 접근 경로 (/data/*.json fetch)
  public/data/*.json       pipeline 이 만들어 커밋하는 정적 데이터
pipeline/    DART 수집 (Node + TS, app 과 의존성 분리, 외부 패키지 0개)
scripts/     check-tokens.mjs (규칙 검사), qr.mjs
docs/        기획·리서치·디자인·개발 문서
```

**브라우저는 외부 API 를 직접 호출하지 않습니다.** CORS 와 키 노출 때문에 수집은 GitHub Actions 가 하고, 웹앱은 커밋된 JSON 만 읽습니다.

---

## 원칙 (전문은 `CLAUDE.md`)

1. 투자 추천·매수 권유 워딩 금지. 거래 바로가기는 **아웃링크만**, 주문 대행 없음
2. 모든 데이터 블록에 기준시점 표시. 확보 못 한 값은 **지어내지 않고 숨김**
3. 색·간격·타이포는 `tokens.ts` 만 — `npm run check` 가 강제
4. 실명 공시 데이터는 원문 그대로 + DART 원문 링크 필수
