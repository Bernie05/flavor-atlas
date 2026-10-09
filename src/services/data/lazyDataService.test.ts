import { describe, expect, it, vi } from 'vitest'
import type { DataService } from './DataService'
import { lazyDataService } from './lazyDataService'

const fakeService = () =>
  ({
    getCuisine: vi.fn(async (id: string) => ({ id })),
    listDishes: vi.fn(async () => []),
  }) as unknown as DataService

describe('lazyDataService', () => {
  it('loads the real service once and passes calls through with their arguments', async () => {
    const real = fakeService()
    const load = vi.fn(async () => real)
    const service = lazyDataService(load)
    expect(load).not.toHaveBeenCalled()

    await expect(service.getCuisine('thai')).resolves.toEqual({ id: 'thai' })
    await service.listDishes()
    expect(load).toHaveBeenCalledTimes(1)
    expect(real.getCuisine).toHaveBeenCalledWith('thai')
  })

  it('has every method of the interface', () => {
    const service = lazyDataService(async () => fakeService())
    expect(Object.keys(service)).toEqual(expect.arrayContaining(['listRecipes', 'createRecipe', 'deleteRating']))
  })

  it('tries loading again after a failed load', async () => {
    const load = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch dynamically imported module')).mockResolvedValue(fakeService())
    const service = lazyDataService(load)
    await expect(service.listDishes()).rejects.toThrow(TypeError)
    await expect(service.listDishes()).resolves.toEqual([])
    expect(load).toHaveBeenCalledTimes(2)
  })
})
