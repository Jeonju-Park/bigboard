/**
 * house.ts — 미 하원의원 주식 거래 (STOCK Act 정기거래보고서, PTR) 수집
 *            → app/public/data/us/disclosures.json 에 합류
 *
 * 실행: npm --prefix pipeline run house
 *       npm --prefix pipeline run house -- --year 2025
 *       npm --prefix pipeline run house -- --limit 30     (빠른 확인용)
 *
 * 소스: https://disclosures-clerk.house.gov/public_disc/financial-pdfs/{YEAR}FD.zip
 *   ZIP 안의 XML 은 **색인일 뿐**이다 (이름·주/선거구·제출일·DocID).
 *   실제 거래는 PTR PDF 안에 있고, 다행히 텍스트 PDF 라 파싱된다.
 *   (공직자 재산공개 관보 PDF 는 이미지라 못 했는데, 이건 된다)
 *
 * ⚠️ 이 데이터의 성격 — 화면이 반드시 말해야 하는 것
 *
 *   1) **금액이 구간이다.** 의원은 정확한 금액을 신고하지 않고 11개 구간 중
 *      하나를 고른다. "$1,001 - $15,000" 이 원문 그대로다.
 *      중간값으로 바꿔 단일 숫자처럼 보이게 하면 거짓이므로 구간을 그대로 들고 간다.
 *   2) **주식 수가 없다.** 몇 주인지는 아예 신고 대상이 아니다 → quantity = null
 *   3) **본인 거래가 아닐 수 있다.** SP(배우자)·DC(자녀)·JT(공동) 표시가 붙는다.
 *      배우자 거래를 의원 본인 거래로 쓰면 실명 데이터에서 명백한 오보다.
 *   4) **신고가 늦다.** 법정 기한이 거래 후 30~45일이라 시차가 크다.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { extractText, getDocumentProxy } from 'unpdf'
import { derivePersons, deriveRankings, deriveStocks } from './derive.ts'
import { daysBetween, normalizeDate, sleep } from './sec.ts'
import type { AmountRange, Disclosure, Meta, OwnerType } from './types.ts'

const OUT_DIR = join(import.meta.dirname, '..', '..', 'app', 'public', 'data', 'us')
const UA = 'bigboard/0.1 (jjsa6316@ajou.ac.kr)'

const argv = process.argv.slice(2)
const year = Number(argv[argv.indexOf('--year') + 1]) || new Date().getUTCFullYear()
const limit = Number(argv[argv.indexOf('--limit') + 1]) || Infinity

const skipped = { total: 0, reasons: {} as Record<string, number> }
function skip(reason: string, n = 1) {
  skipped.total += n
  skipped.reasons[reason] = (skipped.reasons[reason] ?? 0) + n
}

// ── 색인 (ZIP 안의 XML) ──────────────────────────────────────────────────────

interface Filing {
  docId: string
  first: string
  last: string
  /** 주+선거구 (예: VA01) */
  stateDst: string
  filedAt: string
}

/**
 * ZIP 을 자체 해제한다. dart.ts 의 unzip 은 DART 전용 가정이 섞여 있어
 * 여기서는 단순 저장/deflate 만 다루는 최소 구현을 쓴다.
 */
async function readZipEntry(buf: Uint8Array, wantSuffix: string): Promise<string | null> {
  const { inflateRawSync } = await import('node:zlib')
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  // 로컬 파일 헤더 시그니처를 훑는다
  for (let i = 0; i + 30 < buf.length; i++) {
    if (dv.getUint32(i, true) !== 0x04034b50) continue
    const method = dv.getUint16(i + 8, true)
    const compSize = dv.getUint32(i + 18, true)
    const nameLen = dv.getUint16(i + 26, true)
    const extraLen = dv.getUint16(i + 28, true)
    const name = new TextDecoder().decode(buf.subarray(i + 30, i + 30 + nameLen))
    const dataStart = i + 30 + nameLen + extraLen
    if (!name.toLowerCase().endsWith(wantSuffix)) continue
    const data = buf.subarray(dataStart, dataStart + compSize)
    const out = method === 0 ? data : inflateRawSync(data)
    return new TextDecoder('utf-8').decode(out)
  }
  return null
}

