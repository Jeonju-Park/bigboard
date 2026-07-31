import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 상대 경로 — GitHub Pages 의 /<저장소명>/ 하위 배포에서도 그대로 동작한다.
  // HashRouter 를 쓰므로 라우팅은 base 와 무관하다. (STEP 6에서 재확인)
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
})
