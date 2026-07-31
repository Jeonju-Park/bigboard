# 빅보드 로고 v4 — B 모노그램 6방향 + SVG 제작 스펙

> 2026-07-31 | 방향: Big **B**oard의 B를 마크로. 복잡도 목표는 v3의 **L3**(도형 3~5개, 그라데이션 1면, 기울기 3~8° 또는 접힘 1회) 유지.
> 확정값: coral-500 `#FF7355` · 그라데이션 끝 `#FFB964` · ink `#17191C` · Paperlogy 800

---

## 0. 글자 로고를 뽑을 때 프롬프트가 달라지는 지점

v1~v3 프롬프트는 `--no`에 **text, letters, typography**를 넣어 글자를 억제했다. **이번엔 그걸 빼야 한다** — 안 그러면 미드저니가 B를 지운다.

대신 이렇게 바꾼다. `--no`에서 letters·typography·text를 **제거**하고, 그 자리에 **words, sentences, paragraph, alphabet, multiple letters, gibberish text, lorem ipsum**을 넣는다. 이러면 "글자 하나"는 살리고 "문장·낙서 글자 뭉치"는 막는다.

그리고 미드저니는 **정확한 자형을 만들지 못한다.** B가 어설프게 나오는 건 당연하고, **비율·구성·아이디어만 참고**한 뒤 최종 자형은 Paperlogy B를 기반으로 직접 작도하는 게 맞다. 미드저니는 "이 조합이 성립하는가"를 보는 용도다.

**공통 뼈대** — 아래 6개 프롬프트는 앞부분만 다르다.

```
[방향], single letter B logo monogram, single object not a scene, only 3
to 5 geometric shapes, warm coral to amber gradient on one part only,
near-black ink, flat vector, thick forms, bold silhouette, centered,
plain white background, legible at 32 pixels
--ar 1:1 --raw --s 85 --chaos 10
--no 3d render, isometric, perspective, glossy, bevel, emboss, drop
shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur,
photorealistic, background scenery, characters, people, words, sentences,
paragraph, alphabet, multiple letters, gibberish text, lorem ipsum,
watermark, frame, grid, cluttered
--v 8.2
```

---

## 1. 여섯 방향

### ① BB 겹침

**조형 논리** Big Board의 두 이니셜을 겹친다. 겹침 자체가 **"공시가 쌓인다"**는 의미가 되고, 앞뒤 명도 차로 깊이가 생긴다. 이름을 그대로 마크로 만드는 정공법이라 설명이 필요 없다.
**B를 지키는 법** 앞 B를 100%, 뒤 B를 82~85% 크기로 두고 가로 오프셋을 **글자 폭의 40~50%**로 크게 준다. 오프셋이 작으면 32px에서 한 덩어리로 뭉친다.
**리스크** BB 모노그램은 흔하다. 겹침 각도(살짝 회전), 크기 차, 그라데이션 위치 셋 중 최소 둘로 차별화해야 한다.
**고를 때 볼 것** 32px로 축소했을 때 **B가 두 개로 세어지는가.** 하나로 보이면 실패다.

```
two overlapping capital letter B monograms, one slightly smaller and set
behind with a large horizontal offset, layered stacked letterforms,
single letter B logo monogram, single object not a scene, only 3 to 5
geometric shapes, warm coral to amber gradient on the back letter only,
near-black ink front letter, flat vector, thick forms, bold silhouette,
centered, plain white background, legible at 32 pixels --ar 1:1 --raw --s 85 --chaos 10 --no 3d render, isometric, perspective, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, background scenery, characters, people, words, sentences, paragraph, alphabet, multiple letters, gibberish text, lorem ipsum, watermark, frame, grid, cluttered --v 8.2
```

---

### ② 대문자 B + 소문자 b

