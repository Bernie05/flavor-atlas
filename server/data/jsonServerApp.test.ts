import { copyFileSync, mkdtempSync, rmSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDataHandler } from './jsonServerApp'

/**
 * The real json-server, through our data handler, on a copy of the seed.
 * The in-memory services the phone demo uses keep ids and never null
 * references, so they hid two json-server behaviors that broke the site
 * (random ids on create, null references on delete). This catches that
 * kind of bug in `npm test`, and so in the pre-commit hook and CI.
 */
let server: Server
let base = ''
let dir = ''

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'flavor-atlas-db-'))
  const file = join(dir, 'db.json')
  copyFileSync('db.seed.json', file)
  const handler = await createDataHandler(file)
  server = createServer((req, res) =>
    handler(req, res, () => {
      res.statusCode = 404
      res.end()
    }),
  )
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => {
  server.close()
  rmSync(dir, { recursive: true, force: true })
})

const call = async (method: string, path: string, body?: unknown) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  return { status: response.status, body: text ? (JSON.parse(text) as Record<string, unknown>) : null }
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const thai = {
  id: 'thai',
  name: 'Thai',
  countryCode: 'th',
  emoji: '🍜',
  description: 'Sweet, sour, salty and hot.',
  origin: 'Bangkok',
  latitude: 13.75,
  longitude: 100.5,
  hue: 60,
}

/** Every recipe still points at a real cuisine, dish and (if any) region. */
async function expectNoDanglingRecipes() {
  const [recipes, cuisines, dishes, regions] = await Promise.all(
    ['/recipes', '/cuisines', '/dishes', '/regions'].map(async (path) => (await call('GET', path)).body as unknown as { id: string }[]),
  )
  const ids = (items: { id: string }[]) => new Set(items.map((item) => item.id))
  const [cuisineIds, dishIds, regionIds] = [ids(cuisines!), ids(dishes!), ids(regions!)]
  for (const recipe of recipes as unknown as { cuisineId: string; dishId: string; regionId: string }[]) {
    expect(cuisineIds.has(recipe.cuisineId)).toBe(true)
    expect(dishIds.has(recipe.dishId)).toBe(true)
    if (recipe.regionId) expect(regionIds.has(recipe.regionId)).toBe(true)
  }
}

describe('the data API (json-server behind our handler)', () => {
  it('serves the seed with slug cuisine ids', async () => {
    const { status, body } = await call('GET', '/cuisines')
    expect(status).toBe(200)
    for (const cuisine of body as unknown as { id: string }[]) expect(cuisine.id).toMatch(SLUG)
  })

  it('creates a cuisine with the id the app chose, and refuses it twice', async () => {
    expect(await call('POST', '/cuisines', thai)).toMatchObject({ status: 201, body: { id: 'thai' } })
    expect((await call('GET', '/cuisines/thai')).status).toBe(200)
    expect((await call('POST', '/cuisines', thai)).status).toBe(409)
    expect((await call('POST', '/cuisines', { ...thai, id: 'Not A Slug' })).status).toBe(400)
  })

  it('refuses to delete what a recipe still uses, leaving every recipe whole', async () => {
    for (const path of ['/cuisines/filipino?_dependent=dishes&_dependent=regions', '/dishes/adobo', '/regions/batangas']) {
      expect((await call('DELETE', path)).status).toBe(409)
    }
    await expectNoDanglingRecipes()
  })

  it('deletes an unused cuisine with its empty dishes', async () => {
    const dish = await call('POST', '/dishes', { cuisineId: 'thai', name: 'Pad Thai', description: '' })
    expect(dish.status).toBe(201)
    expect((await call('DELETE', '/cuisines/thai?_dependent=dishes&_dependent=regions')).status).toBe(200)
    expect((await call('GET', `/dishes/${dish.body!.id as string}`)).status).toBe(404)
    await expectNoDanglingRecipes()
  })

  it('queues a visitor review without publishing it, and checks what was sent', async () => {
    const before = ((await call('GET', '/recipes/1?_embed=ratings')).body!.ratings as unknown[]).length
    expect(await call('POST', '/submissions', { recipeId: '1', score: 5, comment: 'Lovely' })).toMatchObject({ status: 201, body: { status: 'pending' } })
    expect((await call('POST', '/submissions', { recipeId: '1', score: 9 })).status).toBe(400)
    expect((await call('POST', '/submissions', { recipeId: '1', score: 5, hp_field: 'spam' })).status).toBe(201)
    const queue = (await call('GET', '/submissions')).body as unknown as { comment: string }[]
    expect(queue.map((s) => s.comment)).toEqual(['Lovely']) // the bot's review was dropped
    // Not public: the recipe's ratings are unchanged until the admin approves.
    expect(((await call('GET', '/recipes/1?_embed=ratings')).body!.ratings as unknown[]).length).toBe(before)
  })

  it('slows down a visitor who sends too many', async () => {
    const statuses = []
    for (let i = 0; i < 6; i++) statuses.push((await call('POST', '/submissions', { recipeId: '1', score: 4 })).status)
    expect(statuses).toContain(429)
  })
})
