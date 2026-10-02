import { queryOptions } from '@tanstack/react-query'
import { dataService } from '@/services/data'

// Query factory: one place that owns the cache keys and fetchers for cuisines.
// Components call useQuery(cuisineQueries.list()), and mutations can
// invalidate everything under cuisineQueries.all() without guessing keys.
export const cuisineQueries = {
  all: () => ['cuisines'] as const,

  list: () =>
    queryOptions({
      queryKey: [...cuisineQueries.all(), 'list'],
      queryFn: () => dataService.listCuisines(),
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: [...cuisineQueries.all(), 'detail', id],
      queryFn: () => dataService.getCuisine(id),
    }),
}
