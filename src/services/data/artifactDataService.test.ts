import { describe, expect, it } from 'vitest'
import { createArtifactStore } from './artifactDataService'
import { ApiError, UnauthorizedError } from './errors'
import { getSeed } from './mockDataService'
import { createSnapshotDataService } from './snapshotDataService'

/**
 * A stand-in for the claude.ai `db` capability: documents in a Map, keyed by
 * path. Bodies go through JSON like the real bridge, so `undefined` would show.
 */
function fakeDb(options: { refuseWrites?: boolean; slowWrites?: boolean; readError?: string } = {}) {
  const docs = new Map<string, Record<string, unknown>>()
  return {
    docs,
    db: {
      collection: (path: string) => ({
        get: async () => {
          if (options.readError) throw { code: options.readError, message: 'read failed' }
          return {
            docs: [...docs]
              .filter(([key]) => key.startsWith(`${path}/`))
              .map(([key, body]) => ({ id: key.slice(path.length + 1), data: () => body })),
          }
        },
      }),
      doc: (path: string) => ({
        set: async (body: Record<string, unknown>) => {
          if (options.refuseWrites) throw { code: 'invalid_argument', message: 'below write level' }
          if (options.slowWrites) await new Promise((resolve) => setTimeout(resolve, 20))
          docs.set(path, JSON.parse(JSON.stringify(body)))
        },
        delete: async () => void docs.delete(path),
      }),
    },
  }
}

const serviceOver = (db: ReturnType<typeof fakeDb>['db'] | null) =>
  createSnapshotDataService(createArtifactStore(async () => db))

