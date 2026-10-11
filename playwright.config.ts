import { randomBytes } from 'node:crypto'
import { copyFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig, devices } from '@playwright/test'
import { hashPassword } from './server/auth/password.ts'

const PORT = 5199

// Each run starts from the seed, in a throwaway database with its own admin
// password, so tests never touch your db.json or .env. Playwright loads this
// file again in every worker: the first load decides, the rest inherit the
// values through the environment.
if (!process.env.E2E_DATA_FILE) {
  const file = join(mkdtempSync(join(tmpdir(), 'flavor-atlas-e2e-')), 'db.json')
  copyFileSync('db.seed.json', file)
  process.env.E2E_DATA_FILE = file
  process.env.E2E_PASSWORD = randomBytes(18).toString('base64url')
  process.env.E2E_PASSWORD_HASH = hashPassword(process.env.E2E_PASSWORD)
  process.env.E2E_SESSION_SECRET = randomBytes(32).toString('base64url')
}

export default defineConfig({
  testDir: 'tests/e2e',
  // *.e2e.ts, so Vitest (which runs *.test.ts) never picks these up.
  testMatch: '*.e2e.ts',
  // One server and one database for the run: tests change shared data, so they run one at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // No retries: a test that passes on its second try is hiding a bug, and these share one database.
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Logs in once and saves the session: the server allows 5 logins a minute, and tests shouldn't spend them.
    { name: 'login', testMatch: 'login.setup.ts' },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['login'],
    },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    // Server-only values, read by vite.config.ts's loadEnv (process.env wins over .env).
    env: {
      ADMIN_PASSWORD_HASH: process.env.E2E_PASSWORD_HASH!,
      SESSION_SECRET: process.env.E2E_SESSION_SECRET!,
      DATA_FILE: process.env.E2E_DATA_FILE!,
      VITE_API_URL: '/api/data',
      VITE_DATA_SOURCE: 'http',
      ANTHROPIC_API_KEY: '',
    },
  },
})
