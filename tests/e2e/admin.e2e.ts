import { expect, test, type Page } from '@playwright/test'
import { ADMIN_STATE } from './paths.ts'

// Logged in once by login.setup.ts; every test here starts with that session.
test.use({ storageState: ADMIN_STATE })

const adminTab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name, exact: true })
const recentChanges = (page: Page) => page.getByRole('region', { name: 'Recent changes' })
const flash = (page: Page, text: RegExp) => page.getByRole('status').filter({ hasText: text })

/** A name no earlier run (or retry) has used, so tests never trip over each other's data. */
const unique = (name: string) => `${name} ${Date.now().toString(36)}`

async function addDish(page: Page, cuisine: string, name: string) {
  await page.goto('/admin/dishes')
  await page.getByRole('link', { name: `+ New dish in ${cuisine}` }).click()
  await page.getByLabel('Name', { exact: true }).fill(name)
  await page.getByRole('button', { name: 'Add dish' }).click()
  await expect(page.getByText(`Saved ${name}`)).toBeVisible()
}

test('each admin page change moves focus to the new heading', async ({ page }) => {
  await page.goto('/admin')
  for (const [tab, heading] of [
    ['Recipes', 'Recipes'],
    ['Dishes', 'Dishes & regions'],
    ['Reviews', 'Reviews'],
  ]) {
    await adminTab(page, tab!).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeFocused()
  }
})

