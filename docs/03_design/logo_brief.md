# 빅보드 로고 — 아이디어 리스트 · 미드저니 프롬프트 · 필요 자산 명세

> 작성 2026-07-31 | 확정 컨텍스트: 서비스명 **빅보드(Big Board)** · 메인 **coral-500 #FF7355** · 글자색 **ink #17191C** · Display **Paperlogy 800**
> 상위 문서: `docs/03_design/bx_designsystem_source_bigshot_radar.md` · `docs/03_design/brand_principles.md`

---

## 0. 먼저 — 미드저니로 로고를 뽑을 때의 현실

미드저니는 **심볼(마크) 탐색용**으로 쓰고, 그 외는 쓰지 않는 게 맞다. 이유는 셋이다.

**① 벡터가 아니다.** 출력은 전부 래스터다. 벡터 트레이싱을 거쳐야 하고, 그 과정에서 미드저니가 만든 미묘한 비대칭·불균등 곡률이 그대로 딸려온다. 실무에서는 **트레이싱 결과를 참고만 하고 벡터로 재작도**하는 편이 결과가 훨씬 낫다.

**② 한글을 못 쓴다.** "빅보드"를 프롬프트에 넣으면 한글 비슷한 낙서가 나온다. **워드마크는 미드저니로 만들지 말고 Paperlogy 800으로 조판한 뒤 아웃라인 변환**하면 된다. 이미 `assets/brand/logo/draft/wordmark-ko.svg`에 아웃라인 변환본이 있으니 그대로 쓰시면 된다.