async function loadIndex(): Promise<Filing[]> {
  const url = `https://disclosures-clerk.house.gov/public_disc/financial-pdfs/${year}FD.zip`
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60_000) })
  if (!res.ok) throw new Error(`색인 ZIP 다운로드 실패 HTTP ${res.status} — ${url}`)
  const xml = await readZipEntry(new Uint8Array(await res.arrayBuffer()), '.xml')
  if (!xml) throw new Error('ZIP 안에서 XML 색인을 찾지 못했습니다')

  const out: Filing[] = []
  for (const m of xml.matchAll(/<Member>([\s\S]*?)<\/Member>/g)) {
    const g = (t: string) => new RegExp(`<${t}>([^<]*)</${t}>`).exec(m[1]!)?.[1]?.trim() ?? ''
    // FilingType P = Periodic Transaction Report. 나머지(연차보고서·수정 등)는 거래 내역이 아니다
    if (g('FilingType') !== 'P') continue
    const filedAt = toIso(g('FilingDate'))
    if (!g('DocID') || !filedAt) continue
    out.push({
      docId: g('DocID'),
      first: g('First'),
      last: g('Last'),
      stateDst: g('StateDst'),
      filedAt,
    })
  }
  return out
}

/** 'M/D/YYYY' → 'YYYY-MM-DD' */
function toIso(v: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v.trim())
  if (!m) return normalizeDate(v)
  return `${m[3]}-${m[1]!.padStart(2, '0')}-${m[2]!.padStart(2, '0')}`
}

// ── PTR PDF 파싱 ─────────────────────────────────────────────────────────────

/**
 * PTR 텍스트를 **줄 단위**로 읽는다.
 *
 * 처음엔 공백을 전부 눌러 한 줄로 편 뒤 정규식으로 훑었는데, 자산명 자리에
 * 앞 행의 각주가 딸려 들어왔다 ("Gains 200 SP Intuit Inc.", "S O LIVTR Taiwan Semi...").
 * 원문은 사실 아주 규칙적인 줄 구조라 그대로 읽는 편이 훨씬 정확하다:
 *
 *   SP Intuit Inc. - Common Stock (INTU)   ← 자산명 (여러 줄일 수 있음)
 *   [ST]                                    ← 자산 종류
 *   S 06/10/2026 07/07/2026 $15,001 - $50,000
 *   F      S     : New                      ← 각주 (소문자 대문자 폰트라 글자가 빠진다)
 *   S          O : LIVTR
 *
 * 그래서 각주·머리말 줄을 만나면 이름 버퍼를 비우고, 거래 줄을 만나면 확정한다.
 */

/** 거래 줄 — 코드 + 거래일 + 통지일 + 금액 구간 */
const TXN_LINE =
  /^([A-Z])\s*(?:\(partial\))?\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+\$([\d,]+)\s*(?:-\s*\$?([\d,]+))?/

/** 자산 종류 줄 (`[ST]`). 자산명 줄 끝에 붙어 오기도 한다 */
const ASSET_TYPE = /\[([A-Z]{2})\]/

/** 각주·머리말 — 만나면 자산명 버퍼를 버린다 */
const NOISE_LINE =
  /^(F\s|S\s+O|D\s+:|\*|I\s|C\s|Digitally|ID Owner|Filing ID|P\s+T\s+R|Clerk of|Name:|Status:|State\/District:|T\s*$|Yes No|L\s+:|Cap\.|Gains|\$200\?)/

/** 우리가 다루는 자산 종류 — 주식과 옵션만. 펀드·국채는 '종목'이 아니다 */
const WANTED_ASSETS = new Set(['ST', 'OP'])

const OWNER_MAP: Record<string, OwnerType> = { SP: 'spouse', DC: 'child', JT: 'joint' }

interface ParsedTxn {
  ticker: string
  assetType: string
  code: string
  tradeDate: string
  notifyDate: string
  range: AmountRange
  assetName: string
  ownerType: OwnerType
}

