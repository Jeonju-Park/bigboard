# 빅보드 (BIG board)

내부자·고위공직자의 주식 거래 공시를 모아 보여주는 정보 서비스. **투자자문이 아닙니다.**

데이터 출처: 금융감독원 전자공시시스템(DART) OpenAPI

> 기획 문서: `docs/00_brief/PROJECT_BRIEF.md` → `docs/01_research/` → `docs/02_idea/idea_bigshot_radar.md`
> 작업 규칙: `CLAUDE.md` · 개발 순서: `docs/04_dev/dev_prompts_webapp.md`

---

## 지금 상태

- ✅ 웹앱 9개 화면 구현 (실데이터)
- ✅ DART 수집 파이프라인 — 최근 30일 공시 2,700여 건
- ⏳ **GitHub 저장소 생성 + Secrets 등록** ← 유저가 할 차례
- ⛔ 시세 정보 — 공공데이터포털 키 미발급 (해당 항목은 화면에서 숨김)

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
| `npm run qr <URL>` | 배포 URL QR (qrencode 필요) |

개발용 화면: `#/dev-gallery` (컴포넌트 갤러리). 각 화면 우상단에 상태 토글(정상/로딩/빈/에러)이 있습니다.

---

## GitHub Pages 배포 — 클릭 단위 안내

### 1단계. GitHub 저장소 만들기 (웹에서)

1. https://github.com/new 접속
2. **Repository name** 에 `bigshot-radar` 입력 (다른 이름을 쓰면 아래 URL 도 바뀝니다)
3. **Public** 선택 — Pages 무료 배포는 공개 저장소여야 합니다
4. "Add a README file" 등 체크박스는 **전부 해제** (이미 파일이 있습니다)
5. 초록색 **Create repository** 클릭

### 2단계. 이 폴더를 저장소에 연결 (터미널에서)

저장소를 만들면 나오는 주소를 `<주소>` 자리에 넣으세요.

```bash
git branch -M main
git remote add origin <주소>     # 예: https://github.com/내아이디/bigshot-radar.git
git push -u origin main
```

### 3단계. API 키를 Secrets 에 등록 (웹에서)

공개 저장소이므로 키를 코드에 넣으면 그대로 노출됩니다. 반드시 Secrets 를 쓰세요.

1. 저장소 페이지 상단 **Settings** 탭
2. 왼쪽 메뉴 **Secrets and variables** → **Actions**
3. 초록색 **New repository secret**
4. **Name** 에 `DART_KEY`, **Secret** 에 발급받은 키 붙여넣기 → **Add secret**
5. 공공데이터포털 키를 받으면 같은 방법으로 `DATA_GO_KR_KEY` 도 추가

### 4단계. Pages 켜기 (웹에서)

1. **Settings** → 왼쪽 메뉴 **Pages**
2. **Source** 를 **GitHub Actions** 로 변경 (Deploy from a branch 아님)
3. 저장

### 5단계. 배포 확인

1. 저장소 상단 **Actions** 탭 → `deploy` 워크플로가 도는지 확인
2. 초록 체크가 뜨면 `https://<내아이디>.github.io/bigshot-radar/` 접속
3. 휴대폰에서 열려면: `npm run qr https://<내아이디>.github.io/bigshot-radar/`

### 6단계. 자동 수집 확인

1. **Actions** 탭 → 왼쪽에서 `pipeline` 선택 → **Run workflow** 로 수동 1회 실행
2. 성공하면 `app/public/data/` 에 새 커밋이 생기고, 그 푸시가 `deploy` 를 다시 돌려 사이트가 갱신됩니다
3. 이후 평일 장중에는 30분 간격으로 자동 실행됩니다

> GitHub Actions 의 예약 실행은 정시를 보장하지 않고 수 분~수십 분 밀립니다.
> 그래서 화면이 "공시 수집 N분 전"으로 실제 시각을 표시하고, 6시간을 넘기면 지연 배너를 띄웁니다.

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
