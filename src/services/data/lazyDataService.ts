import type { DataService } from './DataService'

// Every DataService method. `satisfies` makes TypeScript fail here when one is added to the interface.
const METHODS = {
  listCuisines: true,
  getCuisine: true,
  createCuisine: true,
  updateCuisine: true,
  deleteCuisine: true,
  listDishes: true,
  getDish: true,
  createDish: true,
  updateDish: true,
  deleteDish: true,
  listRegions: true,
  createRegion: true,
  updateRegion: true,
  deleteRegion: true,
  listRecipes: true,
  getRecipe: true,
  createRecipe: true,
  updateRecipe: true,
  deleteRecipe: true,
  createRating: true,
  deleteRating: true,
  submitReview: true,
  listSubmissions: true,
  approveSubmission: true,
  rejectSubmission: true,
} satisfies Record<keyof DataService, true>

/**
 * A DataService that loads the real one on first use. Each implementation is a
 * dynamic import, so a build only downloads the backend it talks to (the
 * json-server build never ships the 64 KB seed the mock and artifact need).
 * A failed load is forgotten, so the next call tries again instead of failing forever.
 */
export function lazyDataService(load: () => Promise<DataService>): DataService {
  let loading: Promise<DataService> | undefined
  const service = () =>
    (loading ??= load().catch((error: unknown) => {
      loading = undefined
      throw error
    }))

  // One untyped forwarder per method; the DataService type is restored at the boundary below.
  const delegate = (name: keyof DataService) => async (...args: unknown[]) => {
    const real = await service()
    return (real[name] as (...a: unknown[]) => Promise<unknown>).apply(real, args)
  }

  return Object.fromEntries(
    (Object.keys(METHODS) as (keyof DataService)[]).map((name) => [name, delegate(name)]),
  ) as unknown as DataService
}
