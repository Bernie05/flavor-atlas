import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { dataService } from '@/services/data'
import type { CuisineInput } from './schema'

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

/** Adds a cuisine; every cuisine list and page refetches, so the new pin and colors appear at once. */
export function useCreateCuisine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CuisineInput) => dataService.createCuisine(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cuisineQueries.all(), refetchType: 'all' }),
  })
}
