import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const insecureLocalSession = env.VITE_INSECURE_LOCAL_SESSION === 'true'
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        // 필요하면 로컬 백엔드로 바꾼다. 예) VITE_API_PROXY_TARGET=http://localhost:8080
        '/api': {
          changeOrigin: true,
          target: env.VITE_API_PROXY_TARGET ?? 'https://3-37-128-127.nip.io',
          // 운영 백엔드가 주는 Secure 세션·XSRF 쿠키를 localhost 개발 세션에서만 쓸 수 있게 한다.
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
  }
})
