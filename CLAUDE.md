# CLAUDE.md — 큰손레이더 (bigshot-radar)

한국 주식 내부자·고위공직자 거래 공시를 유쾌하게 중계하는 정보 서비스. **M1 = 모바일 웹앱(GitHub Pages) 선배포.**

## 절대 규칙
1. **법적 가드레일**: "추천/시그널/매수·매도하세요" 워딩 금지(코드·카피·목데이터 전부). 고지문 필수 노출. 계좌 연동·자동 주문 코드 금지 — '거래 바로가기'는 아웃링크만
2. **데이터 정직성**: 모든 데이터 블록에 기준시점 라벨. 공직자 데이터는 "연 1회 공개" 명시
3. **토큰 강제**: 색·간격·타이포는 app/src/theme/tokens.ts만. raw 값 하드코딩 금지
4. **디자인**: 60/30/10, 이모지 금지(Material Symbols), 카드는 DisclosureCard만, micro(11px) 레이어에만 위트
5. 데이터: 브라우저에서 외부 API 직접 호출 금지 — pipeline/이 생산한 /data/*.json fetch만. API 키는 .env·Secrets만(커밋 금지). 크롤링은 robots.txt·약관 확인 보고 후 승인제. 로그인/푸시는 여전히 M1 제외

## 구조
- docs/ 기획·리서치·디자인·개발 문서 (04_dev/ia_snapshot.md = 화면 정의, dev_prompts_webapp.md = 개발 순서 v2.1)
- app/ 웹앱 코드 (Vite+React+TS, HashRouter, CSS Modules). 데이터는 app/public/data/*.json fetch만
- pipeline/ 수집 스크립트 (Node+TS, app과 의존성 분리). DART·공공데이터 → app/public/data/*.json 생산
- assets/ 브랜드·피그마 내보내기
- 디자인 정본: docs/03_design/bx_designsystem_source_bigshot_radar.md §2~4 + 클로드 디자인 프로젝트 `9e45dbcf-da6f-407c-a2c0-3090c31d8382`
- IA 원본: 노션 "큰손레이더 IA (v0.2)"

## 워크플로우
docs/04_dev/dev_prompts_webapp.md(v2.1)의 STEP 순서 준수. 한 스텝 = 확인 = git commit. 오픈이슈(O1~O8) 미결 항목은 임의 구현 금지 — 유저에게 질문.
세션 종료·중단 시 docs/decisions_log.md 맨 위에 "현재 STEP / 직전 3줄 / 다음 할 일"을 남긴다 (재개용 인계 노트).