**조형 논리** 대문자와 소문자가 만나면 **크기 위계**가 생긴다. 큰 B(Big)와 작은 b가 나란히 서면 그 자체로 "큰손과 개인"이 되고, 소문자 b의 긴 어센더가 대문자 B의 stem과 겹치면서 **하나의 축을 공유**하는 구조가 나온다. 여섯 방향 중 조형적 밀도가 가장 높다.
**B를 지키는 법** 소문자 b의 어센더 높이를 대문자 B의 캡 높이와 **정확히 맞춘다.** 그래야 두 글자가 같은 선 위에 서고 우연이 아니라 설계로 보인다.
**리스크** 소문자 b는 대문자보다 카운터가 작아 **16px에서 먼저 막힌다.** 카운터 최소 높이(아래 §2 참조)를 반드시 확인할 것.
**고를 때 볼 것** 두 글자가 **다른 크기의 같은 글자**로 읽히는가. 서로 다른 두 기호로 보이면 실패다.

```
an uppercase letter B and a lowercase letter b sharing one vertical stem,
the lowercase ascender matching the cap height, size hierarchy between
big and small, single letter B logo monogram, single object not a scene,
only 3 to 5 geometric shapes, warm coral to amber gradient on the smaller
letter only, near-black ink, flat vector, thick forms, bold silhouette,
centered, plain white background, legible at 32 pixels --ar 1:1 --raw --s 85 --chaos 10 --no 3d render, isometric, perspective, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, background scenery, characters, people, words, sentences, paragraph, alphabet, multiple letters, gibberish text, lorem ipsum, watermark, frame, grid, cluttered --v 8.2
```

---

### ③ B + 상승

> **먼저 읽어주세요 — 법적 검토가 필요한 방향입니다.**
> `feasibility_legal_kr.md` §2가 정한 A레벨(사실 재가공, 조언 없음) 경계에서, **상승 은유는 "이 서비스를 쓰면 오른다"로 읽힐 수 있습니다.** 로고는 모든 화면·스토어·광고에 붙는 자산이라 카피보다 노출이 넓고, 고지문으로 상쇄하기도 어렵습니다. bx §2도 "액센트를 등락·손익에 쓰지 않는다"를 규칙으로 두고 있어 내부 규칙과도 부딪힙니다.
> **대안** — 방향성을 **가격이 아니라 순위·집계**에 붙이면 문제가 사라집니다. "값이 오른다"가 아니라 "판이 채워진다 / 바가 자란다"로 읽히게 하는 것이고, 아래 프롬프트는 그 해석으로 짰습니다.

**조형 논리** B의 두 bowl이 **계단처럼 커지며 올라간다.** 위가 작고 아래가 크면 안정적인 B지만, 이 방향은 그 위계를 뒤집거나 우상향 축을 만들어 성장을 암시한다.
**B를 지키는 법** bowl의 크기 차만으로 상승을 만들고 **화살표·삼각형을 추가하지 않는다.** 요소를 늘리는 순간 L4로 넘어간다.
**리스크** 위 경고 외에, 우상향 기울기가 8°를 넘으면 글자가 무너져 B로 안 읽힌다.
**고를 때 볼 것** **화살표가 붙어 있으면 탈락**시킬 것. 그건 ⑤번 방향이다.

```
a capital letter B whose two bowls step upward like growing tally bars,
the lower bowl wider than the upper, subtle rising diagonal axis, no
arrow, single letter B logo monogram, single object not a scene, only 3
to 5 geometric shapes, warm coral to amber gradient on the larger bowl
only, near-black ink, flat vector, thick forms, bold silhouette,
centered, plain white background, legible at 32 pixels --ar 1:1 --raw --s 85 --chaos 10 --no arrow, arrowhead, triangle, chart line, stock graph, 3d render, isometric, perspective, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, background scenery, characters, people, words, sentences, paragraph, alphabet, multiple letters, gibberish text, lorem ipsum, watermark, frame, grid, cluttered --v 8.2
```

