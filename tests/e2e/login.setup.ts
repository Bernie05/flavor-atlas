import { expect, test as setup } from '@playwright/test'
import { ADMIN_STATE } from './paths.ts'

// Runs once before the tests: logs in with this run's password and keeps the cookie.
setup('log in as the admin', async ({ page }) => {
  await page.goto('/admin/login')
  await page.getByLabel('Username').fill(process.env.E2E_USERNAME!)
  await page.getByLabel('Password').fill(process.env.E2E_PASSWORD!)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByRole('heading', { level: 1, name: /kitchen/i })).toBeVisible()
  await page.context().storageState({ path: ADMIN_STATE })
})
