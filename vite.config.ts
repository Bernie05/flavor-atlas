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
    build: {
      // Flags stay separate files (fetched only when shown) instead of being inlined into
      // the bundle; the single-file demo inlines everything, so it keeps the default.
      assetsInlineLimit:
        mode === 'demo' ? undefined : (file: string) => (file.includes('flag-icons') ? false : undefined),
      rolldownOptions: {
        output: {
          // Libraries get chunks named after what they hold, instead of after whichever
          // file the bundler met first ("schemas" once held React Router and Zod). They
          // change less often than app code, so browsers keep them cached across deploys.
          // The demo is one file, so it has nothing to split.
          codeSplitting:
            mode === 'demo'
              ? undefined
              : {
                  groups: [
                    { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 3 },
                    { name: 'router', test: /node_modules[\\/]react-router[\\/]/, priority: 2 },
                    { name: 'query', test: /node_modules[\\/]@tanstack[\\/]/, priority: 2 },
                    { name: 'zod', test: /node_modules[\\/]zod[\\/]/, priority: 2 },
                    // Only the admin recipe form uses these, so they stay off public pages.
                    { name: 'forms', test: /node_modules[\\/](react-hook-form|@hookform)[\\/]/, priority: 2 },
                  ],
                },
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    test: {
      environment: 'node',
      // Vitest skips CSS by default, which would hand palette.test.ts an empty
      // index.css?raw. It reads the theme tokens from it to check contrast.
      css: { include: [/src[\\/]index\.css/] },
    },
  }
})
