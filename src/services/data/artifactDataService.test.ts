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
