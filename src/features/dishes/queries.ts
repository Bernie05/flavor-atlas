import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { dataService } from '@/services/data'
import type { DishInput } from './schema'

export const dishQueries = {
  all: () => ['dishes'] as const,
  list: () => queryOptions({ queryKey: [...dishQueries.all(), 'list'], queryFn: () => dataService.listDishes() }),
  detail: (id: string) =>
    queryOptions({ queryKey: [...dishQueries.all(), 'detail', id], queryFn: () => dataService.getDish(id) }),
}

// Regions never change from the app, so they can stay cached for the whole visit.
export const regionQueries = {
  list: () =>
    queryOptions({ queryKey: ['regions', 'list'], queryFn: () => dataService.listRegions(), staleTime: Infinity }),
}

export function useCreateDish() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DishInput) => dataService.createDish(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dishQueries.all(), refetchType: 'all' }),
  })
}
