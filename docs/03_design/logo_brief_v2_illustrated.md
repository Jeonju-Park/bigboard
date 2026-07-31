# 빅보드 로고 v2 — 일러스트 방향

> 2026-07-31 | v1(아이콘 계열 12안)을 대체한다. v1의 §3 자산 목록과 §4 SVG 규격은 유효하며, 이 문서에서 그라데이션·2단 체계 부분만 덧붙인다.
> 확정: **빅보드(Big Board)** · coral-500 **#FF7355** · ink **#17191C** · Paperlogy 800

---

## 0. 먼저 — 디자인 시스템 규칙을 고쳐야 한다

`bx_designsystem_source_bigshot_radar.md` §2와 §8이 **그라데이션·글로우를 명시적으로 금지**하고 있다. 일러스트 방향으로 가면 이 조항을 개정해야 하고, 개정하지 않으면 나중에 클로드 코드가 산출물을 검수 게이트에서 되돌린다.

### 왜 금지했었나

원래 금지의 근거는 "AI가 만든 것처럼 보이는 화면"을 피하기 위해서였다. 실제로 AI 기본값 미학의 정체는 **보라-인디고 그라데이션, 다크 위 네온, 글래스모피즘, 카드 글로우** 이 네 가지 조합이지 그라데이션 자체가 아니다. 따뜻한 코랄-앰버 2스톱 그라데이션은 그 미학과 무관하다.

### 개정안 — §8 이 문구로 교체

**허용으로 바뀌는 것**은 브랜드 색상환 안의 **웜 2스톱 그라데이션**이며, 적용 범위는 **로고·랜딩 히어로·스플래시·OG 이미지·스토어 그래픽 5곳으로 한정**한다. 앱 UI 내부(카드, 버튼, 바, 칩, 배경 면)에는 여전히 쓰지 않는다 — 데이터 화면이 흐려지면 "숫자는 정색" 원칙이 무너진다.

**금지로 유지되는 것**은 다음과 같다. 보라·인디고 계열 일체와 그 그라데이션, 3스톱 이상 다색·무지개 그라데이션, 다크 배경 위 네온, 글래스모피즘, 카드 글로우, 드롭섀도, 3D 렌더·베벨·엠보스, 광택 하이라이트.

**일러스트에 새로 붙는 가드 4개** — AI 생성물 특유의 인상을 피하기 위한 조항이다. 에어브러시로 문지른 듯한 매끈한 음영을 쓰지 않고 면으로 끊는다. 좌우 완전 대칭의 만다라형 구성을 피한다. 그림자를 깐 아이소메트릭 3D를 쓰지 않는다. 질감이 필요하면 리소그래프 그레인처럼 **인쇄 공정에서 유래한 노이즈**를 쓰고 소프트 블러를 쓰지 않는다.

---

## 1. 그라데이션 스펙

색차를 계산해 끝점을 골랐다. 기준은 **dE 20~45** — 20 미만이면 그라데이션이 안 보이고, 45를 넘으면 두 색으로 분리돼 보인다.

| 토큰 | 스톱 | dE 기준색 | dE 매수레드 | dE 개혁신당 | dE 정의노랑 | 판정 |
|---|---|---|---|---|---|---|
| **`grad-sunset`** | #FF7355 → **#FFB964** | 39.0 | 55.6 | 40.5 | 38.7 | **권장** — 전 항목 안전 |
| `grad-tight` | #FF7355 → #FF9F50 | 27.0 | 43.6 | 27.2 | 45.9 | 대안 — 변화폭이 작아 차분 |
| ~~핑크 방향~~ | #FF7355 → #FF5E71 | 22.6 | **18.9** | 48.8 | 93.5 | 금지 — 매수 레드와 충돌 |
| ~~버밀리언 방향~~ | #FF7355 → #FF480C | 29.8 | 31.3 | **18.6** | 77.8 | 금지 — 개혁신당 주황과 충돌 |

```css
--grad-sunset: linear-gradient(135deg, #FF7355 0%, #FFB964 100%);
--grad-flat-fallback: #FF7355;   /* 그라데이션 불가 매체 대체값 */
```

