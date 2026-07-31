# 04_dev — 개발 모드 산출물 (예정)

게이트: PSF 통과 후 PRD 착수 (03_DEVELOPMENT_GUIDE §1 Q&A로 시작).

## 만들 것 (순서)
1. `prd_bigshot_radar.md`
2. 수집 파이프라인 스펙 (`pipeline_spec.md`): DART 폴링 → 파싱 → DB → 푸시. H6 프로토타입 결과 반영
3. `prompts_bigshot_radar_skeleton.md` → features → design → qa

## 스택 (기획서 기준, PRD에서 확정)
- 수집: Python + cron + Supabase
- 앱: React Native + Expo + FCM
- 분석: Firebase Analytics (이벤트 택소노미는 프로젝트 지침의 데이터 모드 규칙 준수)

## PRD 사전 결정 사항 (Q&A 시간 단축용)
- North Star: 주간 알림 확인 수 / 화면 5개 / 인증: 익명→구글 / 저장: Supabase / 푸시: v1 필수 / 결제: v1 제외(전환율은 랜딩 가격테스트로 선검증) / 출시: Android 우선
