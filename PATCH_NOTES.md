# PATCH v0.2.1 (2026-07-31) — 데이터 전략 v2

적용법: 이 zip을 bigshot-radar 프로젝트 루트에 압축 해제(덮어쓰기 허용). PATCH_NOTES.md는 적용 후 삭제해도 됨.

## 덮어쓰기 (2)
- CLAUDE.md — 규칙 5 변경: 목데이터 → 실데이터 파이프라인(/data/*.json fetch만, 키는 Secrets, 크롤링 승인제)
- docs/decisions_log.md — 2026-07-31 데이터 전략 v2 항목 추가

## 교체 (1)
- docs/04_dev/dev_prompts_webapp.md — v2 전면 개정: STEP 2가 데이터 파이프라인(DART 키 발급→탐색 2-A→수집 2-B→Actions cron 2-C)으로 교체, QA에 원문 대조 추가, 법적 메모 신설

## 신규 (3)
- docs/04_dev/dev_prompts_webapp_v1_archive.md — 구버전(목데이터) 보존
- docs/04_dev/figma_export_handoff.md — MCP 없이 내보내기 핸드오프 (이미 넣었다면 동일 파일)
- docs/03_design/prompts_cowork_branding.md — 코워크 브랜딩 세션 (이미 넣었다면 동일 파일)

## 개발 시작 전 할 일
DART OpenAPI 키(opendart.fss.or.kr) + 공공데이터포털 금융위 주식시세정보 키(data.go.kr) 발급
