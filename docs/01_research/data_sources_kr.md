# 데이터 소스 카탈로그

> 서비스의 원료. 우선순위 순.

## Tier 1 — 제품 코어 (준실시간)
1. **DART OpenAPI** https://opendart.fss.or.kr
   - 임원·주요주주 소유상황보고 (5영업일 내) ← 킬러 데이터
   - 거래계획 사전공시 (30일 전) ← 차별화 데이터 ("예고된 매도" 알림)
   - 5% 대량보유보고, 자기주식 취득/처분/소각, 주요사항보고
   - 무료, 인증키 발급제. 정정공시 처리 필수.
2. **KRX 정보데이터시스템** http://data.krx.co.kr — 시세·종목 마스터 (공시와 조인용)

## Tier 2 — 콘텐츠 축 (연 1회 / 분기)
3. **국회공보 재산공개** (매년 3월) — 의원별 증권 보유 스냅샷. 정보공개센터 가공본 https://cfoi.or.kr/19170
4. **공직윤리시스템** https://www.peti.go.kr — 정부 고위공직자 재산공개 (장차관·청와대 등으로 확장 가능)
5. **국민연금 대량보유 공시** — DART 5%룰 보고로 포착 (국민연금은 5%+ 보유 다수) + 국민연금기금 운용 공시

## Tier 3 — 참고/벤치마크
6. 미국: Capitol Trades, QuiverQuant, Unusual Whales (유료 API) — 해외 확장 시
7. Autopilot 앱 자체 (UX 벤치마크): https://apps.apple.com/kr/app/autopilot-automated-investing/id1613625799
8. Autopilot 신뢰성 논란 스레드 (안티 벤치마크 — 체결 지연·슬리피지 불만): https://www.reddit.com/r/AutopilotApp/comments/1ox2xlh/autopilots_a_scam/
   → 교훈: 카피트레이딩의 핵심 클레임은 "체결 시점 차이". 우리는 정보 서비스라 이 리스크 자체가 없음을 포지셔닝에 활용.

## 수집 파이프라인 개요 (v1)
```
[cron 30min] → DART 최신공시 목록 API (공시유형 필터)
  → 신규 접수번호만 상세 조회 → 파싱/구조화 → DB upsert
  → 이벤트 룰 매칭 (관심종목/관심인물/대형거래) → FCM 푸시
  → 일배치: 집계 테이블 갱신 (순매수 랭킹, 주간 리포트)
```
