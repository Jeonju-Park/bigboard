import styles from './App.module.css'
import { coral } from './theme/tokens'

/**
 * STEP 0 스모크 화면.
 * 확인 목적: ①3서체가 실제로 로드되는가 ②CSS 변수가 :root 에 주입됐는가
 * ③480px 셸이 중앙 정렬되고 바깥이 bg-secondary 인가.
 * STEP 1 에서 라우팅 뼈대로 통째로 교체된다.
 */
export default function App() {
  return (
    <div className="app-shell">
      <main className={`${styles.smoke} gutter`}>
        <section className={styles.group}>
          <p className="ty-caption">L1 display — Paperlogy 800 · 화면당 1회 이하</p>
          <h1 className="ty-display" style={{ margin: 0 }}>
            빅보드
          </h1>
          <h2 className="ty-title" style={{ margin: 0 }}>
            L1 title — Pretendard 700
          </h2>
          <h3 className="ty-title-s" style={{ margin: 0 }}>
            L2 섹션 제목 — titleS / 600
          </h3>
          <p className="ty-body" style={{ margin: 0 }}>
            L3 본문 — 내부자·고위공직자 거래 공시를 모아 보여주는 정보 서비스입니다.
          </p>
          <p className="ty-caption" style={{ margin: 0 }}>
            L4 보조 설명 — 데이터 출처는 DART 전자공시시스템입니다.
          </p>
          <p className="ty-micro" style={{ margin: 0 }}>
            L5 위트 자막 — 여기서만 농담이 허용됩니다
          </p>
        </section>

        <hr className={styles.divider} />

        <section className={styles.group}>
          <p className="ty-caption">Numeric — IBM Plex Mono tabular</p>
          <p className="ty-num" style={{ margin: 0, fontSize: 'var(--size-body)' }}>
            1,234,567,890 / 0011223344
          </p>
          <p className="ty-promote-label" style={{ margin: 0 }}>
            총 거래금액
          </p>
          <p className="ty-promote" style={{ margin: 0 }}>
            1,482,300,000
          </p>
        </section>

        <hr className={styles.divider} />

        <section className={styles.group}>
          <p className="ty-caption">Coral Scale — 면 전용 (§2)</p>
          <div className={styles.swatches}>
            {Object.entries(coral).map(([step, hex]) => (
              <div
                key={step}
                className={styles.swatch}
                style={{ background: `var(--coral-${step})` }}
                title={`coral-${step} ${hex}`}
              />
            ))}
          </div>
          <div className={styles.brandSurface}>
            <p className="ty-label" style={{ margin: 0 }}>
              브랜드 면 위에는 ink 만 얹습니다
            </p>
            <p className="ty-caption" style={{ margin: 0, color: 'var(--gray-700)' }}>
              흰 글자는 대비 2.68 이라 금지입니다
            </p>
          </div>
        </section>

        <hr className={styles.divider} />

        <section className={styles.group}>
          <p className="ty-caption">Material Symbols Rounded — 이모지 대체 (§6)</p>
          <div className={styles.icons}>
            <span className="msr" aria-hidden="true">
              radar
            </span>
            <span className="msr" aria-hidden="true">
              trending_up
            </span>
            <span className="msr" data-size="20" aria-hidden="true">
              calendar_month
            </span>
            <span className="msr" data-size="20" aria-hidden="true">
              leaderboard
            </span>
          </div>
        </section>

        <p className="ty-caption" style={{ margin: 0 }}>
          이 서비스는 투자자문·투자권유가 아니며, 공개된 공시 정보를 정리해 보여줍니다.
        </p>
      </main>
    </div>
  )
}
