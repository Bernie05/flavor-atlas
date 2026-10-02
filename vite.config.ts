import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { defineConfig } from 'vitest/config'
import { apiPlugin } from './server/vitePluginApi.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // '' loads every .env variable, for the server only; the browser only ever sees VITE_ ones.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    // The phone demo is served from an unknown path, so it loads bundled photos relative to the page.
    base: mode === 'demo' ? './' : '/',
    plugins: [
      react(),
      tailwindcss(),
      // /api/auth, /api/data (json-server behind the auth gateway) and /api/ai during `npm run dev`.
      apiPlugin(env),
      // The demo build inlines all JS and CSS into one index.html,
      // so it can be hosted anywhere as a single file.
      mode === 'demo' && viteSingleFile(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    test: {
      environment: 'node',
    },
  }
})
