# 배포 가이드 — GitHub Pages

> 코드·워크플로는 다 준비됐습니다. **유저가 해야 할 일만** 적었습니다.
> 순서대로 하면 15분 안에 끝납니다.

---

## 1. GitHub 저장소 만들기

1. https://github.com/new
2. Repository name: `bigboard` (원하는 이름 아무거나)
3. **Public** 으로 (Private 도 되지만 Pages 는 유료 플랜이 필요합니다)
4. "Add a README" 등은 **전부 체크 해제** — 이미 파일이 있어서 충돌납니다
5. Create repository

그다음 터미널에서 (저장소 주소는 방금 만든 것으로):

```bash
cd "07_1bigshot-radar 2"
git remote add origin https://github.com/<계정>/bigboard.git
git push -u origin main
```

---

## 2. Secrets 등록 🔑

저장소 → **Settings** → 좌측 **Secrets and variables** → **Actions** → `New repository secret`

세 개를 각각 등록합니다. 이름은 **정확히** 아래와 같아야 합니다.

| Name | Value | 없으면 |
|---|---|---|
| `DART_KEY` | pipeline/.env 의 DART_KEY 값 | ❌ 워크플로가 실패합니다 (필수) |
| `DATA_GO_KR_KEY` | 공공데이터포털 **Decoding** 키 | 국장 시세·관보가 건너뛰어집니다 |
| `FINNHUB_KEY` | Finnhub API Key | 미장 시세가 건너뛰어집니다 |

> ⚠️ `.env` 파일은 커밋되지 않습니다(.gitignore). 그래서 Secrets 등록이 따로 필요합니다.
> 값은 `pipeline/.env` 를 열어 복사하세요.

---

## 3. Pages 켜기

저장소 → **Settings** → 좌측 **Pages**

- **Source** 를 `Deploy from a branch` 가 아니라 **`GitHub Actions`** 로 바꿉니다

이게 핵심입니다. `Deploy from a branch` 로 두면 우리 빌드 워크플로가 무시됩니다.

---

## 4. 첫 배포 돌리기

저장소 → **Actions** 탭

1. 좌측에서 **deploy** 선택 → `Run workflow` → main → 실행
2. 2~3분 뒤 초록 체크가 뜨면 완료
3. 주소는 `https://<계정>.github.io/bigboard/` 입니다

---

## 5. 데이터 수집 확인

Actions 탭 → **pipeline** → `Run workflow`

첫 실행은 **오래 걸립니다** (최대 1시간). 미국 시세가 종목당 1회 호출이라 그렇습니다.
이후 자동 실행은 평일 30분 간격이고, 무거운 단계(미국 시세·13F·관보)는 하루 한 번만 돕니다.

성공하면 `data: 국장 N건 · 미장 M건 (자동 수집)` 커밋이 자동으로 올라옵니다.

---

## 자주 나는 문제

**`deploy` 는 성공했는데 흰 화면**
→ Pages Source 가 `GitHub Actions` 인지 다시 확인하세요. `Deploy from a branch` 면
   빌드 결과가 아니라 저장소 파일이 그대로 서빙되어 흰 화면이 됩니다.

**`pipeline` 이 `DART_KEY Secret 이 없습니다` 로 실패**
→ Secret 이름 오타입니다. 대소문자·언더바까지 정확해야 합니다.

**미장 시세만 비어 있음**
→ `FINNHUB_KEY` 미등록입니다. 화면은 시세 항목을 숨기고 정상 동작합니다(고장이 아닙니다).

**공직자 재산이 안 보임**
→ 관보 PDF 는 `pipeline/data/` 에 두는데 이 폴더는 커밋되지 않습니다(.gitignore).
   이미 뽑아낸 결과(`app/public/data/kr/persons.json`)는 커밋돼 있으므로 화면에는 나옵니다.
   **새 관보를 추가하려면 로컬에서** PDF 를 `pipeline/data/` 에 넣고
   `npm --prefix pipeline run gazette:pdf` 를 돌린 뒤 커밋하세요.

---

## 배포 후 남은 일

| 항목 | 필요한 것 |
|---|---|
| 상원의원 거래 | (A) 하원만 유지 / (B) CSV 직접 투입 / (C) 유료 API — **결정 필요** |
| 로그인 | Supabase 프로젝트 생성. PKCE 플로우 (HashRouter 해시 충돌 회피) |
| GA4 계측 | measurement ID |
| 커스텀 도메인 | 도메인 구입 후 Pages 설정 + CNAME |
