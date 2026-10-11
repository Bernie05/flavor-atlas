import { expect, test } from '@playwright/test'

/**
 * What a visitor (no session) can and can't do. The UI hides admin controls,
 * but the server is the protection, so these go straight at the API too.
 */
test.describe('a visitor', () => {
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

  test("can send a review, which stays out of sight until it's approved", async ({ request }) => {
    const comment = `Visitor review ${Date.now()}`
    const sent = await request.post('/api/data/submissions', { data: { recipeId: '1', score: 4, comment, hp_field: '' } })
    expect(sent.status()).toBe(201)
    const recipe = await (await request.get('/api/data/recipes/1?_embed=ratings')).text()
    expect(recipe).not.toContain(comment)
  })
})