---

### ④ B + 손

**조형 논리** 이름의 나머지 절반인 "큰손". B의 두 bowl을 **접힌 손가락 두 마디**로, stem을 손등이나 엄지로 읽히게 한다. 브랜드 이름 두 요소(큰손 · 보드)가 한 글자에 들어가는 유일한 방향이다.
**B를 지키는 법** 손을 그리는 게 아니라 **B를 손처럼 보이게** 한다. 손가락 마디를 3개 이상 그리는 순간 글자가 사라진다. 마디는 2개까지.
**리스크** 손은 형태 정보가 많아 **축소에 가장 약하다.** 그리고 손 기호는 터치·클릭·기부·투표와 의미가 겹쳐 흐려진다. 위로 향한 손은 상승 뉘앙스라 ③과 같은 법적 검토가 필요해질 수 있다.
**고를 때 볼 것** 눈을 가늘게 떴을 때 **B가 먼저 보이는가, 손이 먼저 보이는가.** 손이 먼저면 탈락이다.

```
a capital letter B whose two bowls read as two folded finger joints and
whose stem reads as the back of a hand, letterform first hand second,
minimal, single letter B logo monogram, single object not a scene, only 3
to 5 geometric shapes, warm coral to amber gradient on one bowl only,
near-black ink, flat vector, thick forms, bold silhouette, centered,
plain white background, legible at 32 pixels --ar 1:1 --raw --s 85 --chaos 10 --no realistic hand, fingernails, skin texture, anatomy, five fingers, 3d render, isometric, perspective, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, background scenery, characters, people, words, sentences, paragraph, alphabet, multiple letters, gibberish text, lorem ipsum, watermark, frame, grid, cluttered --v 8.2
```

---

### ⑤ B + 화살

> **③과 같은 법적 검토가 필요합니다.** 화살은 상승보다 더 직접적인 방향 기호라 **"매수 신호"로 읽힐 위험이 큽니다.** 금지 워딩 목록(시그널·신호)의 시각적 등가물이 될 수 있어, 채택하시려면 변리사가 아니라 **자본시장 전문 변호사 검토**를 권합니다.
> **대안** — 화살을 **방향(위로)이 아니라 지시(여기)**로 쓰면 리스크가 크게 줄어듭니다. 위를 가리키는 화살 대신 **판의 한 지점을 가리키는 화살**, 또는 레이더 빔처럼 **훑는 화살**입니다. 아래 프롬프트는 그 해석입니다.

**조형 논리** B의 stem 또는 bowl 끝이 **화살촉으로 마감**된다. 화살이 별도 요소로 붙는 게 아니라 글자의 획이 그대로 화살이 되는 구조라야 L3를 유지한다.
**B를 지키는 법** 화살촉은 **한 곳에만**. 두 군데 이상이면 글자가 아니라 기호 뭉치가 된다.
**리스크** 위 경고. 그리고 화살+글자 조합은 물류·배송·성장 스타트업에서 포화 상태다.
**고를 때 볼 것** 화살이 **위를 향하고 있으면 재검토.** 옆이나 안쪽을 향하는 컷을 고르는 게 안전하다.

```
a capital letter B where one stroke terminates in an arrowhead pointing
sideways into the letter, the arrow formed by the letterform itself not
added on top, single arrowhead only, single letter B logo monogram,
single object not a scene, only 3 to 5 geometric shapes, warm coral to
amber gradient on the arrow stroke only, near-black ink, flat vector,
thick forms, bold silhouette, centered, plain white background, legible
at 32 pixels --ar 1:1 --raw --s 85 --chaos 10 --no upward arrow, rising chart, stock graph, multiple arrows, 3d render, isometric, perspective, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, background scenery, characters, people, words, sentences, paragraph, alphabet, multiple letters, gibberish text, lorem ipsum, watermark, frame, grid, cluttered --v 8.2
```

---

