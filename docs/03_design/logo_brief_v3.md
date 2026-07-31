# 빅보드 로고 v3 — 중간 지점

> 2026-07-31 | v1(아이콘 12안)과 v2(일러스트 10안)를 대체한다. 그라데이션 스펙(v2 §1)과 2단 체계(v2 §2), 자산 목록(v1 §3 + v2 §5), SVG 규격(v1 §4 + v2 §6)은 그대로 유효하다.
> 시각 기준: **`logo_complexity_target.html`을 먼저 열어보실 것.** 이 문서는 그 그림의 설명이다.

---

## 0. 중간 지점을 숫자로 정의한다

"아이콘 같다"와 "너무 복잡하다" 사이는 말로 합의가 안 된다. 같은 전광판 모티브를 복잡도만 바꿔 5단계로 그렸고, **L3가 목표**다.

| 단계 | 성격 | 도형 수 | 색 면 | 깊이 표현 | 판정 |
|---|---|---|---|---|---|
| L1 | 순수 아이콘 | 3~4 | 1 | 없음 | v1이 여기 있었다 |
| L2 | 아이콘 + 라운드 | 3~4 | 1 | 없음 | 표정 없음 |
| **L3** | **마크** | **3~5** | **3 이하** | **기울기 3~8° 또는 접힘 1회** | **목표** |
| L4 | 일러스트 마크 | 6~9 | 3~4 | 부속물 등장 | 32px에서 붕괴 |
| L5 | 일러스트 | 10+ | 4+ | 배경·환경 | v2가 여기 있었다 |

### L3의 정량 기준 — 미드저니 결과를 이 6개로 거른다

도형은 **3~5개**이고 부속물·배경 요소는 **0개**다. 색 면은 **3개 이하**(coral 단색 1 + 그라데이션 1 + ink). 깊이는 **기울기 3~8° 또는 접힘 1회**로만 만들고 원근·투시는 쓰지 않는다. 그라데이션은 **한 면에만** 얹는다. 인물·환경·지형·광선은 **없다**. 32px에서 실루엣이 **한 덩어리로 뭉치지 않는다.**

핵심은 이거다 — **L2와 L3를 가르는 건 요소 개수가 아니라 "각도와 빛"이다.** 정면 아이콘에 기울기 5°와 한 면 그라데이션만 넣어도 표정이 생기고, 그 이상을 넣으면 장면이 된다.

---

## 1. 미드저니 프롬프트

`--s`는 v1의 50과 v2의 120 사이인 **85**로 잡았다. 프롬프트 뼈대에 **`single object, not a scene`과 `3 to 5 shapes only`를 명시적으로 박은 것**이 v2와의 결정적 차이다.

```
[모티브], single object logo mark, not a scene, only 3 to 5 geometric
shapes, slight tilt for depth, warm coral to amber gradient on one face
only, near-black ink details, flat vector, thick rounded forms, bold
silhouette, centered, plain white background, legible at 32 pixels
--ar 1:1 --raw --s 85 --chaos 8
--no 3d render, isometric, perspective, glossy, bevel, emboss, drop
shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur,
photorealistic, background scenery, horizon, landscape, characters,
people, text, letters, typography, words, korean, watermark, frame, grid,
multiple objects, cluttered
--v 8.2
```

---

## 2. 스케치 8종 — 각 안의 프롬프트

미리보기 HTML에 104 / 48 / 32 / 16px과 coral 면 위 역상을 함께 렌더해 뒀다. 방향을 고르신 뒤 해당 프롬프트로 돌리시면 된다.

---

### A. 기울어진 전광판

**논리** 판을 3~8° 기울이고 바를 원근에 맞춰 눕힌다. **정면 아이콘과 결정적으로 갈리는 최소 개입**이다. 요소를 하나도 늘리지 않고 표정만 얻는다.
**축소 내성** 상 — 기울어진 사각 실루엣이 16px에서도 유지된다.
**리스크** 기울기가 8°를 넘으면 "잘못 붙은 스티커"로 보인다.

```
a slightly tilted rectangular tally board with three horizontal bars of
decreasing length following the tilt, single object logo mark, not a
scene, only 3 to 5 geometric shapes, slight tilt for depth, warm coral to
amber gradient on one face only, near-black ink details, flat vector,
thick rounded forms, bold silhouette, centered, plain white background,
legible at 32 pixels --ar 1:1 --raw --s 85 --chaos 8 --no 3d render, isometric, perspective, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, background scenery, horizon, landscape, characters, people, text, letters, typography, words, korean, watermark, frame, grid, multiple objects, cluttered --v 8.2
```

---

### B. 반쯤 접힌 플랩

