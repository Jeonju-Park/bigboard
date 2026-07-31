# figma_to_claude_code_guide.md — 피그마 디자인을 클로드 코드로 가져와 개발 시작하기

> 용도: 본 프로젝트 실행 + 추후 강의 자료. 비개발자(디자이너) 기준으로 작성.
> 검증일: 2026-07-30. 도구 UI·명령어는 변경될 수 있으므로 강의 전 재확인 권장.
> 공식 문서: Figma Help — "Claude Code and Figma: Set up the MCP server" https://help.figma.com/hc/en-us/articles/39888612464151 · Claude Code 문서 https://docs.claude.com/en/docs/claude-code/overview

---

## 0. 큰 그림 — 방법은 3가지, 우리는 A+C 조합

| 방법 | 무엇 | 장점 | 한계 |
|---|---|---|---|
| **A. Figma MCP 연결** ⭐ | 클로드 코드가 피그마 파일을 직접 읽음(선택 프레임의 구조·변수·오토레이아웃) | 구조 정보가 그대로 전달 — 가장 정확 | Dev Mode 가능한 유료 플랜 필요, 연결 셋업 1회 |
| B. 스크린샷 붙여넣기 | 화면 캡처를 프롬프트에 첨부 | 셋업 0 | 픽셀만 보고 추측 — 간격·변수 정보 소실 |
| **C. 토큰 문서 제공** | tokens/디자인 시스템 md를 컨텍스트로 | 값의 단일 진실 보장 | 레이아웃 정보는 없음 |

핵심 통찰: **A는 "구조"를, C는 "값"을 담당**한다. A만 쓰면 클로드가 피그마의 raw 값을 하드코딩할 수 있고, C만 쓰면 레이아웃을 추측한다. 둘을 같이 주고 "값은 반드시 토큰 파일 참조"라고 지시하는 것이 정석. B는 A가 안 될 때의 폴백 + 결과 비교 검수용.

## 1. 사전 준비 (1회)

1. **Claude Code 설치**: 공식 문서의 설치 안내를 따른다 → https://docs.claude.com/en/docs/claude-code/overview (npm 패키지: `@anthropic-ai/claude-code`)
2. **피그마 플랜 확인**: Dev Mode 사용 가능한 유료 플랜이어야 MCP 서버 이용 가능 (Figma Help 문서 기준)
3. 프로젝트 폴더(zip 압축 해제한 bigshot-radar/)에서 터미널 열기 → `claude` 실행해 동작 확인

## 2. Figma MCP 연결 (1회 셋업)

Figma 공식 권장 경로는 **Claude Code용 Figma 플러그인 설치**다 (MCP 서버 설정 + 자주 쓰는 작업용 Agent Skills 포함):

```
# 클로드 코드 안에서 (모든 프로젝트 적용)
claude plugin install figma@claude-plugins-official --scope user
```
그다음:
1. 클로드 코드 재시작 → `/mcp` 입력 → figma 선택 → 브라우저에서 Figma 계정 인증
2. "Authentication successful. Connected to figma" 확인
3. 일반적으로 **remote Figma MCP 서버** 사용이 권장됨 (로컬 데스크톱 앱 서버 방식도 존재)

> 출처: Figma Help https://help.figma.com/hc/en-us/articles/39888612464151 · 한국어 셋업 후기 https://velog.io/@dbqls200/Claude-Code%EC%97%90-Figma-MCP-%EC%84%9C%EB%B2%84-%EC%97%B0%EA%B2%B0-%EB%B0%A9%EB%B2%95 (2026-03) · https://huddling.ai/entry/31ffdea8-0034-8049-b1ca-c7f269af801d
> 실패 시: 조직이 플러그인 설치를 막았을 가능성 — 개인 계정으로 시도하거나 Figma Help의 수동 MCP 등록 경로 참조.

## 3. 사용 흐름 (매 작업)

