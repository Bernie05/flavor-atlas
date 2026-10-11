import { expect, test } from '@playwright/test'

/**
 * What a visitor (no session) can and can't do. The UI hides admin controls,
 * but the server is the protection, so these go straight at the API too.
 */
test.describe('a visitor', () => {
  test('sees no way into the admin on the public site', async ({ page }) => {
    for (const path of ['/', '/recipes', '/recipes/1']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByRole('link', { name: /admin|log ?in/i })).toHaveCount(0)
    }
  })

  test('cannot log in with the right password under another username', async ({ request }) => {
    const response = await request.post('/api/auth/login', { data: { username: 'admin', password: process.env.E2E_PASSWORD } })
    expect(response.status()).toBe(401)
    expect((await response.json()).message).toBe('That username or password isn’t right.')
  })

  test('is sent to the login page from the admin area, which remembers where it was going', async ({ page }) => {
    await page.goto('/admin/recipes')
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Frecipes/)
  })

  test('cannot change the atlas, or read the review queue or the change history', async ({ request }) => {
    expect((await request.post('/api/data/recipes', { data: { title: 'Sneaky' } })).status()).toBe(401)
    expect((await request.delete('/api/data/dishes/adobo')).status()).toBe(401)
    expect((await request.get('/api/data/submissions')).status()).toBe(401)
    expect((await request.get('/api/data/activity')).status()).toBe(401)
  })

  test('cannot pull private collections into a public read with _embed', async ({ request }) => {
    expect((await request.get('/api/data/recipes?_embed=submissions')).status()).toBe(401)
    expect((await request.get('/api/data/recipes/1?_embed=ratings&_embed=submissions')).status()).toBe(401)
    expect((await request.get('/api/data/dishes?_embed=activity')).status()).toBe(401)
    // Public ratings still embed.
    expect((await request.get('/api/data/recipes?_embed=ratings')).status()).toBe(200)
  })

  test('cannot reach a private collection by spelling its name differently', async ({ request }) => {
    // %73 is "s" and %61 is "a": json-server decodes them, so the gateway must as well.
    for (const path of ['/api/data/%73ubmissions', '/api/data/%61ctivity', '/api/data//submissions/', '/api/data/'])
      expect((await request.get(path)).status(), path).toBe(401)
    expect((await request.get('/api/data/%E0%A4%A')).status()).toBe(400)
  })

  test("can't skip the review checks by spelling the queue's address differently", async ({ request }) => {
    const sent = await request.post('/api/data/%73ubmissions', { data: { recipeId: '1', score: 99, comment: 'x', hp_field: '' } })
    expect(sent.status()).toBe(400) // the same validation as /submissions: 99 stars is refused
  })

  test("gets no header inviting other websites to call the API", async ({ request }) => {
    const response = await request.get('/api/data/recipes', { headers: { Origin: 'https://evil.example' } })
    expect(response.headers()['access-control-allow-origin']).toBeUndefined()
    expect(response.headers()['x-content-type-options']).toBe('nosniff')
  })

  test("can send a review, which stays out of sight until it's approved", async ({ request }) => {
    const comment = `Visitor review ${Date.now()}`
    const sent = await request.post('/api/data/submissions', { data: { recipeId: '1', score: 4, comment, hp_field: '' } })
    expect(sent.status()).toBe(201)
    const recipe = await (await request.get('/api/data/recipes/1?_embed=ratings')).text()
    expect(recipe).not.toContain(comment)
  })
})
