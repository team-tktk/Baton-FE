import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const insecureLocalSession = process.env.VITE_INSECURE_LOCAL_SESSION === 'true'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // 마스킹처럼 운영에서 꺼 둔 기능을 확인할 때는 로컬 백엔드로 돌린다.
      // 예) VITE_API_PROXY_TARGET=http://localhost:8080 npm run dev
      '/api': {
        changeOrigin: true,
        target: process.env.VITE_API_PROXY_TARGET ?? 'https://3-37-128-127.nip.io',
        // 운영 서버의 Secure 세션 쿠키는 HTTP localhost에 저장되지 않는다.
        // 서버 설정을 바꾸지 않고 로컬에서 운영 백엔드를 점검할 때만 명시적으로 켠다.
        configure: insecureLocalSession
          ? (proxy) => proxy.on('proxyRes', (proxyResponse) => {
            const cookies = proxyResponse.headers['set-cookie']
            if (cookies) proxyResponse.headers['set-cookie'] = cookies.map((cookie) => cookie.replace(/;\s*Secure/gi, ''))
          })
          : undefined,
      },
    },
  },
  test: {
    environment: 'jsdom',
    testTimeout: 15_000,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
