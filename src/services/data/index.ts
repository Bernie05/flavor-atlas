import { config } from '@/lib/config'
import type { DataService } from './DataService'
import { artifactDataService } from './artifactDataService'
import { httpDataService } from './httpDataService'
import { mockDataService } from './mockDataService'

/** The one place that decides which backend the app talks to. */
export const dataService: DataService =
  config.dataSource === 'artifact'
    ? artifactDataService
    : config.dataSource === 'mock'
      ? mockDataService
      : httpDataService

export type { DataService, RecipeFilters } from './DataService'
export { ApiError, NotFoundError, UnauthorizedError, describeError, isRetryable } from './errors'
