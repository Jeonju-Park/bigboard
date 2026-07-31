#!/usr/bin/env node
/**
 * qr.mjs — 배포 URL 을 휴대폰에서 열기 쉽게 QR 로 보여준다.
 *
 * 사용: node scripts/qr.mjs https://<사용자>.github.io/<저장소>/
 *
 * QR 인코더를 직접 구현하면 300줄이 넘고 이 프로젝트의 본질과 무관하므로,
 * 시스템에 있는 qrencode 를 쓰고 없으면 설치 방법과 URL 을 안내한다.
 * (의존성 0 원칙을 지키면서 정직하게 처리하는 쪽을 택했다)
 */
import { execFileSync } from 'node:child_process'

const url = process.argv[2]
if (!url) {
  console.error('사용법: node scripts/qr.mjs <배포 URL>')
  process.exit(1)
}

try {
  const out = execFileSync('qrencode', ['-t', 'ANSIUTF8', url], { encoding: 'utf8' })
  console.log(out)
  console.log(`  ${url}\n`)
  console.log('  휴대폰 카메라로 위 코드를 비추세요.\n')
} catch {
  console.log(`
  QR 생성 도구(qrencode)가 없습니다.

  설치하려면:  brew install qrencode
  그 다음:     node scripts/qr.mjs ${url}

  설치 없이 열려면 휴대폰 브라우저에 직접 입력하세요:

    ${url}
`)
}