**논리** 스플릿플랩이 넘어가는 순간을 **두 면**으로만 표현한다. 윗면에만 그라데이션을 얹어 빛의 각도를 만든다. v2의 03안에서 회전·잔상·여러 칸을 걷어낸 형태.
**축소 내성** 상 — 가로 분할선 하나가 핵심이라 축소에 강하다.
**리스크** 두 면의 명도 차가 작으면 그냥 줄 그어진 사각이 된다.

```
a rounded square split into two horizontal halves with the top half
tipping forward slightly, split-flap tile mid-flip, single object logo
mark, not a scene, only 3 to 5 geometric shapes, slight tilt for depth,
warm coral to amber gradient on one face only, near-black ink details,
flat vector, thick rounded forms, bold silhouette, centered, plain white
background, legible at 32 pixels --ar 1:1 --raw --s 85 --chaos 8 --no 3d render, isometric, perspective, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, background scenery, horizon, landscape, characters, people, text, letters, typography, words, korean, watermark, frame, grid, multiple objects, cluttered --v 8.2
```

---

### C. 지평선 위 판

**논리** 반원(지평선) + 사각(판). v2의 선셋 보드를 **도형 2개로 압축**한 형태다. 그라데이션이 반원에 얹혀 필연성을 얻는다.
**축소 내성** 상 — 실루엣이 단순해 16px 안전.
**리스크** 현재 스케치는 **안전모처럼 읽힌다.** 판을 반원 밖으로 더 띄우거나 폭을 좁혀야 한다. 프롬프트에 그 지시를 넣어뒀다.

```
a small rectangular board floating above a semicircle horizon arc, the
board clearly separated from the arc and narrower than it, sunrise over a
board, single object logo mark, not a scene, only 3 to 5 geometric
shapes, warm coral to amber gradient on the arc only, near-black ink
details, flat vector, thick rounded forms, bold silhouette, centered,
plain white background, legible at 32 pixels --ar 1:1 --raw --s 85 --chaos 8 --no 3d render, isometric, perspective, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, landscape, mountains, sun rays, characters, people, text, letters, typography, words, korean, watermark, frame, grid, helmet, hat, dome --v 8.2
```

---

### D. 겹친 두 판

**논리** 앞뒤로 어긋난 판 2장 = **공시가 쌓인다**. 뒤 판에만 그라데이션을 얹어 깊이를 만든다.
**축소 내성** 중상 — 겹침이 16px에서 한 덩어리로 뭉칠 수 있다. 어긋난 폭을 크게 잡아야 한다.
**리스크** "복사·중복" 아이콘과 형태가 겹친다.

```
two rounded rectangular boards stacked with a large diagonal offset, back
one peeking out, single object logo mark, not a scene, only 3 to 5
geometric shapes, warm coral to amber gradient on the back board only,
near-black ink bars on the front board, flat vector, thick rounded forms,
bold silhouette, centered, plain white background, legible at 32 pixels --ar 1:1 --raw --s 85 --chaos 8 --no 3d render, isometric, perspective, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, background scenery, characters, people, text, letters, typography, words, korean, watermark, frame, grid, multiple objects, cluttered --v 8.2
```

---

### E. 넘치는 바

**논리** 1위 바가 판 밖으로 뚫고 나간다. **압도적 1위라는 의미가 형태 자체에 들어간다** — 8안 중 의미 밀도가 가장 높다.
**축소 내성** 상 — 삐져나온 바가 실루엣을 특징적으로 만든다.
**리스크** 정사각 앱 아이콘에서 튀어나온 부분이 잘린다. 마스커블 아이콘용 별도 조정이 필요하다.

```
a rounded rectangular board where one horizontal bar breaks out past the
right edge, overflowing bar, single object logo mark, not a scene, only 3
to 5 geometric shapes, warm coral to amber gradient on the board, near-
black ink bars, flat vector, thick rounded forms, bold silhouette,
centered, plain white background, legible at 32 pixels --ar 1:1 --raw --s 85 --chaos 8 --no 3d render, isometric, perspective, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, background scenery, characters, people, text, letters, typography, words, korean, watermark, frame, grid, multiple objects, cluttered, arrow --v 8.2
```

---

### F. 꺾인 띠

**논리** 티커 자막 띠를 두 겹으로. 흐름과 속보감이 형태에 있다.
**축소 내성** 중 — 가로로 길어 정사각 슬롯에서 여백이 크게 남는다.
**리스크** **오픈이슈 O1(티커 제거 권고)과 묶인다.** 로고를 띠로 잡으면 티커가 자동으로 존치된다. O1을 먼저 결정하고 진입할 것.

```
two parallel angled ribbon strips slightly folded, ticker tape band,
single object logo mark, not a scene, only 3 to 5 geometric shapes, warm
coral to amber gradient on the upper strip only, near-black ink details,
flat vector, thick rounded forms, bold silhouette, centered, plain white
background, legible at 32 pixels --ar 1:1 --raw --s 85 --chaos 8 --no 3d render, isometric, perspective, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, background scenery, characters, people, text, letters, typography, words, korean, watermark, frame, grid, multiple objects, cluttered, flag, banner --v 8.2
```