### ⑥ 기하학적 B — 수학적 구성

**조형 논리** B를 **완전한 원과 직선만으로** 재구성한다. 두 bowl이 정확한 반원, stem이 정확한 직사각형, 반지름과 획 두께가 정수비로 떨어지는 구조. 컴퍼스와 자로 그린 흔적이 남는 바우하우스·스위스 모더니즘 문법이다.
**왜 이 브랜드에 맞나** 이 서비스의 톤 키워드가 **factual(팩트)**이고, 페르소나가 "숫자는 절대 안 틀리는 캐스터"다. **작도 가능한 로고는 그 성격의 시각적 증명**이 된다. 여섯 방향 중 브랜드 원칙과 가장 정합한다.
**B를 지키는 법** 지키는 게 아니라 **B가 전부**다. 다른 요소를 넣지 않는다. 그라데이션도 한 bowl에만 얹거나 아예 빼는 편이 이 문법에는 맞는다.
**리스크** 잘못하면 **폰트에서 글자 하나 뽑아온 것과 구분이 안 된다.** 반지름 비율·획 두께·카운터 형태 중 최소 하나에 명확한 규칙(예: 모든 반지름이 4의 배수)이 보여야 한다.
**고를 때 볼 것** 원과 직선의 **접점이 매끄러운가.** 미드저니는 이 접선 처리를 거의 못 하므로, 이 방향은 **미드저니로 구성만 보고 벡터로 직접 작도**하는 비중이 가장 크다.

```
a capital letter B constructed purely from perfect circles and straight
lines, visible geometric construction, compass and ruler geometry,
bauhaus swiss modernist letterform, mathematical proportions, thin
construction guide circles behind, single letter B logo monogram, single
object not a scene, warm coral to amber gradient on one bowl only, near-
black ink, flat vector, thick forms, bold silhouette, centered, plain
white background, legible at 32 pixels --ar 1:1 --raw --s 85 --chaos 10 --no 3d render, isometric, perspective, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, background scenery, characters, people, words, sentences, paragraph, alphabet, multiple letters, gibberish text, lorem ipsum, watermark, cluttered --v 8.2
```

---

### 방향별 요약

| 방향 | 조형 밀도 | 축소 내성 | 법적 리스크 | 고유성 |
|---|---|---|---|---|
| ① BB 겹침 | 중 | 중상 | 없음 | 낮음(흔한 모노그램) |
| ② B + b | **높음** | 중 | 없음 | **높음** |
| ③ B + 상승 | 중 | 상 | **주의** | 중 |
| ④ B + 손 | 높음 | **낮음** | 주의 | 높음 |
| ⑤ B + 화살 | 중 | 상 | **높음** | 낮음(포화) |
| ⑥ 기하학 B | 중 | **최상** | 없음 | 중(작도 규칙에 달림) |

**②와 ⑥을 먼저 뽑아보시길** 권한다. ②는 이름의 의미(큰/작은)가 형태에 들어가면서 법적 리스크가 없고, ⑥은 브랜드 페르소나와 정합하면서 축소 내성이 최상이다. ③·⑤는 법적 검토를 통과한 뒤에 진입하시는 게 순서다.

---

## 2. SVG 제작 스펙

미드저니 결과를 보고 직접 작도하실 때 지킬 규격이다. **이 스펙대로만 만들면 파비콘 전 세트, 락업 4종, 32px 검수까지 제가 스크립트로 한 번에 처리**할 수 있다.

첨부한 `keyline_grid_64.svg`를 피그마나 일러스트레이터에 배경 레이어로 깔고 작업하시면 된다.

### 2-1. 캔버스와 그리드

아트보드는 **64 × 64**다. 픽셀이 아니라 단위(unit)이며, 이 값이 SVG의 `viewBox="0 0 64 64"`가 된다. 64를 쓰는 이유는 16·32·48·64·128·512 모든 목표 크기로 **정수 배율 변환**이 되기 때문이다.

