# assets/brand/fonts — 빅보드 폰트 확보 절차

> 조사일: 2026-07-31 | 모든 라이선스 정보는 아래 출처 링크에서 직접 확인함
> 상위 문서: `docs/03_design/bx_designsystem_source_bigshot_radar.md` §3 (3서체 역할 분리)

## 0. 서체 3역할 (bx 문서 §3 확정)

| 역할 | 서체 | 상태 |
|---|---|---|
| Display — 헤드라인·수치 강조 제목 | Paperlogy **또는** Gmarket Sans | **미결정 (§9-3)** |
| Body — 본문·UI | **Pretendard** | 확정 |
| Numeric — 시세·수량·티커 | **IBM Plex Mono** (tabular) | 확정 |

---

## 1. Display 서체 비교 — Paperlogy vs Gmarket Sans

### 1-1. 라이선스: 동일하다 (결정 요인이 아님)

당초 "임베딩 조건이 다르면 그것이 결정 요인"이라고 가정했으나, **확인 결과 둘 다 SIL Open Font License 1.1이고 임베딩 허용 범위가 같다.** 웹앱과 네이티브 앱 임베딩 모두 문제없다.

| 항목 | Paperlogy | Gmarket Sans |
|---|---|---|
| 라이선스 | SIL OFL 1.1 | SIL OFL 1.1 |
| 인쇄물 | 허용 | 허용 |
| 웹사이트 | 허용 | 허용 |
| 영상 | 허용 | 허용 |
| 포장지 | 허용 | 허용 |
| **임베딩 (웹·앱 서버 설치, 전자책)** | **허용** | **허용** |
| **BI/CI (로고·브랜드명)** | **허용** | **허용** |
| 수정·재배포 | 허용 | 허용 |
| 금지 | 폰트 파일 단독 판매, 라이선스 변경 | 폰트 파일 단독 판매 |