function parsePtr(text: string): { txns: ParsedTxn[]; reasons: Record<string, number> } {
  const reasons: Record<string, number> = {}
  const bump = (k: string) => {
    reasons[k] = (reasons[k] ?? 0) + 1
  }
  const txns: ParsedTxn[] = []

  const lines = text
    .split(/\r?\n/)
    // ⚠️ 각주 제목이 작은대문자(small caps) 폰트라 빠진 글리프가 **NUL(U+0000)** 로 나온다.
    //    "Filing Status" 가 "F\0\0\0\0\0 S\0\0\0\0\0: New" 이 되는데, `\s` 는 NUL 을 공백으로
    //    보지 않으므로 각주 판별과 공백 정규화가 둘 다 조용히 실패한다.
    //    실제로 이것 때문에 자산명에 "F S : New S O : LIVTR" 같은 각주가 딸려 들어왔다.
    .map((l) => l.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  /** 자산명 후보 줄들 */
  let nameBuf: string[] = []
  let assetType: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    const txnMatch = TXN_LINE.exec(line)
    if (txnMatch) {
      const [, code, tradeRaw, notifyRaw, minRaw, maxRaw] = txnMatch
      const raw = nameBuf.join(' ').trim()
      nameBuf = []
      const type = assetType
      assetType = null

      if (!type) {
        bump('자산 종류 표시 없음')
        continue
      }
      if (!WANTED_ASSETS.has(type)) {
        bump(`자산 종류 ${type}`)
        continue
      }
      // P 매수 / S 매도 / E 교환. 교환은 방향이 없어 다루지 않는다
      if (code !== 'P' && code !== 'S') {
        bump(`거래 코드 ${code}`)
        continue
      }
      const ticker = /\(([A-Z][A-Z0-9.\-]{0,6})\)\s*$/.exec(raw.replace(ASSET_TYPE, '').trim())?.[1]
      if (!ticker) {
        // 티커 없는 자산(사모·부동산 등)은 종목 화면으로 연결할 수 없다
        bump('티커 없음')
        continue
      }
      const tradeDate = toIso(tradeRaw!)
      const notifyDate = toIso(notifyRaw!)
      if (!tradeDate || !notifyDate) {
        bump('날짜 파싱 실패')
        continue
      }

      // 소유자 표시는 자산명 **맨 앞** 토큰이다
      const ownerMatch = /^(SP|DC|JT)\s+/.exec(raw)
      const ownerType = ownerMatch ? OWNER_MAP[ownerMatch[1]!]! : 'self'

      const assetName = raw
        .replace(/^(SP|DC|JT)\s+/, '')
        .replace(ASSET_TYPE, '')
        .replace(/\s*\([A-Z][A-Z0-9.\-]{0,6}\)\s*$/, '')
        .replace(/\s+/g, ' ')
        .trim()

      const min = Number(minRaw!.replace(/,/g, ''))
      // maxRaw 가 없으면 "$50,000,000 +" 형태 = 상한 없음.
      // 다만 금액이 줄을 넘어가는 경우가 있어 다음 줄에서 한 번 더 찾는다
      let max: number | null = maxRaw ? Number(maxRaw.replace(/,/g, '')) : null
      if (max === null && /-\s*$/.test(line)) {
        const cont = /^\$?([\d,]+)/.exec(lines[i + 1] ?? '')
        if (cont) {
          max = Number(cont[1]!.replace(/,/g, ''))
          i++
        }
      }
      if (!Number.isFinite(min)) {
        bump('금액 구간 파싱 실패')
        continue
      }

      txns.push({
        ticker,
        assetType: type,
        code,
        tradeDate,
        notifyDate,
        range: { min, max },
        assetName: assetName || ticker,
        ownerType,
      })
      continue
    }

    if (NOISE_LINE.test(line)) {
      nameBuf = []
      assetType = null
      continue
    }

    const typeMatch = ASSET_TYPE.exec(line)
    if (typeMatch) {
      assetType = typeMatch[1]!
      // `[ST]` 가 자산명 줄 끝에 붙어 오는 경우가 있어 남은 부분은 이름으로 살린다
      const rest = line.replace(ASSET_TYPE, '').trim()
      if (rest) nameBuf.push(rest)
      continue
    }

    nameBuf.push(line)
    // 자산명이 6줄을 넘을 리 없다. 폭주하면 앞부분을 버린다
    if (nameBuf.length > 6) nameBuf.shift()
  }

  return { txns, reasons }
}

