import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { dataService } from '@/services/data'
import { dishQueries, regionQueries } from '@/features/dishes/queries'
import type { CuisineInput, CuisineUpdate } from './schema'

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

export function useUpdateCuisine(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CuisineUpdate) => dataService.updateCuisine(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cuisineQueries.all(), refetchType: 'all' }),
  })
}

/** Deleting a cuisine also removes its empty dishes and its regions, so those lists refresh too. */
export function useDeleteCuisine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => dataService.deleteCuisine(id),
    onSuccess: () =>
      Promise.all(
        [cuisineQueries.all(), dishQueries.all(), regionQueries.all()].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey, refetchType: 'all' }),
        ),
      ),
  })
}