describe('artifact data service', () => {
  it('saves changes to the shared database and reads them back over the seed', async () => {
    const fake = fakeDb()
    const service = serviceOver(fake.db)
    const adobo = await service.getRecipe('1')

    await service.updateRecipe('1', { ...adobo, title: 'Chicken Adobo (my way)' })
    await service.deleteRecipe('2')

    expect(fake.docs.get('recipes/1')).toMatchObject({ record: { title: 'Chicken Adobo (my way)' } })
    expect(fake.docs.get('recipes/1')!.record).not.toHaveProperty('ratings') // validated: extra fields dropped
    expect(fake.docs.get('recipes/2')).toEqual({ deleted: true })
    // A fresh service (a reload, or another viewer) sees the same changes.
    const reloaded = serviceOver(fake.db)
    expect((await reloaded.getRecipe('1')).title).toBe('Chicken Adobo (my way)')
    expect((await reloaded.listRecipes()).some((r) => r.id === '2')).toBe(false)
  })

  it('adds a cuisine with an id from its name, keeps it across reloads, and refuses the same name twice', async () => {
    const fake = fakeDb()
    const service = serviceOver(fake.db)
    const input = {
      name: 'Vietnamese',
      countryCode: 'vn' as const,
      emoji: '🍜',
      description: 'Fresh herbs and long-simmered broths.',
      origin: 'Hanoi',
      latitude: 21.03,
      longitude: 105.85,
      hue: 150,
    }
    expect(await service.createCuisine(input)).toMatchObject({ id: 'vietnamese', hue: 150 })
    expect((await serviceOver(fake.db).getCuisine('vietnamese')).origin).toBe('Hanoi')
    await expect(service.createCuisine({ ...input, name: 'vietnamese ' })).rejects.toMatchObject({ status: 409 })
    await expect(service.createCuisine({ ...input, name: 'Filipino' })).rejects.toBeInstanceOf(ApiError) // a seed cuisine
  })

  it('edits a cuisine without changing its id, and a seed cuisine can keep its own colors', async () => {
    const fake = fakeDb()
    const service = serviceOver(fake.db)
    const filipino = await service.getCuisine('filipino')
    const updated = await service.updateCuisine('filipino', { ...filipino, name: 'Filipino home cooking', countryCode: 'ph' })
    expect(updated).toMatchObject({ id: 'filipino', name: 'Filipino home cooking' })
    expect(updated).not.toHaveProperty('hue')
    expect((await serviceOver(fake.db).getCuisine('filipino')).name).toBe('Filipino home cooking')
  })

  it('refuses to delete a cuisine its recipes still use', async () => {
    const service = serviceOver(fakeDb().db)
    await expect(service.deleteCuisine('filipino')).rejects.toMatchObject({ status: 409 })
    expect(await service.getCuisine('filipino')).toBeTruthy()
  })

  it('deletes an unused cuisine together with its empty dishes', async () => {
    const fake = fakeDb()
    const service = serviceOver(fake.db)
    await service.createCuisine({
      name: 'Thai',
      countryCode: 'th',
      emoji: '🍜',
      description: 'Sweet, sour, salty and hot.',
      origin: 'Bangkok',
      latitude: 13.75,
      longitude: 100.5,
      hue: 60,
    })
    const dish = await service.createDish({ cuisineId: 'thai', name: 'Pad Thai', description: '' })
    await service.deleteCuisine('thai')
    const reloaded = serviceOver(fake.db)
    await expect(reloaded.getCuisine('thai')).rejects.toThrow()
    expect((await reloaded.listDishes()).some((d) => d.id === dish.id)).toBe(false)
    expect(fake.docs.has('cuisines/thai')).toBe(false) // created here, so removed outright, no deletion marker
  })

  it('queues a visitor review out of sight until the admin approves it, keeping its date', async () => {
    const fake = fakeDb()
    const service = serviceOver(fake.db)
    const before = (await service.getRecipe('1')).ratings.length
    await service.submitReview({ recipeId: '1', score: 5, comment: '  So good.  ' })
    expect((await service.getRecipe('1')).ratings).toHaveLength(before) // not public yet
    const [queued] = await service.listSubmissions()
    expect(queued).toMatchObject({ recipeId: '1', score: 5, comment: 'So good.' })

    const rating = await service.approveSubmission(queued!.id)
    expect(rating.createdAt).toBe(queued!.createdAt)
    const reloaded = serviceOver(fake.db)
    expect((await reloaded.getRecipe('1')).ratings).toHaveLength(before + 1)
    expect(await reloaded.listSubmissions()).toEqual([])
    await expect(service.approveSubmission(queued!.id)).rejects.toThrow('already handled')
  })

  it('rejects a queued review without publishing it', async () => {
    const service = serviceOver(fakeDb().db)
    await service.submitReview({ recipeId: '1', score: 1, comment: 'spam' })
    const [queued] = await service.listSubmissions()
    await service.rejectSubmission(queued!.id)
    expect(await service.listSubmissions()).toEqual([])
    await expect(service.submitReview({ recipeId: 'nope', score: 3, comment: '' })).rejects.toThrow()
  })

  it('still shows the atlas to a visitor who may not read the review queue', async () => {
    const fake = fakeDb()
    const db = {
      ...fake.db,
      collection: (path: string) =>
        path === 'submissions'
          ? { get: async () => Promise.reject({ code: 'permission_denied', message: 'owner only' }) }
          : fake.db.collection(path),
    }
    await serviceOver(fake.db).updateCuisine('korean', { ...(await serviceOver(fake.db).getCuisine('korean')), name: 'Korean (edited)', countryCode: 'kr' })
    const visitor = serviceOver(db)
    expect((await visitor.getCuisine('korean')).name).toBe('Korean (edited)') // saved changes, not the bare seed
    expect(await visitor.listSubmissions()).toEqual([])
  })

  it('renames a dish, keeps its cuisine, and refuses to delete it while recipes use it', async () => {
    const fake = fakeDb()
    const service = serviceOver(fake.db)
    const adobo = await service.updateDish('adobo', { name: 'Adobo (all kinds)', description: 'Braised in vinegar.' })
    expect(adobo).toMatchObject({ id: 'adobo', cuisineId: 'filipino', name: 'Adobo (all kinds)' })
    expect((await serviceOver(fake.db).getDish('adobo')).name).toBe('Adobo (all kinds)')
    await expect(service.deleteDish('adobo')).rejects.toMatchObject({ status: 409 })
    const empty = await service.createDish({ cuisineId: 'filipino', name: 'Leftover', description: '' })
    await service.deleteDish(empty.id)
    expect((await serviceOver(fake.db).listDishes()).some((d) => d.id === empty.id)).toBe(false)
  })

  it('adds, moves and deletes a regional kitchen, but not one recipes come from', async () => {
    const fake = fakeDb()
    const service = serviceOver(fake.db)
    const iloilo = await service.createRegion({ cuisineId: 'filipino', name: 'Iloilo', latitude: 10.7, longitude: 122.56 })
    await service.updateRegion(iloilo.id, { name: 'Iloilo City', latitude: 10.72, longitude: 122.56 })
    expect((await serviceOver(fake.db).listRegions()).find((r) => r.id === iloilo.id)).toMatchObject({ name: 'Iloilo City', cuisineId: 'filipino' })
    await expect(service.deleteRegion('batangas')).rejects.toMatchObject({ status: 409 })
    await service.deleteRegion(iloilo.id)
    expect((await serviceOver(fake.db).listRegions()).some((r) => r.id === iloilo.id)).toBe(false)
  })

  it('stores "to taste" ingredients as plain JSON', async () => {
    const fake = fakeDb()
    const service = serviceOver(fake.db)
    const adobo = await service.getRecipe('1')
    await service.updateRecipe('1', { ...adobo, ingredients: [{ name: 'salt', quantity: undefined, unit: 'to taste' }] })
    expect((await serviceOver(fake.db).getRecipe('1')).ingredients).toEqual([{ name: 'salt', unit: 'to taste' }])
  })

  it('removes a record you created instead of leaving a deletion marker', async () => {
    const fake = fakeDb()
    const service = serviceOver(fake.db)
    const created = await service.createRecipe({ ...(await service.getRecipe('1')), title: 'Pork Adobo' })
    expect(fake.docs.has(`recipes/${created.id}`)).toBe(true)
    await service.deleteRecipe(created.id)
    expect(fake.docs.has(`recipes/${created.id}`)).toBe(false)
  })

  it('never serves a read started during a save after the save', async () => {
    const fake = fakeDb({ slowWrites: true })
    const service = serviceOver(fake.db)
    const adobo = await service.getRecipe('1')
    const saving = service.updateRecipe('1', { ...adobo, title: 'Saved title' })
    await service.listRecipes() // a component mounting mid-save
    await saving
    expect((await service.getRecipe('1')).title).toBe('Saved title')
  })

  it('falls back to the plain seed when there is no database, or this view loses it', async () => {
    expect(await serviceOver(null).listRecipes()).toHaveLength(getSeed().recipes.length)
    expect(await serviceOver(fakeDb({ readError: 'revoked' }).db).listRecipes()).toHaveLength(getSeed().recipes.length)
  })

  it('reports a refused write as "only the owner can save"', async () => {
    const service = serviceOver(fakeDb({ refuseWrites: true }).db)
    await expect(service.deleteRating(getSeed().ratings[0]!.id)).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('reports a busy database, or an unknown code, as a retryable server error', async () => {
    for (const code of ['unavailable', 'something_new']) {
      await expect(serviceOver(fakeDb({ readError: code }).db).listRecipes()).rejects.toSatisfy(
        (e) => e instanceof ApiError && e.status === 503,
      )
    }
  })
})
