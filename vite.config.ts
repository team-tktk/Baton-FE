import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

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