**③ 결과물의 권리 상태가 애매하다.** 문화체육관광부·한국저작권위원회는 **인간의 창작적 개입이 없는 AI 산출물은 저작권 등록 대상이 아니라는 원칙**을 유지하고 있다 ([생성형 AI 저작권 안내서 — 한국저작권위원회](https://www.copyright.or.kr/information-materials/publication/research-report/view.do?brdctsno=52591), [생성형 인공지능 활용 저작물의 저작권 등록 안내서](https://www.copyright.or.kr/information-materials/publication/research-report/view.do?brdctsno=54253)). 다만 **상표권은 저작권과 별개 제도**라 AI로 만든 도형이라도 상표 출원·등록 자체는 가능하다 [추정 — 변리사 확인 필요]. 실무적으로는 **미드저니 결과를 시안으로만 쓰고 최종 벡터를 직접 작도**하면 그 작도 과정이 인간의 창작적 개입이 되므로 권리 상태가 깔끔해진다. 이 방식을 권한다.

### 공통 프롬프트 규칙

현재 기본 모델은 **V8.2**(2026-07-24부터)이고, `--raw`가 V8 계열의 최소 해석 플래그다(V7은 `--style raw`) ([Midjourney 8.x 가이드](https://blakecrosley.com/guides/midjourney)).

아래 프롬프트는 전부 이 뼈대를 공유한다.

```
[모티브 설명], flat vector logo mark, geometric, two flat colors only:
coral orange and near-black, solid fills, thick rounded shapes, bold
silhouette, high contrast, centered, plain white background, app icon
style, minimal, legible at 32 pixels
--ar 1:1 --raw --s 50 --chaos 8
--no text, letters, typography, words, korean, gradient, shadow, glow, 3d,
bevel, emboss, photo, realistic, mockup, drop shadow, outline stroke,
watermark, frame, multiple variations, grid
--v 8.2
```

**운용 팁 네 가지.**

`--s 50` 정도로 낮게 잡아야 미드저니의 장식 습관이 억제된다. 300 이상이면 그라데이션과 광택이 다시 붙는다.

마음에 드는 결과가 하나 나오면 그 이미지 URL을 `--sref [URL] --sw 100`으로 붙여 나머지 아이디어를 뽑으면 **12개 시안의 조형 언어가 통일**된다. 이게 이번 작업에서 가장 유용한 기능이다.

색상 HEX는 프롬프트에 넣어도 정확히 나오지 않는다. **색은 무시하고 형태만 보고 고른 뒤, 벡터 작도 단계에서 #FF7355 / #17191C를 직접 넣으면 된다.**

4장 그리드에서 하나 고른 뒤 Vary(Subtle)를 1~2회 돌려 정제한다. Upscale은 트레이싱 정확도에 도움이 되지만, 어차피 재작도할 거면 생략해도 된다.

---

## 1. 로고 아이디어 12안

각 안은 **모티브 논리 / 축소 내성 예상 / 리스크 / 프롬프트** 순서다. 모티브 논리는 "왜 이 서비스에 이 도형인가"를 방어하는 문장이므로, 나중에 이해관계자에게 설명할 때 그대로 쓰시면 된다.

---

### 01. 집계 바 전광판 (Tally Board)

**모티브 논리** 개표방송 전광판에서 길이가 갈리는 집계 바. 서비스명(Board)과 시그니처 화면(S7 보드)이 한 도형 안에 들어간다. 가장 직역에 가까운 안.
**축소 내성** 상 — 가로 막대는 16px에서도 형태가 뭉개지지 않는다.
**리스크** 막대 3개 아이콘은 차트·필터·메뉴 아이콘으로 널리 쓰여 **고유성이 낮다.** 바의 비율과 라운드를 고정 규격으로 엄격히 지켜야 브랜드 자산이 된다.

```
a rounded rectangle board containing three horizontal bars of decreasing
length, like an election tally board, flat vector logo mark, geometric,
two flat colors only: coral orange and near-black, solid fills, thick
rounded shapes, bold silhouette, high contrast, centered, plain white
background, app icon style, minimal, legible at 32 pixels
--ar 1:1 --raw --s 50 --chaos 8 --no text, letters, typography, words, korean, gradient, shadow, glow, 3d, bevel, emboss, photo, realistic, mockup, drop shadow, outline stroke, watermark, frame, grid --v 8.2
```

---

### 02. 스플릿플랩 (Split-flap)

**모티브 논리** 공항·기차역 안내판이 딸깍 넘어가는 그 순간. **"방금 바뀌었다"는 속보성**을 정지 이미지로 표현할 수 있는 거의 유일한 형태다. 브랜드 톤 키워드 brisk(경쾌한 속보감)와 정확히 맞고, 개표방송 전광판의 물리적 조상이기도 하다.
**축소 내성** 상 — 가로 분할선 하나가 핵심이라 아주 작아져도 살아남는다.
**리스크** 아는 사람은 즉시 알아보지만, 스플릿플랩을 본 적 없는 세대에게는 그냥 "반으로 나뉜 사각형"이다. 모션(앱 스플래시·티커)과 세트로 쓸 때 위력이 나온다.

```
a single split-flap display tile mid-flip, horizontal split line across a
rounded square, top half tilting forward, departure board flap, flat
vector logo mark, geometric, two flat colors only: coral orange and
near-black, solid fills, thick rounded shapes, bold silhouette, high
contrast, centered, plain white background, app icon style, minimal,
legible at 32 pixels
--ar 1:1 --raw --s 50 --chaos 8 --no text, letters, typography, words, korean, gradient, shadow, glow, 3d, bevel, emboss, photo, realistic, mockup, drop shadow, outline stroke, watermark, frame, grid --v 8.2
```

---

### 03. 시상대 (Podium)

**모티브 논리** 1·2·3위 계단. 랭킹이 이 서비스의 코어이고, 개표방송의 결말도 순위다. **높이 차이만으로 서열이 읽히는** 가장 직관적인 도형.
**축소 내성** 상 — 계단 실루엣은 16px에서도 유지된다.
**리스크** 스포츠·게임 리더보드 아이콘과 겹친다. 그리고 "1등 종목"을 가리키는 것처럼 보이면 **추천 뉘앙스로 오독될 여지**가 있다 — 법적 포지션(A레벨)과 충돌할 수 있으니 카피에서 상쇄해야 한다.

```
three stepped blocks of different heights forming a podium, ranking
staircase, flat vector logo mark, geometric, two flat colors only: coral
orange and near-black, solid fills, thick rounded shapes, bold
silhouette, high contrast, centered, plain white background, app icon
style, minimal, legible at 32 pixels
--ar 1:1 --raw --s 50 --chaos 8 --no text, letters, typography, words, korean, gradient, shadow, glow, 3d, bevel, emboss, photo, realistic, mockup, drop shadow, outline stroke, watermark, frame, grid, human figure, trophy, medal --v 8.2
```

---

### 04. 레이더 스코프 블립

**모티브 논리** 훑는 빔과 포착된 점. 원판=판, 빔=관측 행위, 블립=포착된 거래 한 건. 서비스가 하는 일을 그대로 도형으로 옮긴 안.
**축소 내성** 중 — 빔이 얇아 16px에서 점 두 개로 뭉친다. 파비콘용 광각 변형이 따로 필요하다.
**리스크** **파이 차트로 읽힌다.** 빔 각도를 60° 이하로 좁혀도 수익률 차트 연상이 완전히 사라지지 않는다. 이 서비스는 수익률을 다루지 않으므로 오독 소지가 실질적이다.

```
a radar scope circle with one narrow sweep beam and a single small blip
dot, sonar detection, flat vector logo mark, geometric, two flat colors
only: coral orange and near-black, solid fills, thick rounded shapes,
bold silhouette, high contrast, centered, plain white background, app
icon style, minimal, legible at 32 pixels
--ar 1:1 --raw --s 50 --chaos 8 --no text, letters, typography, words, korean, gradient, shadow, glow, 3d, bevel, emboss, photo, realistic, mockup, drop shadow, outline stroke, watermark, frame, grid, pie chart, donut chart --v 8.2
```

---

### 05. 도장 (印)

**모티브 논리** 공시는 법적 신고 행위이고, 한국에서 신고의 시각적 표상은 도장이다. **"찍혔다 = 공식 기록으로 남았다"**는 이 서비스의 데이터 성격(사실, 조언 아님)을 정확히 대변한다. 한국적이면서 금융권에서 거의 안 쓰인다.
**축소 내성** 상 — 사각 테두리 + 내부 획은 아주 작아져도 인식된다.
**리스크** 관공서·법무 서비스로 오인될 수 있다. 그리고 도장은 "승인"의 뉘앙스가 있어 **서비스가 거래를 승인·보증한다는 오해**를 부를 여지가 있다.

```
a square seal stamp with rounded corners, traditional east asian chop
mark, thick outer frame with simple geometric strokes inside, flat vector
logo mark, geometric, two flat colors only: coral orange and near-black,
solid fills, thick rounded shapes, bold silhouette, high contrast,
centered, plain white background, app icon style, minimal, legible at 32
pixels
--ar 1:1 --raw --s 50 --chaos 8 --no text, letters, typography, words, korean, chinese characters, hanzi, gradient, shadow, glow, 3d, bevel, emboss, photo, realistic, mockup, drop shadow, outline stroke, watermark, frame, grid, ink splatter, texture --v 8.2
```

---

### 06. 티커 테이프 띠

**모티브 논리** 화면 하단을 흐르는 자막 띠. bx 문서 §5가 지정한 **유일한 상시 움직이는 요소**가 티커 바이므로, 시그니처 컴포넌트를 그대로 로고화하는 안이다.
**축소 내성** 중 — 가로로 긴 형태라 정사각 앱 아이콘에 넣으면 위아래 여백이 크게 남는다.
**리스크** 티커 존치 여부가 **오픈이슈 O1(제거 권고)** 상태다. 로고를 티커로 잡으면 O1이 자동으로 "존치"로 묶인다. 이 결정을 먼저 하고 진입해야 한다.

```
a horizontal ribbon strip with a subtle wave, scrolling news ticker band,
flat vector logo mark, geometric, two flat colors only: coral orange and
near-black, solid fills, thick rounded shapes, bold silhouette, high
contrast, centered, plain white background, app icon style, minimal,
legible at 32 pixels
--ar 1:1 --raw --s 50 --chaos 8 --no text, letters, typography, words, korean, gradient, shadow, glow, 3d, bevel, emboss, photo, realistic, mockup, drop shadow, outline stroke, watermark, frame, grid --v 8.2
```

---

### 07. 큰손 (Big Hand)

**모티브 논리** 이름의 다른 반쪽. 판(board)만 있고 큰손(big)이 없는 게 다른 안들의 공백인데, 이 안은 **손이 판을 받치거나 손가락이 바를 밀어 올리는** 형태로 둘을 합친다.
**축소 내성** 중 — 손은 형태 정보가 많아 축소에 약하다. 손가락 개수를 줄인 극단적 단순화가 필요하다.
**리스크** 손 아이콘은 "터치·클릭·기부·투표"로 널리 쓰여 **의미가 흐려진다.** 그리고 위로 향한 손은 상승 뉘앙스라 등락 오독 소지가 있다.

```
a simplified geometric hand silhouette supporting a rectangular board
from below, minimal palm shape, flat vector logo mark, geometric, two
flat colors only: coral orange and near-black, solid fills, thick rounded
shapes, bold silhouette, high contrast, centered, plain white background,
app icon style, minimal, legible at 32 pixels
--ar 1:1 --raw --s 50 --chaos 8 --no text, letters, typography, words, korean, gradient, shadow, glow, 3d, bevel, emboss, photo, realistic, mockup, drop shadow, outline stroke, watermark, frame, grid, fingers detail, skin, realistic anatomy --v 8.2
```

---

### 08. 세븐 세그먼트 숫자

**모티브 논리** 전광판·스코어보드의 숫자 표시 방식. **숫자가 이 서비스의 전부**라는 선언이고, Numeric 서체(IBM Plex Mono)의 스코어보드 감성과도 이어진다. 특정 숫자가 아니라 세그먼트 자체를 도형화하면 추상 마크가 된다.
**축소 내성** 상 — 굵은 직선 세그먼트라 축소에 매우 강하다.
**리스크** 레트로 디지털 감성이 강해 **"경쾌한 속보감"보다 "80년대 계산기"로 읽힐** 수 있다. 그리고 세그먼트 아이콘은 전자기기·타이머 서비스에서 흔하다.

```
abstract seven-segment digital display shape, thick angular segment bars
arranged like a scoreboard digit, flat vector logo mark, geometric, two
flat colors only: coral orange and near-black, solid fills, bold
silhouette, high contrast, centered, plain white background, app icon
style, minimal, legible at 32 pixels
--ar 1:1 --raw --s 50 --chaos 8 --no text, letters, typography, words, numbers, digits, korean, gradient, shadow, glow, 3d, bevel, emboss, photo, realistic, mockup, drop shadow, outline stroke, watermark, frame, grid --v 8.2
```

---

### 09. 중계 안테나 (Broadcast)

**모티브 논리** 전파를 쏘는 탑. "중계한다"는 브랜드 스테이트먼트의 핵심 동사를 그대로 도형화한다. 방송국 은유의 가장 직접적인 표현.
**축소 내성** 중상 — 삼각 탑 + 호(arc) 2개 구조는 32px까지 유지되나 16px에서 호가 사라진다.
**리스크** **와이파이·통신사·팟캐스트 아이콘과 정면 충돌**한다. 금융 서비스로 읽히지 않는 게 가장 큰 문제.

```
a broadcast tower emitting two concentric signal arcs, transmission mast,
flat vector logo mark, geometric, two flat colors only: coral orange and
near-black, solid fills, thick rounded shapes, bold silhouette, high
contrast, centered, plain white background, app icon style, minimal,
legible at 32 pixels
--ar 1:1 --raw --s 50 --chaos 8 --no text, letters, typography, words, korean, gradient, shadow, glow, 3d, bevel, emboss, photo, realistic, mockup, drop shadow, outline stroke, watermark, frame, grid, wifi icon --v 8.2
```

---

### 10. 셔터가 열리는 판 (Disclosure)

**모티브 논리** 공시(公示)의 문자 그대로의 뜻 — **가려져 있던 것이 공개되는 순간**. 닫힌 판의 일부가 열리며 안쪽이 드러나는 형태다. 정보 서비스의 본질을 은유하면서 조언 뉘앙스가 전혀 없다는 게 법적으로 안전하다.
**축소 내성** 중상 — 열린 틈의 폭을 충분히 확보하면 32px까지 간다.
**리스크** 추상적이라 **설명 없이는 안 읽힌다.** 브랜드 인지가 쌓이기 전 초기에는 그냥 도형이다.

```
a rounded square panel with a horizontal slit opening, one section
sliding away to reveal an inner shape, shutter opening, reveal, flat
vector logo mark, geometric, two flat colors only: coral orange and
near-black, solid fills, thick rounded shapes, bold silhouette, high
contrast, centered, plain white background, app icon style, minimal,
legible at 32 pixels
--ar 1:1 --raw --s 50 --chaos 8 --no text, letters, typography, words, korean, gradient, shadow, glow, 3d, bevel, emboss, photo, realistic, mockup, drop shadow, outline stroke, watermark, frame, grid, door, window frame --v 8.2
```

---

### 11. 체크 + 바 결합

**모티브 논리** 개표의 두 동작 — **표시하고(체크) 쌓는다(바)**. 체크의 긴 획이 그대로 집계 바로 변하는 형태. 두 은유가 한 획으로 연결되는 게 조형적으로 우아하다.
**축소 내성** 상 — 굵은 획 하나라 매우 강하다.
**리스크** 체크 마크는 **"승인·완료·정답"의 관용 기호**다. 서비스가 거래를 검증했다는 오해를 부를 수 있고, 이건 도장(05)과 같은 성격의 법적 리스크다.

```
a thick check mark whose long stroke transforms into a horizontal bar,
tally mark merging into a chart bar, single continuous shape, flat vector
logo mark, geometric, two flat colors only: coral orange and near-black,
solid fills, thick rounded shapes, bold silhouette, high contrast,
centered, plain white background, app icon style, minimal, legible at 32
pixels
--ar 1:1 --raw --s 50 --chaos 8 --no text, letters, typography, words, korean, gradient, shadow, glow, 3d, bevel, emboss, photo, realistic, mockup, drop shadow, outline stroke, watermark, frame, grid --v 8.2
```

---

### 12. 판 위의 "빅" (Wordmark Mark)

**모티브 논리** 판(coral 면) + 글자(ink)라는 구조가 곧 Big Board. Paperlogy 800의 각진 자소가 방송 자막의 존재감을 그대로 가져온다. **미드저니가 필요 없는 유일한 안** — Paperlogy로 조판하면 끝난다.
**축소 내성** 최상 — 한글 자소가 굵고 직선적이라 16px에서도 형태가 유지된다.
**리스크** 도형 심볼이 없어 **영문권·비한글 맥락에서 작동하지 않는다.** 지금은 국내 전용이라 문제없지만 확장 시 별도 심볼이 필요해진다.

```
미드저니 불필요. assets/brand/logo/draft/c-symbol.svg가 이 안의 구현체다.
변형이 필요하면 판의 라운드 반경(현재 16/64)과 글자 크기(현재 30/64)만 조정하면 된다.
```

---

## 2. 아이디어 우선순위 제안

전부 뽑아보실 필요는 없다. **고유성 × 법적 안전성 × 축소 내성**으로 보면 이 순서다.

| 순위 | 안 | 근거 |
|---|---|---|
| 1 | **02 스플릿플랩** | 속보성을 정지 이미지로 표현하는 유일한 형태. 금융권에서 안 쓰임. 법적 뉘앙스 중립 |
| 2 | **10 셔터 (공시)** | 공시의 문자적 의미와 정확히 일치. 조언 뉘앙스 0 |
| 3 | **12 판 위의 빅** | 축소 내성 최상. 이미 구현되어 있음 |
| 4 | **01 집계 바** | 안전하지만 고유성 낮음. 백업 |
| 5 | **08 세븐 세그먼트** | 조형은 강하나 톤이 레트로로 기울 위험 |

**법적으로 주의가 필요한 안**은 03(시상대), 05(도장), 11(체크)이다. 셋 다 "이 서비스가 종목을 고르거나 승인한다"는 인상을 줄 수 있어, `feasibility_legal_kr.md` §2의 A레벨 경계와 충돌할 여지가 있다. 채택하려면 카피와 고지문으로 상쇄해야 한다.

---

## 3. 필요한 로고 자산 전체 목록

### A. 마스터 벡터 (SVG) — 직접 만드시는 것

| # | 파일명 | 규격 | 용도 |
|---|---|---|---|
| 1 | `symbol.svg` | 정사각 viewBox `0 0 64 64` | 심볼 단독. 모든 파생물의 원본 |
| 2 | `symbol-mono-ink.svg` | 동일 | ink 1도. 팩스·모노 인쇄·워터마크 |
| 3 | `symbol-mono-white.svg` | 동일 | 흰색 1도. coral·사진 위 역상 |
| 4 | `lockup-h.svg` | 가로형 | 심볼 + 국문 워드마크 (기본 락업) |
| 5 | `lockup-v.svg` | 세로형 | 심볼 위 / 워드마크 아래. 정사각 슬롯용 |
| 6 | `lockup-h-en.svg` | 가로형 | 심볼 + Big Board (영문) |
| 7 | `lockup-h-mono.svg` | 가로형 | 락업 ink 1도 |
| 8 | `wordmark-ko.svg` | — | **이미 있음** (Paperlogy 800 아웃라인) |
| 9 | `wordmark-en.svg` | — | **이미 있음** |

락업 4·5·6·7은 심볼만 주시면 **제가 워드마크와 조합해서 만들어 드릴 수 있다.** 정렬·간격·클리어스페이스를 규격대로 잡아야 하는 작업이라 자동화가 낫다.

### B. 파비콘·앱 아이콘 — 심볼 주시면 제가 스크립트로 생성

| 파일 | 크기 | 비고 |
|---|---|---|
| `favicon.svg` | 벡터 | 최신 브라우저 우선 |
| `favicon.ico` | 16·32·48 멀티 | 레거시 |
| `favicon-32.png` / `favicon-16.png` | — | 폴백 |
| `apple-touch-icon-180.png` | 180×180 | iOS 홈 화면. **투명 배경 금지**(검게 나옴) |
| `icon-192.png` / `icon-512.png` | — | PWA manifest `purpose: any` |
| `icon-512-maskable.png` | 512×512 | **세이프존 준수** — 중앙 원 직경 80%(반경 40%) 안에 핵심 형태 |

### C. 스토어·소셜 — M2 단계지만 규격만 미리

| 파일 | 크기 | 비고 |
|---|---|---|
| `og-image.png` | 1200×630 | 링크 공유 미리보기 |
| `appstore-1024.png` | 1024×1024 | **알파 채널 없음**, 라운드 코너 넣지 말 것(iOS가 마스킹) |
| `playstore-512.png` | 512×512 | 32bit PNG |
| `play-feature-1024x500.png` | 1024×500 | 플레이스토어 피처 그래픽 |
| `profile-400.png` | 400×400 | SNS 프로필. **원형 크롭 안전영역** 고려 |
| `splash.svg` | — | 앱 스플래시 |

### D. 규정 (파일이 아니라 문서로 확정할 것 — STEP 7)

클리어스페이스는 **심볼 높이의 1/2**. 최소 사용 크기는 심볼 단독 16px / 락업 높이 24px. 금지 사용례 3개(임의 색 변경, 비율 왜곡, 그림자·테두리 추가)를 예시 이미지와 함께 `bx_brand_final.md`에 넣는다.

---

## 4. SVG를 저에게 주실 때 지켜주실 규격

이 규격만 맞으면 **파비콘 전 세트 생성 → 32px 실크기 렌더 검수 → 락업 조합까지 스크립트로 한 번에** 처리할 수 있다.

**필수**

`viewBox="0 0 64 64"` 정사각으로 맞춰주시고, 도형이 그 안에서 시각적 중심에 오도록 배치해 주시면 된다. 클리어스페이스는 파일에 포함하지 말 것 — 별도 규정으로 관리한다.

색은 리터럴 HEX로 **`#FF7355`와 `#17191C` 두 개만** 쓴다. `currentColor`나 CSS 변수는 쓰지 말 것. 파비콘 변환 스크립트가 색을 치환해야 해서 리터럴이어야 한다.

**`stroke` 대신 `fill`만 쓴다.** stroke는 축소·확대 시 두께 비율이 깨진다. 일러스트레이터라면 Object → Path → Outline Stroke를, 피그마라면 Outline Stroke를 한 번 돌려주시면 된다.

텍스트가 들어간다면 **반드시 아웃라인 변환**(Create Outlines). `<text>` 요소가 남아 있으면 폰트 없는 환경에서 깨진다.

**권장**

겹치는 패스는 Boolean으로 병합해 주시면 좋다. 중복 패스가 남아 있으면 파비콘 축소 시 안티에일리어싱 경계에 실선이 보인다.

불필요한 `<g>`와 `transform`은 정리해 주시면 좋다. 필요하면 제가 SVGO로 최적화하되 `viewBox`는 보존한다.

`fill-rule`이 필요한 형태(구멍 뚫린 도형)라면 `fill-rule="evenodd"`를 명시해 주시면 된다.

**주시면 좋은 것**

미드저니 원본 이미지도 같이 주시면 벡터 재작도가 원안에서 얼마나 벗어났는지 대조할 수 있다. 그리고 어느 아이디어 번호에서 나온 것인지 알려주시면 모티브 논리를 `bx_brand_final.md`에 그대로 옮겨 적을 수 있다.

---

## 5. 이후 진행

심볼 SVG를 주시면 STEP 6(파비콘·앱 아이콘 전 세트 + head·manifest 스니펫 + 32px 식별성 검수)과 STEP 7(브랜드 최종 문서·bx §9 갱신·decisions_log·커밋)을 이어서 진행한다.

기존에 만든 `assets/brand/logo/draft/` 3안은 삭제하지 말고 `draft/` 아래 그대로 두는 걸 권한다 — 나중에 "왜 이 로고인가"를 설명할 때 탈락안이 근거가 된다.