async function fetchPtrText(docId: string): Promise<string | null> {
  const url = `https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/${year}/${docId}.pdf`
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(45_000) })
  if (!res.ok) return null
  const pdf = await getDocumentProxy(new Uint8Array(await res.arrayBuffer()))
  const { text } = await extractText(pdf, { mergePages: true })
  return text
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n미 하원 PTR 수집 — ${year}년\n`)

  const index = await loadIndex()
  console.log(`색인 PTR ${index.length}건`)

  // 이미 처리한 DocID 는 다시 받지 않는다 (매일 도는 워크플로에서 중요)
  const existingPath = join(OUT_DIR, 'disclosures.json')
  let existing: Disclosure[] = []
  try {
    existing = JSON.parse(readFileSync(existingPath, 'utf8')) as Disclosure[]
  } catch {
    // 첫 실행
  }
  const doneDocs = new Set(
    existing.filter((d) => d.id.startsWith('house-')).map((d) => d.id.split('-')[1]),
  )
  const todo = index.filter((f) => !doneDocs.has(f.docId)).slice(0, limit)
  console.log(`이미 처리 ${doneDocs.size}건 · 이번에 받을 ${todo.length}건\n`)

  const fresh: Disclosure[] = []
  let noText = 0
  let done = 0

  for (const f of todo) {
    done++
    if (done % 25 === 0) console.log(`  ${done}/${todo.length} …`)
    let text: string | null
    try {
      text = await fetchPtrText(f.docId)
    } catch (e) {
      skip('PDF 처리 실패')
      continue
    }
    // 하원 부담을 줄인다. 공개 문서지만 초당 수십 건을 받을 이유가 없다
    await sleep(120)

    if (!text || text.trim().length < 40) {
      // 스캔 이미지로 제출된 PTR 이 실제로 있다 (텍스트 레이어 없음).
      // OCR 은 하지 않는다 — 실명 데이터에 추측을 섞지 않는다
      noText++
      continue
    }

    const { txns, reasons } = parsePtr(text)
    for (const [k, v] of Object.entries(reasons)) skip(k, v)
    if (!txns.length) {
      skip('주식·옵션 거래 없음')
      continue
    }

    const person = `${f.first} ${f.last}`.replace(/\s+/g, ' ').trim()
    txns.forEach((t, i) => {
      // PTR 은 **이미 일어난** 거래를 알리는 문서다. 거래일이 신고일보다 뒤면 오타다.
      // 실제로 2건 있었다 (2026-12-26 거래를 2026-02-09 에 신고 → 2025년 오기로 보인다).
      // 그대로 두면 지연일이 음수가 되고, 미래 날짜라 피드 맨 위를 차지한다.
      // 국장에서 변동일에 2030년이 섞였던 것과 같은 종류의 문제라 같은 규칙으로 막는다.
      if (t.tradeDate > f.filedAt) {
        skip('거래일이 신고일보다 뒤 (제출자 오타 의심)')
        return
      }
      fresh.push({
        // 한 PTR 안의 여러 거래를 구분한다
        id: `house-${f.docId}-${i}`,
        personName: person,
        personType: 'politician',
        title: `하원의원 · ${f.stateDst}`,
        company: t.assetName,
        stockCode: t.ticker,
        direction: t.code === 'P' ? 'buy' : 'sell',
        // 의회 신고는 단가·주식수·보유량을 공개하지 않는다. 지어내지 않고 null 로 둔다
        unitPrice: null,
        quantity: null,
        totalAmount: null,
        tradeDate: t.tradeDate,
        discloseDate: f.filedAt,
        reportReason: t.assetType === 'OP' ? '옵션 거래' : '주식 거래',
        isPlanned: false,
        dDay: null,
        holdingBefore: null,
        holdingAfter: null,
        details: [],
        sourceUrl: `https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/${year}/${f.docId}.pdf`,
        isAmended: false,
        amountRange: t.range,
        ownerType: t.ownerType,
        transactionCode: t.code,
        assetType: t.assetType,
        filingLagDays: daysBetween(t.tradeDate, f.filedAt),
      })
    })
  }

  if (noText) skip('PDF 에 텍스트 없음 (스캔 제출)', noText)

  // 기존 데이터와 합친다
  const byId = new Map(existing.map((d) => [d.id, d]))
  fresh.forEach((d) => byId.set(d.id, d))
  const merged = [...byId.values()].sort((a, b) =>
    b.discloseDate === a.discloseDate
      ? b.id.localeCompare(a.id)
      : b.discloseDate.localeCompare(a.discloseDate),
  )

  mkdirSync(OUT_DIR, { recursive: true })
  const write = (name: string, data: unknown) =>
    writeFileSync(join(OUT_DIR, name), JSON.stringify(data, null, 1) + '\n', 'utf8')

  write('disclosures.json', merged)
  const persons = derivePersons(merged)
  write('persons.json', persons)
  write('rankings.json', deriveRankings(merged))

  // 종목은 시세를 보존하며 갱신
  const stocks = deriveStocks(merged)
  let mergedStocks = stocks
  try {
    const prev = JSON.parse(readFileSync(join(OUT_DIR, 'stocks.json'), 'utf8')) as typeof stocks
    const prevByCode = new Map(prev.map((s) => [s.code, s]))
    mergedStocks = stocks.map((s) => {
      const p = prevByCode.get(s.code)
      return p ? { ...p, name: s.name } : s
    })
  } catch {
    // 첫 실행
  }
  write('stocks.json', mergedStocks)

  try {
    const meta: Meta = JSON.parse(readFileSync(join(OUT_DIR, 'meta.json'), 'utf8'))
    const src = '미 하원 사무처(Clerk of the House) — STOCK Act 정기거래보고서(PTR)'
    if (!meta.sources.includes(src)) meta.sources.push(src)
    meta.counts = {
      disclosures: merged.length,
      persons: persons.length,
      stocks: mergedStocks.length,
    }
    meta.skipped = {
      total: meta.skipped.total + skipped.total,
      reasons: { ...meta.skipped.reasons, ...skipped.reasons },
    }
    meta.lastUpdated = new Date().toISOString()
    write('meta.json', meta)
  } catch {
    console.log('  meta.json 이 없습니다 — form4 를 먼저 돌리세요')
  }

  const politicians = merged.filter((d) => d.personType === 'politician')
  const byOwner = politicians.reduce<Record<string, number>>((m, d) => {
    const k = d.ownerType ?? 'self'
    m[k] = (m[k] ?? 0) + 1
    return m
  }, {})
  const lags = politicians.map((d) => d.filingLagDays).filter((v): v is number => v !== null)

  console.log(`\n─── 결과 ───`)
  console.log(`이번 수집 ${fresh.length}건 · 의원 거래 누적 ${politicians.length}건`)
  console.log(`의원 ${new Set(politicians.map((d) => d.personName)).size}명 · 종목 ${new Set(politicians.map((d) => d.stockCode)).size}개`)
  console.log(`매수 ${politicians.filter((d) => d.direction === 'buy').length} · 매도 ${politicians.filter((d) => d.direction === 'sell').length}`)
  console.log(`계좌 주체: ${Object.entries(byOwner).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
  if (lags.length) {
    const s = [...lags].sort((a, b) => a - b)
    console.log(`거래→신고 지연: 중앙값 ${s[Math.floor(s.length / 2)]}일 · 최대 ${s.at(-1)}일 (법정 기한 30~45일)`)
  }
  if (skipped.total) {
    console.log(`\n건너뜀 ${skipped.total}건`)
    Object.entries(skipped.reasons)
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => console.log(`  ${String(v).padStart(5)}  ${k}`))
  }
  console.log(`\n⚠️ 금액은 **구간**입니다. 의원은 정확한 금액을 신고하지 않습니다.`)
  console.log(`   주식 수·보유량도 신고 대상이 아니라 없습니다.`)
}

await main()
