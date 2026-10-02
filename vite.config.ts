import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import { aiApiPlugin } from './server/vitePluginAi.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // POST /api/ai during `npm run dev`. The '' prefix loads every .env
    // variable for the server only; the browser only ever sees VITE_ ones.
    aiApiPlugin(loadEnv(mode, process.cwd(), '').ANTHROPIC_API_KEY),
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
}))