test('merging a dish moves its versions, redirects its old link and can be undone from the history', async ({ page }) => {
  const target = unique('Humba')
  await addDish(page, 'Filipino', target)

  await page.getByRole('button', { name: 'Merge Adobo', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Merge Adobo' })
  await dialog.getByLabel('Merge into').selectOption({ label: target })
  await expect(dialog.getByText(`${target} will have 4 versions.`)).toBeVisible()
  await dialog.getByRole('button', { name: `Merge into ${target}` }).click()
  await expect(flash(page, /Merged Adobo into/)).toBeVisible()

  // The old address leads to the dish it's part of now, and says so.
  await page.goto('/dishes/adobo')
  await expect(page.getByRole('heading', { level: 1, name: target })).toBeVisible()
  await expect(page.getByText(`Adobo is now part of ${target}`)).toBeVisible()

  // The dashboard lists it, with Undo.
  await page.goto('/admin')
  const entry = recentChanges(page).getByRole('listitem').filter({ hasText: `Merged Adobo into ${target}` })
  await entry.getByRole('button', { name: /^Undo/ }).click()
  await expect(recentChanges(page).getByRole('status')).toHaveText('Undone: Adobo is back, with its 4 versions.')
  await expect(entry).toContainText('undone')
  await expect(entry.getByRole('button', { name: /^Undo/ })).toHaveCount(0)

  // Adobo is back with its versions, regional ones included.
  await page.goto('/dishes/adobo')
  await expect(page.getByRole('heading', { level: 1, name: 'Adobo' })).toBeVisible()
  await expect(page.getByText('4 versions · 3 from a particular place')).toBeVisible()
})

test('moving a recipe to another cuisine clears its region, and Undo brings it back', async ({ page }) => {
  await page.goto('/admin/recipes')
  await page.getByLabel('Search recipes').fill('Adobong Dilaw')
  await page.getByRole('checkbox', { name: 'Select Adobong Dilaw' }).first().check()
  await page.getByRole('button', { name: 'Move to a dish…' }).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Move to').selectOption({ label: 'Ramen' })
  await expect(dialog.getByText(/lose theirs/)).toContainText('Adobong Dilaw (Batangas)')
  await dialog.getByRole('button', { name: 'Move 1 recipe' }).click()
  await expect(flash(page, /Moved 1 recipe to Ramen/)).toBeVisible()

  await flash(page, /Moved/).getByRole('button', { name: 'Undo' }).click()
  await expect(flash(page, /Undone/)).toHaveText(/Adobong Dilaw is back where it was/)

  const recipes = await (await page.request.get('/api/data/recipes')).json()
  const dilaw = recipes.find((recipe: { title: string }) => recipe.title === 'Adobong Dilaw')
  expect(dilaw).toMatchObject({ cuisineId: 'filipino', regionId: 'batangas' })
})

test('the recipe list sorts and pages, and its address keeps both', async ({ page }) => {
  await page.goto('/admin/recipes?sort=name&page=2')
  await expect(page.getByLabel('Sort recipes')).toHaveValue('name')
  await expect(page.getByText(/^Showing 13–24 of \d+/)).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Pages' }).getByRole('link', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page')

  await page.getByRole('navigation', { name: 'Pages' }).getByRole('link', { name: 'Page 1' }).click()
  await expect(page).toHaveURL(/\?sort=name$/)
  await expect(page.getByText(/^Showing 1–12 of/)).toBeFocused()

  // A new sort starts again from page 1; Back returns to the page before.
  await page.getByRole('navigation', { name: 'Pages' }).getByRole('link', { name: 'Next' }).click()
  await page.getByLabel('Sort recipes').selectOption('lowest-rated')
  await expect(page).toHaveURL(/\?sort=lowest-rated$/)
})

test("a dish its recipes still use can't be deleted, and the dialog says where they are", async ({ page }) => {
  await page.goto('/admin/dishes')
  await page.getByRole('button', { name: 'Delete Sinigang', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Sinigang still has recipes' })
  await expect(dialog.getByRole('button', { name: /Delete/ })).toHaveCount(0)
  await dialog.getByRole('link', { name: 'See its recipes to move them' }).click()
  await expect(page.getByText('Only versions of Sinigang')).toBeVisible()
})

test('a visitor review shows on the recipe only once the admin approves it', async ({ page, playwright }) => {
  const comment = `Lovely and sour ${Date.now()}`
  const visitor = await playwright.request.newContext({ baseURL: test.info().project.use.baseURL })
  expect((await visitor.post('/api/data/submissions', { data: { recipeId: '1', score: 5, comment, hp_field: '' } })).status()).toBe(201)

  await page.goto('/admin/reviews')
  await page.getByRole('button', { name: new RegExp(`^Approve .*${comment}`) }).click()
  await expect(page.getByText(/It's on the recipe now/)).toBeVisible()

  const publicRecipe = await (await visitor.get('/api/data/recipes/1?_embed=ratings')).text()
  expect(publicRecipe).toContain(comment)
  await visitor.dispose()

  // The history names the review, never the reviewer's words.
  await page.goto('/admin')
  const approved = recentChanges(page).getByRole('listitem').filter({ hasText: /^Approved the 5-star review of/ })
  await expect(approved.first()).toBeVisible()
  await expect(recentChanges(page)).not.toContainText(comment)
})

test('the history keeps every recent change, and only drops the oldest past 50', async ({ page }) => {
  const history = async () => (await (await page.request.get('/api/data/activity')).json()) as { summary: string; at: string }[]
  const before = (await history()).length

  // Short of the limit, nothing is dropped: two changes, two more entries.
  const dish = unique('Pinakbet')
  await addDish(page, 'Filipino', dish)
  await page.getByRole('link', { name: `Edit ${dish}` }).click()
  await page.getByLabel('Description').fill('Vegetables with bagoong.')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText(`Saved ${dish}`)).toBeVisible()
  await expect.poll(async () => (await history()).length).toBe(before + 2)

  // Past the limit, the next change trims the history to 50, oldest first.
  for (let i = (await history()).length; i < 55; i++) {
    const at = new Date(Date.UTC(2020, 0, 1, 0, i)).toISOString()
    expect((await page.request.post('/api/data/activity', { data: { kind: 'recipe', summary: `Old change ${i}`, at } })).ok()).toBe(true)
  }
  await page.getByRole('link', { name: `Edit ${dish}` }).click()
  await page.getByLabel('Description').fill('Vegetables with shrimp paste.')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText(`Saved ${dish}`)).toBeVisible()
  await expect.poll(async () => (await history()).length).toBe(50)
  const kept = await history()
  expect(kept.map((entry) => entry.summary)).toContain(`Edited the dish ${dish}`)
  expect(kept.map((entry) => entry.summary)).not.toContain('Old change 0')
})