**4 단위 그리드**에 스냅한다. 64 ÷ 4 = 16칸이고, 이게 4pt 그리드(bx §4)와 같은 논리다. 굵은 선은 16 단위마다 있다.

**여백** — 심볼의 바운딩 박스는 **56 × 56 안**에 들어간다(상하좌우 4 단위). 다만 **시각적 무게 중심**을 맞추는 게 우선이라, 수학적 중앙보다 위로 1~2 단위 올리는 광학 보정이 필요할 수 있다.

**세이프 원** — 그리드 파일의 실선 원(반지름 25.6 = 지름 80%)은 **maskable 앱 아이콘의 안전 영역**이다. 이 원 밖으로 나가는 부분은 안드로이드 런처에서 잘릴 수 있다.

### 2-2. 최소 치수 — 16px에서 살아남기 위한 역산

64 단위를 16px로 렌더하면 **1 디바이스 픽셀 = 4 단위**다. 여기서 모든 최소치가 나온다.

| 항목 | 최소값 | 16px 환산 | 이유 |
|---|---|---|---|
| 획 두께 | **6 단위** | 1.5px | 4 단위(1px)는 안티에일리어싱으로 흐려진다 |
| 도형 간 간격 | **5 단위** | 1.25px | 이하면 두 도형이 붙어 보인다 |
| 카운터(구멍) 높이 | **8 단위** | 2px | B의 생명. 막히면 글자가 아니다 |
| 코너 반경 | **2 단위 이상** | 0.5px | 0이면 딱딱하고, 4 초과면 뭉툭해진다 |
| 최소 도형 크기 | **8 × 8 단위** | 2 × 2px | 이하는 점으로 사라진다 |

특히 **②번 방향(B + 소문자 b)은 소문자 b의 카운터가 먼저 막힌다.** 작도할 때 그 카운터를 8 단위 이상으로 강제하고, 필요하면 소문자 b를 예상보다 크게 잡으시면 된다.

### 2-3. 광학 보정 — 수학만으로는 안 맞는다

**원은 사각보다 크게.** 같은 크기로 그리면 원이 작아 보인다. B의 bowl 곡면이 stem의 상하단보다 **1~1.5 단위 더 튀어나오게** 오버슛을 준다.

**수평획은 수직획보다 얇게.** 시지각상 수평선이 더 굵어 보인다. B의 허리·상하 가로획을 stem 두께의 **88~92%**로 만든다.

**두 bowl의 크기.** 대문자 B에서 아래 bowl은 위보다 **크다.** 같으면 위가 커 보여 머리가 무거워진다. 폭 기준 아래가 4~6% 크게.

**겹침 방향(①·②).** 겹치는 두 글자 사이에는 **뒤 글자를 파내는 간격 2~3 단위**를 준다. 그냥 겹치면 경계가 사라지고, 간격을 주면 32px에서도 두 개로 세어진다.

### 2-4. 색과 그라데이션

```
coral-500  #FF7355   브랜드 기본
grad-end   #FFB964   그라데이션 끝점 (135°)
ink        #17191C   글자·디테일
```

**리터럴 HEX만** 쓴다. `currentColor`·CSS 변수·`opacity` 속성은 쓰지 않는다 — 파비콘 변환 스크립트가 색을 치환하고 평탄화해야 한다. 투명도가 필요하면 **미리 합성한 불투명 색**으로 바꿔 넣으시면 된다.

그라데이션은 **한 부위에만, 2스톱만, 135° 고정**이다.

```xml
<linearGradient id="bb-grad" x1="0" y1="0" x2="1" y2="1"
                gradientUnits="objectBoundingBox">
  <stop offset="0" stop-color="#FF7355"/>
  <stop offset="1" stop-color="#FFB964"/>
</linearGradient>
```

