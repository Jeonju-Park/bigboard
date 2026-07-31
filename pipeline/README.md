# pipeline/ — 데이터 수집

`app/` 과 **의존성을 분리한 별도 Node 패키지**입니다. 브라우저 번들에 수집 코드나 API 키가 섞이지 않게 하기 위함입니다 (CLAUDE.md 절대규칙 5).

## 역할

```
DART OpenAPI ─┐
              ├─→ pipeline/ ─→ app/public/data/*.json ─→ (git commit) ─→ 웹앱이 fetch
공공데이터포털 ─┘
```

브라우저는 **외부 API 를 직접 호출하지 않습니다.** CORS 와 API 키 노출 때문입니다.

## 키 설정 (최초 1회)

```bash
cp pipeline/.env.example pipeline/.env
# 편집기로 pipeline/.env 를 열어 DART_KEY, DATA_GO_KR_KEY 를 채웁니다
```

`pipeline/.env` 는 `.gitignore` 에 걸려 있어 커밋되지 않습니다.

## 실행

```bash
npm run pipeline        # 저장소 루트에서 (= npm --prefix pipeline run fetch)
```

Node 24 의 네이티브 TypeScript 실행과 `--env-file` 을 쓰므로 `tsx`·`dotenv` 의존성이 없습니다.

## 상태

- [ ] STEP 2-A — 소스 탐색 · 스키마 매핑 설계 (승인 게이트)
- [ ] STEP 2-B — `src/fetch.ts`, `src/stocks.ts` 구현
- [ ] STEP 2-C — GitHub Actions cron

## 원칙

- 개별 건 파싱 실패는 **스킵 + 로그**. 전체 중단 금지
- 정정공시는 같은 보고서 기준 **upsert**(원본 대체) + 정정 표시
- 실명 공시 데이터는 **원문 그대로**. 추정·보간 값을 만들어 넣지 않는다 — 확보 못 한 값은 `null`
- 새 소스 추가 시 `robots.txt`·이용약관 확인 결과를 먼저 보고 (노션 오픈이슈 O3)
