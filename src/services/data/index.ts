import { config } from '@/lib/config'
import type { DataService } from './DataService'
import { lazyDataService } from './lazyDataService'

/**
 * The one place that decides which backend the app talks to. Each one is a
 * dynamic import, so the bundle only carries the one this build uses.
 */
export const dataService: DataService = lazyDataService(() =>
  config.dataSource === 'artifact'
    ? import('./artifactDataService').then((m) => m.artifactDataService)
    : config.dataSource === 'mock'
      ? import('./mockDataService').then((m) => m.mockDataService)
      : import('./httpDataService').then((m) => m.httpDataService),
)

export type { DataService, RecipeFilters } from './DataService'
export { ApiError, NotFoundError, UnauthorizedError, describeError, isRetryable } from './errors'