출처: [눈누 — 페이퍼로지](https://noonnu.cc/en/font_page/1456) · [눈누 — G마켓 산스](https://noonnu.cc/en/font_page/366) · [폰트 아카이브 — 페이퍼로지](https://fonts.taedonn.com/post/Paperlogy) · [지마켓 공식 폰트 페이지](https://corp.gmarket.com/fonts/) (모두 2026-07-31 확인)

> 주의: 지마켓 공식 페이지는 "SIL Open Font License로 배포, 개인·기업이 영리/비영리 목적으로 자유롭게 사용 가능"까지만 명시하고 OFL 전문은 싣지 않는다. 눈누의 허용 범위 표를 함께 확인해야 조항 단위 판단이 가능하다.

### 1-2. 실제 결정 요인은 두 가지다

**(1) Weight 커버리지 — 이것이 핵심**

| | Paperlogy | Gmarket Sans |
|---|---|---|
| 제공 weight | **9종** (100·200·300·400·500·600·700·800·900) | **3종** (Light 300 · Medium 500 · Bold 700) |

bx 문서 §3 타입 스케일이 요구하는 weight는 **400 / 600 / 700 / 800**이다.

- `title-s 17px/600`, `title 20px/700`, `display 24px/800`
- Gmarket Sans에는 **600과 800이 없다.** display 레벨(24px/800)을 진짜 자소로 구현할 수 없고, 브라우저 합성 볼드(faux bold)로 대체하면 한글 자소가 뭉개진다. bx §3의 "계층 법칙 — 레벨마다 굵기·크기·색 3요소를 동시에 규정"이 성립하지 않게 된다.

**(2) 파일 크기 — 모바일 웹앱 초기 로딩에 직결**

| 형식 | Paperlogy | Gmarket Sans |
|---|---|---|
| woff2 (weight 1종) | 약 **155~163 KB** | 약 **333~365 KB** |
| otf (weight 1종) | 약 920~957 KB | 약 848~869 KB |

웹폰트로 쓰는 woff2 기준 **Gmarket Sans가 2배 이상 무겁다.** M1이 GitHub Pages 모바일 웹앱이고 Display를 2종(700·800) 이상 로드해야 하므로, Paperlogy 320KB vs Gmarket Sans 700KB(그나마 800이 없음)의 차이가 난다.

### 1-3. 권고

**Paperlogy.** 라이선스가 동일한 상황에서 weight 커버리지(9종 vs 3종)와 파일 크기(절반 이하)가 모두 우세하고, bx §3의 타입 스케일을 수정 없이 그대로 구현할 수 있는 유일한 선택지다.

Gmarket Sans를 쓰려면 타입 스케일에서 600과 800을 포기하고 400/500/700 3단계로 재설계해야 하는데, 이는 §3 계층 법칙을 다시 짜는 작업이다.

---

## 2. 웹폰트 로딩 방식

### 2-1. 권장: jsDelivr CDN (파일 동봉 없음)

CDN을 쓰면 저장소에 폰트 파일을 두지 않으므로 OFL의 저작권 고지 동봉 의무가 발생하지 않는다. M1 기본 방식으로 채택한다.

```html
<!-- Display: Paperlogy (선택 시) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/fonts-archive/Paperlogy/Paperlogy.css" type="text/css"/>

<!-- Display: Gmarket Sans (선택 시) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/GmarketSans.css" type="text/css"/>

<!-- Body: Pretendard -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"/>

<!-- Numeric: IBM Plex Mono -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet">
```

**다이나믹 서브셋**(한글 자주 쓰는 글자만 쪼개서 로드) — 초기 로딩이 문제될 때 전환한다.

```css
@import url('https://cdn.jsdelivr.net/gh/fonts-archive/Paperlogy/subsets/Paperlogy-dynamic-subset.css');
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css');
```

> fonts-archive는 공식 배포처가 아니라 제3자 아카이브다. 프로덕션 전환 시 파일 해시를 원 배포처 버전과 대조하거나, 아래 2-2 방식으로 원 배포처에서 직접 받은 파일을 자체 호스팅할 것.

### 2-2. 대안: 파일 자체 호스팅 (라이선스 사본 필수)

저장소에 폰트 파일을 동봉하는 경우 **OFL이 저작권 고지와 라이선스 전문의 동반 배포를 요구**한다. 이 폴더의 `SIL-OFL-1.1.txt`가 OFL 본문이며, **각 폰트 고유의 저작권 고지문은 원 배포처에서 받아 붙여야 한다** (파일 상단 안내 참조).

### 2-3. CSS 적용

```css
:root{
  --font-display: 'Paperlogy', 'Pretendard', -apple-system, sans-serif;
  --font-body: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif;
  --font-numeric: 'IBM Plex Mono', ui-monospace, monospace;
}
.num { font-family: var(--font-numeric); font-variant-numeric: tabular-nums; }
```

Numeric에 `font-variant-numeric: tabular-nums`를 반드시 붙인다 — 랭킹 레이스 바와 티커에서 자릿수가 흔들리면 "스코어보드" 감성이 깨진다.

---

## 3. 이 폴더에 동봉된 파일

```
fonts/
├── README.md                  이 문서
├── SIL-OFL-1.1.txt            OFL 1.1 전문 + 저작권 고지 안내
├── paperlogy/
│   ├── Paperlogy-4Regular.woff2      웹용 (400)
│   ├── Paperlogy-6SemiBold.woff2     웹용 (600)
│   ├── Paperlogy-7Bold.woff2         웹용 (700)
│   ├── Paperlogy-8ExtraBold.woff2    웹용 (800)
│   ├── Paperlogy-7Bold.otf           피그마·데스크톱 설치용
│   └── Paperlogy-8ExtraBold.otf      피그마·데스크톱 설치용
└── gmarketsans/
    ├── GmarketSansMedium.woff2       웹용 (500)
    ├── GmarketSansBold.woff2         웹용 (700)
    └── GmarketSansBold.otf           피그마·데스크톱 설치용
```

받은 곳: [fonts-archive/Paperlogy](https://github.com/fonts-archive/Paperlogy) · [fonts-archive/GmarketSans](https://github.com/fonts-archive/GmarketSans) (둘 다 OFL, 2026-07-31 clone)

**피그마 작업 전 준비**: `paperlogy/*.otf`(또는 `gmarketsans/*.otf`)를 로컬에 설치하면 피그마 데스크톱 앱에서 바로 잡힌다. 피그마 웹에서는 Font Helper가 필요하다.

Pretendard와 IBM Plex Mono는 파일을 동봉하지 않았다 — 둘 다 CDN이 안정적이고 용량이 크기 때문이다. 로컬 설치가 필요하면 [Pretendard Releases](https://github.com/orioncactus/pretendard/releases)와 [IBM/plex](https://github.com/IBM/plex)에서 받는다.

---

## 4. 확정 전 체크리스트

- [ ] Display 서체 결정 (Paperlogy 권고 — §1-3)
- [ ] 결정된 서체의 원 배포처에서 저작권 고지문 확보 → `SIL-OFL-1.1.txt` 상단에 반영
- [ ] 미선택 서체 폴더 삭제
- [ ] `app/src/theme/tokens.ts`에 font-family 토큰 추가 (raw 값 하드코딩 금지 — CLAUDE.md 절대규칙 3)
- [ ] 실기기에서 초기 로딩 측정 → 필요 시 다이나믹 서브셋으로 전환
