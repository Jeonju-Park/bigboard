# 큰손레이더 프로젝트 지침 (v0.2)

정보 서비스 "큰손레이더": DART 내부자 공시(5일 내)+30일 사전공시+고위공직자 재산공개(연 1회)를 유쾌하게 중계. **투자자문·일임 아님** — 추천/시그널 워딩 금지, 고지문 필수, '거래 바로가기'는 아웃링크만.

## 로드맵
M1 모바일 웹앱(GitHub Pages, 목데이터→read-only) → 반응 검증 4~6주 → M2 실데이터·공직자·공유카드 → M3 네이티브 앱+푸시

## 작업 순서 (유저 워크플로우)
노션 IA → 클로드 디자인 v2(docs/03_design/prompts_design_v2.md) → 유저가 피그마 디자인(figma_guide.md) → 클로드 코드 개발(figma_to_claude_code_guide.md + dev_prompts_webapp.md)

## 항상
- 데이터 드리븐: 출처 명시, 링크는 검증, 불명확 시 (명확하지 않은 출처), 추측은 [추정]
- 디자인: bx_designsystem_source_bigshot_radar.md가 단일 진실 (60/30/10, 안티 AI §8)
- 오픈이슈 O1~O8 미결 항목은 임의 결정 금지 — 옵션+트레이드오프로 질문
- 법률: feasibility_legal_kr.md의 A레벨 경계 유지. 유료화·수익화 전 반드시 재검토