---

### G. 스코프 겹침

**논리** 원(관측) + 사각(판)이 겹친다. **두 은유를 도형 2개로 합친 최소 구성.**
**축소 내성** 중상 — 겹침 경계가 16px에서 흐려진다.
**리스크** 원+사각 조합은 범용 앱 아이콘 문법이라 고유성이 낮다.

```
a circle and a rounded rectangle overlapping, circle behind and to the
left, one small dot inside the circle, single object logo mark, not a
scene, only 3 to 5 geometric shapes, warm coral to amber gradient on the
circle only, near-black ink bars inside the rectangle, flat vector, thick
rounded forms, bold silhouette, centered, plain white background, legible
at 32 pixels --ar 1:1 --raw --s 85 --chaos 8 --no 3d render, isometric, perspective, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, background scenery, characters, people, text, letters, typography, words, korean, watermark, frame, grid, multiple objects, cluttered, venn diagram --v 8.2
```

---

### H. 열린 틈

**논리** 판 가운데가 벌어지며 안쪽 그라데이션이 드러난다. **공시(公示)의 문자적 의미** — 가려져 있던 것이 공개된다.
**축소 내성** 중상 — 틈의 폭을 충분히 확보하면 32px까지 간다.
**리스크** 설명 없이는 안 읽힌다. 초기 인지 비용이 크다.

```
a rounded rectangle split horizontally into two parts pulling apart, a
bright gap revealed between them, single object logo mark, not a scene,
only 3 to 5 geometric shapes, warm coral to amber gradient inside the gap
only, near-black ink details, flat vector, thick rounded forms, bold
silhouette, centered, plain white background, legible at 32 pixels --ar 1:1 --raw --s 85 --chaos 8 --no 3d render, isometric, perspective, glossy, bevel, emboss, drop shadow, glass, neon, purple, blue, rainbow, airbrush, soft blur, photorealistic, background scenery, characters, people, text, letters, typography, words, korean, watermark, frame, grid, multiple objects, cluttered, door, window frame --v 8.2
```

---

## 3. 우선순위

| 순위 | 안 | 근거 |
|---|---|---|
| 1 | **A 기울어진 전광판** | 요소를 하나도 안 늘리고 표정만 얻는다. 축소 내성 최상. 실패 확률이 가장 낮다 |
| 2 | **E 넘치는 바** | 8안 중 의미 밀도 최고 — "압도적 1위"가 형태에 있다. 실루엣도 특징적 |
| 3 | **B 반쯤 접힌 플랩** | 속보성을 담는 유일한 형태. 명도 차 확보가 관건 |
| 4 | **H 열린 틈** | 공시의 문자적 의미. 조언 뉘앙스 0으로 법적으로 가장 안전 |
| 5 | **C 지평선 위 판** | 그라데이션 필연성은 최고. 다만 안전모 오독을 먼저 해결해야 함 |

**F(꺾인 띠)는 O1 결정 전까지 보류**를 권한다. 로고가 티커를 존치시켜 버리는 구조라 순서가 거꾸로 된다.

---

## 4. 미드저니 결과를 고를 때의 체크리스트

한 장씩 이 6개를 통과시키시면 된다. 하나라도 걸리면 그 컷은 L4 이상으로 넘어간 것이다.

도형이 6개 이상인가 · 배경에 무언가 있는가(지형·광선·패턴) · 그라데이션이 두 면 이상에 있는가 · 원근이나 아이소메트릭이 들어갔는가 · 부속물(스탠드·안테나·표시등)이 붙었는가 · 눈을 가늘게 뜨고 봤을 때 실루엣이 한 덩어리로 뭉치는가.

마음에 드는 컷이 나오면 그 URL을 `--sref [URL] --sw 100`으로 물려 나머지 안을 뽑으시면 조형 언어가 통일된다.

---

## 5. 다음

**Reduced(단색 축약 SVG)를 먼저 확정**하시는 걸 권한다. L3 지점은 축약형과 Primary의 거리가 짧아서, 잘 고르면 **한 벌로 둘 다 커버**할 수도 있다 — 그러면 자산 관리가 훨씬 단순해진다.

SVG 규격은 v1 §4 + v2 §6 그대로다. `viewBox="0 0 64 64"` · 색은 `#FF7355` `#FFB964` `#17191C` 리터럴 · stroke 대신 fill · 그라데이션 id에 `bb-` 접두어 · Reduced에는 그라데이션 넣지 않음.

받으면 STEP 6(파비콘·앱 아이콘 전 세트 + head·manifest 스니펫 + 32px 검수)과 STEP 7(bx §2·§8 개정, 최종 문서, decisions_log, 커밋)로 이어간다.