```
[피그마] Dev Mode 켜고 → 구현할 프레임 선택 (예: S1-Home-Breaking)
   ↓
[클로드 코드] "지금 피그마에서 선택한 프레임을 구현해줘. 단, 색·간격·타이포 값은
              app/src/theme/tokens.ts 의 토큰만 사용하고, 피그마의 raw 값은 쓰지 마."
   ↓
[확인] 브라우저에서 결과 확인 ← 피그마 원본과 나란히 놓고 비교
   ↓
[수정] "카드 사이 간격이 피그마보다 좁아. space/3(12px)이어야 해" 처럼 토큰 언어로 피드백
```

핵심 습관 3가지 (강의 포인트):
1. **한 번에 한 프레임.** "전체 다 만들어줘"는 전부 어중간해짐. 화면 → 섹션 → 컴포넌트 순으로 쪼갠다.
2. **피드백은 토큰 언어로.** "좀 더 띄워줘"(주관) 대신 "space/6으로"(객관). 피그마 변수명 = 코드 토큰명이라 가능한 대화법 — figma_guide.md의 변수 등록이 여기서 회수된다.
3. **컴포넌트명 일치.** 피그마 `DisclosureCard` = 코드 `DisclosureCard.tsx`. "DisclosureCard의 buy variant처럼"이라고 말하면 클로드가 정확히 찾는다.

## 4. 프롬프트 패턴 모음 (강의용 치트시트)

```
# 신규 화면 구현
피그마에서 선택한 [프레임명]을 React 컴포넌트로 구현해줘.
- 값: theme/tokens.ts 토큰만 (raw hex/px 금지)
- 기존 shared/components 우선 재사용, 없는 것만 신규
- 목데이터는 mocks/에서 import
- 완료 후: 신규 파일 목록 + 브라우저 확인 방법 3줄

# 디자인 불일치 수정
[화면]의 [요소]가 피그마와 달라. 피그마 기준: [변수명/값]. 지금 코드가 어떤 값을 쓰는지 찾아서 고쳐줘.

# 컴포넌트 추출
지금 선택한 피그마 컴포넌트(변형 포함)를 shared/components/[이름].tsx로 만들어줘.
variants는 props로: [예: direction: 'buy'|'sell']

# 검수 요청 (스크린샷 폴백 활용)
[첨부: 피그마 캡처 + 브라우저 캡처] 두 이미지의 차이를 찾아서 표로 정리하고, 토큰 기준으로 수정해줘.
```

## 5. 자주 겪는 문제

| 증상 | 원인 | 해결 |
|---|---|---|
| 클로드가 프레임을 못 읽음 | Dev Mode 꺼짐 / 프레임 미선택 | 피그마에서 Dev Mode + 프레임 선택 상태 확인 후 재시도 |
| 결과가 피그마와 미묘하게 다름 | 오토레이아웃 미적용 프레임 | figma_guide.md §3 위반 — 피그마 쪽을 고치고 재요청 |
| raw 색상값이 코드에 박힘 | 프롬프트에 토큰 강제 누락 | "tokens.ts만 사용" 문구 매번 포함 + `grep '#'`로 검사 시키기 |
| 폰트가 다르게 보임 | 웹폰트 미로딩 | "Pretendard/IBM Plex Mono 웹폰트 로딩 추가해줘" |
| /mcp에 figma 없음 | 플러그인 설치 실패(조직 차단 등) | §2 실패 시 항목 참조, 최후엔 B(스크린샷) 폴백 |

## 6. 강의로 확장할 때의 구성 제안 [추정]
1부 이론(방법 A/B/C 비교, 왜 변수가 핸드오프의 전부인가) → 2부 라이브(간단한 카드 1개: 피그마 변수 등록 → MCP 연결 → 구현 → 토큰 언어 피드백) → 3부 실습(수강생 각자 컴포넌트 1개). 실패 사례(B만 썼을 때의 하드코딩 결과)를 비교 자료로 준비하면 설득력이 큼.