**운용 규칙 세 가지.** 스톱은 **2개만** 쓴다. 각도는 135°(좌상→우하)로 고정한다 — 각도가 자산마다 다르면 브랜드가 흔들린다. 그라데이션 위 텍스트는 **ink만** 허용하며, 대비는 어두운 끝점(#FF7355, 6.57:1)을 기준으로 검증한다.

**단색 대체가 반드시 필요한 곳**은 파비콘, 앱 아이콘 32px 이하, 워터마크, 모노 인쇄, 팩스다. 이건 다음 섹션의 2단 체계로 해결한다.

---

## 2. 2단 체계 — 이것부터 정하고 그림을 그려야 한다

일러스트 로고의 실패는 거의 항상 **작은 크기에서** 일어난다. 처음부터 두 벌을 한 세트로 설계하면 그 문제가 사라진다.

| | **Primary (일러스트)** | **Reduced (단색 축약)** |
|---|---|---|
| 형태 | 장면·서사가 있는 일러스트 | 실루엣 1개로 압축 |
| 색 | grad-sunset + ink | coral-500 단색 또는 ink 1도 |
| 최소 크기 | 64px 이상 | 16px까지 |
| 쓰는 곳 | 랜딩 히어로, OG 이미지, 스플래시, 스토어 그래픽, 굿즈, 프레젠테이션 | 앱바, 파비콘, 앱 아이콘, 탭바, 워터마크, 이메일 서명 |
| 파일 | `logo-primary.svg` | `symbol-reduced.svg` |

**축약 규칙** — Primary에서 **가장 특징적인 실루엣 하나만** 남긴다. 예를 들어 "지평선 위로 떠오르는 판"이면 Reduced는 "반원 위의 사각" 하나다. 아래 각 아이디어마다 축약형을 미리 적어뒀으니, 미드저니로 Primary를 뽑을 때 **그 실루엣이 살아 있는 컷**을 고르시면 된다.

---

## 3. 일러스트 아이디어 10안

공통 프롬프트 뼈대다. 각 안의 프롬프트는 앞부분만 다르다.

```
[모티브], editorial vector illustration, geometric flat shapes, warm coral
to amber gradient, near-black ink for details, subtle risograph grain,
mid-century poster art, bold simplified forms, strong silhouette, clean
composition, plain off-white background
--ar 1:1 --raw --s 120 --chaos 12
--no 3d render, glossy, bevel, emboss, drop shadow, glass, neon, purple,
blue, rainbow, airbrush, soft blur, photorealistic, text, letters,
typography, words, korean, watermark, frame, grid, multiple panels
--v 8.2
```

`--s`를 v1의 50에서 **120으로 올린 것**이 핵심이다. 일러스트는 미드저니의 조형 해석이 필요하다. 다만 300을 넘기면 다시 광택과 3D가 붙는다.

---

### 01. 선셋 보드 — 지평선 위로 떠오르는 판

**모티브 논리** 개장·개표가 시작되는 순간. 지평선 위로 판이 떠오른다. **그라데이션이 장식이 아니라 필연**인 유일한 안이다 — 해가 뜨는 하늘이니까. 매일 새 공시가 올라온다는 서비스 리듬과도 맞는다.
**축약형** 반원(지평선) 위에 사각 하나. 16px에서 완전히 성립한다.
**리스크** 선라이즈 은유는 스타트업 로고에서 흔하다. 판(사각)의 존재감이 약하면 그냥 일출 아이콘이 된다.

```
a rectangular board rising over a horizon line like a sunrise, editorial
vector illustration, geometric flat shapes, warm coral to amber gradient,
near-black ink for details, subtle risograph grain, mid-century poster
art, bold simplified forms, strong silhouette, clean composition, plain
off-white background --ar 1:1 --raw --s 120 --chaos 12 --no 3d render, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, text, letters, typography, words, korean, watermark, frame, grid, sun rays, lens flare --v 8.2
```

---

### 02. 스카이라인 집계 바

**모티브 논리** 도시 빌딩 실루엣이 그대로 랭킹 바가 된다. **내부자들이 사는 곳이 곧 순위표**라는 이중 읽기. 서울 스카이라인이면 국내 서비스임도 함께 말한다.
**축약형** 높이가 다른 사각 3~4개의 상단 실루엣. 이미 검증된 형태(v1의 01안)라 축소 안전.
**리스크** 도시 스카이라인 로고는 부동산·건설·금융에서 포화 상태다. 빌딩을 얼마나 추상화하느냐가 관건.

```
a city skyline where the buildings read as ranking bars of different
heights, seoul silhouette, editorial vector illustration, geometric flat
shapes, warm coral to amber gradient, near-black ink for details, subtle
risograph grain, mid-century poster art, bold simplified forms, strong
silhouette, clean composition, plain off-white background --ar 1:1 --raw --s 120 --chaos 12 --no 3d render, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, text, letters, typography, words, korean, watermark, frame, grid, windows detail, people --v 8.2
```

---

### 03. 스플릿플랩이 넘어가는 순간

**모티브 논리** v1에서 1순위였던 안의 일러스트 버전. 여러 칸이 동시에 딸깍 넘어가며 **잔상이 남는** 장면으로 그리면 "방금 갱신됐다"는 속보성이 정지 이미지에 담긴다. 그라데이션은 넘어가는 판의 회전면에 쓰면 자연스럽다.
**축약형** 가로 분할선이 있는 사각 하나.
**리스크** 회전면을 그리는 순간 3D로 미끄러지기 쉽다. 프롬프트에서 3D를 강하게 배제하고, **면을 꺾어서 표현**하도록 유도해야 한다.

```
a row of split-flap display tiles mid-flip with motion trails, departure
board flapping, side panels folding, editorial vector illustration,
geometric flat shapes, warm coral to amber gradient, near-black ink for
details, subtle risograph grain, mid-century poster art, bold simplified
forms, strong silhouette, clean composition, plain off-white background --ar 1:1 --raw --s 120 --chaos 12 --no 3d render, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, text, letters, typography, words, korean, watermark, frame, grid, perspective, isometric --v 8.2
```

---

### 04. 캐스터 배지

**모티브 논리** 브랜드 페르소나("농담은 하지만 숫자는 안 틀리는 개표방송 캐스터")를 그대로 그린다. 마이크를 든 실루엣과 뒤의 전광판. **브랜드 원칙 문서와 로고가 같은 인물을 가리키는** 유일한 안이다.
**축약형** 마이크 실루엣 하나, 또는 인물 머리+어깨 실루엣.
**리스크** 인물이 들어가면 **성별·연령이 읽히고**, 그 순간 배제되는 사용자가 생긴다. 그리고 마이크 아이콘은 팟캐스트·음성 서비스와 충돌한다. 실루엣을 성별 중립으로 추상화하는 게 필수다.

```
a genderless anchor silhouette holding a microphone in front of a large
tally board, election night broadcast studio, editorial vector
illustration, geometric flat shapes, warm coral to amber gradient,
near-black ink for details, subtle risograph grain, mid-century poster
art, bold simplified forms, strong silhouette, clean composition, plain
off-white background --ar 1:1 --raw --s 120 --chaos 12 --no 3d render, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, text, letters, typography, words, korean, watermark, frame, grid, facial features, realistic face, suit details --v 8.2
```

---

### 05. 서치라이트가 판을 훑는다

**모티브 논리** 어둠 속에서 빛줄기가 판의 일부를 비춘다. 레이더의 은유를 **빛으로 옮긴 것**이라 "관측·포착"이 그대로 읽히면서 파이 차트 오독이 사라진다. 빛줄기가 그라데이션의 자연스러운 자리다.
**축약형** 사다리꼴 빛줄기 + 사각. 단순해서 축소 안전.
**리스크** 서치라이트는 감시·수사 뉘앙스가 있다. "내부자를 감시한다"로 읽히면 서비스 톤(unbothered, 호들갑 없음)과 어긋난다.

```
a beam of light sweeping across a rectangular board, searchlight cone
revealing part of a panel, editorial vector illustration, geometric flat
shapes, warm coral to amber gradient, near-black ink for details, subtle
risograph grain, mid-century poster art, bold simplified forms, strong
silhouette, clean composition, plain off-white background --ar 1:1 --raw --s 120 --chaos 12 --no 3d render, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, text, letters, typography, words, korean, watermark, frame, grid, volumetric light, god rays, prison, police --v 8.2
```

---

### 06. 오리가미 공시

**모티브 논리** 접힌 종이(공시 서류)가 펴지면서 판이 된다. **법률 문서를 사람이 읽을 수 있는 한 장으로 바꾼다**는 서비스의 핵심 기능을 그대로 형상화한다. 접힌 면마다 명도가 달라지므로 그라데이션이 정당화된다.
**축약형** 한 번 접힌 사각(귀퉁이가 꺾인 종이).
**리스크** 종이 접기는 문서·PDF 서비스 아이콘의 관용어다. 그리고 "귀퉁이 접힌 종이"는 파일 아이콘 그 자체라 고유성이 낮다.

```
a folded sheet of paper unfolding into a flat board, origami document
opening, angular folded planes, editorial vector illustration, geometric
flat shapes, warm coral to amber gradient, near-black ink for details,
subtle risograph grain, mid-century poster art, bold simplified forms,
strong silhouette, clean composition, plain off-white background --ar 1:1 --raw --s 120 --chaos 12 --no 3d render, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, text, letters, typography, words, korean, watermark, frame, grid, crane, animal --v 8.2
```

---

### 07. 레트로 브라운관

**모티브 논리** 둥근 모서리 TV 안에 전광판이 켜져 있다. **"데이터 방송국"이라는 스테이트먼트의 가장 직설적인 그림**이고, 레트로 감성이 요즘 힙한 톤과도 맞는다. 화면 발광부에 그라데이션을 쓰면 자연스럽다.
**축약형** 둥근 모서리 사각 + 안테나 두 개, 또는 화면 안 바 2개.
**리스크** 레트로가 강해서 **"옛날 것"으로 읽힐 수 있다.** 5영업일·30일 사전공시라는 실시간성 있는 서비스와 톤이 어긋날 여지. 그리고 TV 아이콘은 미디어·스트리밍 서비스와 충돌한다.

```
a retro cathode ray tube television with rounded screen displaying tally
bars, vintage broadcast monitor with two antennas, editorial vector
illustration, geometric flat shapes, warm coral to amber gradient,
near-black ink for details, subtle risograph grain, mid-century poster
art, bold simplified forms, strong silhouette, clean composition, plain
off-white background --ar 1:1 --raw --s 120 --chaos 12 --no 3d render, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, text, letters, typography, words, korean, watermark, frame, grid, static noise, scanlines --v 8.2
```

---

### 08. 큰손이 판을 넘긴다

**모티브 논리** 이름의 다른 반쪽인 "큰"을 담는다. 커다란 손이 판의 한 칸을 넘기거나 판을 받친다. **손의 크기와 판의 크기 대비**로 "큰손"이 시각적으로 성립한다.
**축약형** 손가락 두 개로 극단 단순화한 실루엣 + 사각.
**리스크** 손은 형태 정보가 많아 축소에 약하고, "터치·클릭·기부·투표" 아이콘과 의미가 겹친다. 위로 향한 손은 상승 뉘앙스라 등락 오독 소지도 있다.

```
an oversized simplified hand flipping one panel of a large board, giant
hand and small board scale contrast, editorial vector illustration,
geometric flat shapes, warm coral to amber gradient, near-black ink for
details, subtle risograph grain, mid-century poster art, bold simplified
forms, strong silhouette, clean composition, plain off-white background --ar 1:1 --raw --s 120 --chaos 12 --no 3d render, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, text, letters, typography, words, korean, watermark, frame, grid, fingernails, skin texture, realistic anatomy --v 8.2
```

---

### 09. 블라인드 너머의 판

**모티브 논리** 반쯤 열린 블라인드 사이로 전광판이 보인다. **닫혀 있던 정보가 틈으로 드러나는** 순간이고, 이게 공시(公示)의 문자적 의미다. 가로 슬랫이 그대로 집계 바처럼 읽히는 이중 구조가 조형적으로 우아하다.
**축약형** 가로 슬랫 3개(= 집계 바). v1의 01안과 형태가 수렴하므로 축약형 검증이 이미 끝나 있다.
**리스크** 엿보기 뉘앙스가 감시로 읽힐 수 있다. 05(서치라이트)와 같은 성격의 톤 리스크.

```
horizontal window blinds partially open revealing a glowing board behind,
slats reading as bars, editorial vector illustration, geometric flat
shapes, warm coral to amber gradient, near-black ink for details, subtle
risograph grain, mid-century poster art, bold simplified forms, strong
silhouette, clean composition, plain off-white background --ar 1:1 --raw --s 120 --chaos 12 --no 3d render, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, text, letters, typography, words, korean, watermark, frame, grid, room interior, furniture --v 8.2
```

---

### 10. 스타디움 전광판

**모티브 논리** 관중석 위로 솟은 대형 스코어보드. **여럿이 같은 판을 올려다보는** 구도가 "중계"의 본질이고, 이 서비스가 개인 자문이 아니라 불특정 다수를 향한 방송이라는 **법적 포지션(A레벨)까지 그림으로 말해준다**.
**축약형** 기둥 위의 사각 판.
**리스크** 스포츠 연상이 강해 투자 서비스로 안 읽힐 수 있다. 관중을 그리면 요소가 늘어 축소가 어려워진다.

```
a large stadium scoreboard on a pole seen from below, tally panel raised
above, editorial vector illustration, geometric flat shapes, warm coral
to amber gradient, near-black ink for details, subtle risograph grain,
mid-century poster art, bold simplified forms, strong silhouette, clean
composition, plain off-white background --ar 1:1 --raw --s 120 --chaos 12 --no 3d render, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, text, letters, typography, words, korean, watermark, frame, grid, crowd, players, ball, sport equipment --v 8.2
```

---

## 4. 우선순위 제안

**고유성 × 축약 가능성 × 톤 정합**으로 보면 이 순서다.

| 순위 | 안 | 근거 |
|---|---|---|
| 1 | **01 선셋 보드** | 그라데이션이 장식이 아니라 필연. 축약형이 16px에서 확실히 성립 |
| 2 | **03 스플릿플랩** | 속보성을 정지 이미지로 담는 유일한 형태. 금융권 미사용 |
| 3 | **09 블라인드** | 공시의 문자적 의미 + 축약형이 이미 검증된 집계 바로 수렴 |
| 4 | **10 스타디움 전광판** | 법적 포지션까지 그림으로 말함. 다만 스포츠 연상이 변수 |
| 5 | **02 스카이라인** | 조형은 안전하나 부동산·금융에서 포화 |

**톤 리스크가 있는 안**은 05(서치라이트)와 09(블라인드)다. 둘 다 감시 뉘앙스가 있어 브랜드 톤 키워드 unbothered(호들갑 없음)와 충돌할 여지가 있다. 09는 축약형 이점이 커서 4순위 안에 넣었지만, 랜딩 카피에서 "감시"가 아니라 "중계"임을 분명히 해야 한다.

**04(캐스터)와 08(큰손)은 인물·신체가 들어간다.** 성별·연령이 읽히는 순간 배제되는 사용자가 생기고, 축소 내성도 나빠진다. 매력적이지만 실무 비용이 크다.

---

## 5. 자산 목록 — 그라데이션 추가분

v1 §3의 목록에 아래가 더해지고, 파비콘 계열은 **전부 Reduced에서만** 파생된다.

| 파일 | 내용 | 비고 |
|---|---|---|
| `logo-primary.svg` | 일러스트 + grad-sunset | 랜딩·OG·스플래시·스토어 |
| `logo-primary-flat.svg` | 같은 일러스트, coral-500 단색 | 그라데이션 불가 매체 |
| `symbol-reduced.svg` | 축약 실루엣 + coral-500 단색 | 앱바·탭바 |
| `symbol-reduced-ink.svg` | 축약 실루엣 ink 1도 | 워터마크·모노 인쇄 |
| `symbol-reduced-white.svg` | 축약 실루엣 흰색 1도 | coral 면·사진 위 역상 |
| 락업 4종 | 심볼 + 워드마크 조합 | **제가 만들어 드린다** |
| 파비콘 세트 7종 | Reduced에서 파생 | **제가 만들어 드린다** |

일러스트 원본이 래스터 질감(리소그래프 그레인)을 포함한다면, **`logo-primary`는 SVG가 아니라 PNG로 주셔도 된다** — 벡터화하면 그레인이 어차피 죽는다. 대신 **Reduced만은 반드시 SVG**여야 한다. 파비콘 전 세트가 거기서 나온다.

---

## 6. SVG 규격 — v1에서 달라지는 점

v1 §4의 규격은 그대로 유효하고, 그라데이션 때문에 세 가지가 추가된다.

`<linearGradient>`의 `id`에는 **`bb-` 접두어**를 붙여주시면 된다(`id="bb-grad-sunset"`). SVG를 HTML에 인라인으로 넣으면 문서 전체에서 id가 공유되기 때문에, 접두어가 없으면 다른 SVG와 충돌해 색이 엉킨다.

그라데이션 좌표는 `gradientUnits="objectBoundingBox"`로 상대 좌표를 쓰시면 크기가 바뀌어도 각도가 유지된다.

**Reduced 버전에는 그라데이션을 넣지 않는다.** 16px 파비콘에서 그라데이션은 보이지도 않으면서 파일만 키우고, ICO 변환 시 밴딩을 만든다.

---

## 7. 다음

Primary(일러스트)와 Reduced(축약 SVG) 두 벌을 주시면 STEP 6(파비콘·앱 아이콘 전 세트 + head·manifest 스니펫 + 32px 식별성 검수)과 STEP 7(bx §2·§8 개정, 브랜드 최종 문서, decisions_log, 커밋)을 이어서 진행한다.

**Reduced를 먼저 확정**하시는 걸 권한다. 축약형이 16px에서 안 살아나면 Primary가 아무리 좋아도 앱 아이콘이 무너지고, 그때는 처음부터 다시 그려야 한다.