`id`에는 반드시 **`bb-` 접두어**를 붙인다. 인라인 SVG는 문서 전체에서 id를 공유해서, 접두어가 없으면 다른 SVG와 색이 엉킨다.

### 2-5. 패스 위생

**stroke를 쓰지 않는다.** 전부 `fill`이다. 선으로 그리셨다면 Outline Stroke(피그마) 또는 Object → Path → Outline Stroke(일러스트레이터)를 한 번 돌려주시면 된다. stroke는 축소·확대 시 두께 비율이 깨진다.

**겹친 패스는 Boolean으로 병합**한다. 중복 패스가 남으면 파비콘 축소 시 경계에 실선이 보인다.

**텍스트는 아웃라인 변환**(Create Outlines). `<text>` 요소가 남으면 폰트 없는 환경에서 깨진다.

**구멍 뚫린 도형**(B의 카운터)은 두 패스를 합치고 `fill-rule="evenodd"`를 명시한다.

**`<g>`와 `transform`은 최소화**한다. 필요하면 제가 SVGO로 정리하되 `viewBox`는 보존한다.

### 2-6. 만들어 주실 파일

| # | 파일명 | 내용 | 우선순위 |
|---|---|---|---|
| 1 | `symbol.svg` | 심볼 컬러(coral + 그라데이션 + ink), 64×64 | **필수 — 이것만 있어도 시작 가능** |
| 2 | `symbol-flat.svg` | 그라데이션 뺀 coral 단색 버전 | **필수** — 파비콘·소형이 여기서 나온다 |
| 3 | `symbol-ink.svg` | ink 1도 | 권장 — 워터마크·모노 인쇄 |
| 4 | `symbol-white.svg` | 흰색 1도 | 권장 — coral 면·사진 위 역상 |

**2번(단색)이 1번보다 중요하다.** 16px 파비콘에서 그라데이션은 보이지도 않으면서 ICO 변환 시 밴딩을 만든다. 그리고 단색으로 성립하지 않는 로고는 애초에 형태가 약한 것이라, 2번을 먼저 그려보시면 형태 검증이 자동으로 된다.

락업(심볼 + 워드마크) 4종과 파비콘 7종은 **제가 만든다.** 워드마크는 이미 Paperlogy 800 아웃라인으로 확보돼 있고, 정렬·간격·클리어스페이스를 규격대로 잡는 건 자동화가 낫다.

### 2-7. 내보내기 설정

**피그마** — 프레임을 64×64로 만들고 Export → SVG, `Include "id" attribute` 끄기, `Outline text` 켜기, `Simplify stroke` 켜기.
**일러스트레이터** — Save As → SVG, Styling `Presentation Attributes`(Internal CSS 아님), Font `Convert to outline`, Decimal 2, Responsive **끄기**(width/height가 남아야 미리보기가 편하다).

### 2-8. 넘기기 전 자가 검수 5개

브라우저에서 SVG를 열고 **창을 16px 수준까지 줄여** 보신다. B로 읽히면 통과다.

**흑백으로 바꿔 본다**(브라우저 개발자도구에서 grayscale 필터). 형태가 유지되면 통과, 뭉치면 명도 대비가 부족한 것이다.

**카운터를 확인**한다. B의 구멍이 16px에서 막히지 않는가.

**코드를 열어** `stroke=`, `<text`, `opacity=`, `currentColor`가 없는지 검색한다.

**`viewBox="0 0 64 64"`인지** 확인한다.

---

## 3. 다음

`symbol-flat.svg` 하나만 주셔도 STEP 6(파비콘·앱 아이콘 전 세트 + head·manifest 스니펫 + 32px 실크기 검수)을 시작할 수 있다. 컬러 버전과 락업은 그다음에 붙이면 된다.

미드저니 원본 이미지와 방향 번호(①~⑥)도 같이 주시면 조형 논리를 `bx_brand_final.md`에 그대로 옮겨 적는다.
