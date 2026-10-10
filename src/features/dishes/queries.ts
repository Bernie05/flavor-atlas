import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { dataService } from '@/services/data'
import type { DishInput, DishUpdate, RegionInput } from './schema'

export const dishQueries = {
  all: () => ['dishes'] as const,
  list: () => queryOptions({ queryKey: [...dishQueries.all(), 'list'], queryFn: () => dataService.listDishes() }),
  detail: (id: string) =>
    queryOptions({ queryKey: [...dishQueries.all(), 'detail', id], queryFn: () => dataService.getDish(id) }),
}

// Regions only change when the admin deletes a cuisine (which invalidates them), so they stay cached.
export const regionQueries = {
  all: () => ['regions'] as const,
  list: () =>
    queryOptions({ queryKey: [...regionQueries.all(), 'list'], queryFn: () => dataService.listRegions(), staleTime: Infinity }),
}

export function useCreateDish() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DishInput) => dataService.createDish(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dishQueries.all(), refetchType: 'all' }),
  })
}

/** Refresh dishes everywhere (recipe form, dish pages, the admin list). */
const useRefreshDishes = () => {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: dishQueries.all(), refetchType: 'all' })
}

const useRefreshRegions = () => {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: regionQueries.all(), refetchType: 'all' })
}

export function useUpdateDish(id: string) {
  const refresh = useRefreshDishes()
  return useMutation({ mutationFn: (input: DishUpdate) => dataService.updateDish(id, input), onSuccess: refresh })
}

export function useDeleteDish() {
  const refresh = useRefreshDishes()
  return useMutation({ mutationFn: (id: string) => dataService.deleteDish(id), onSuccess: refresh })
}

export function useCreateRegion() {
  const refresh = useRefreshRegions()
  return useMutation({ mutationFn: (input: RegionInput) => dataService.createRegion(input), onSuccess: refresh })
}

export function useUpdateRegion(id: string) {
  const refresh = useRefreshRegions()
  return useMutation({
    mutationFn: (input: Omit<RegionInput, 'cuisineId'>) => dataService.updateRegion(id, input),
    onSuccess: refresh,
  })
}

export function useDeleteRegion() {
  const refresh = useRefreshRegions()
  return useMutation({ mutationFn: (id: string) => dataService.deleteRegion(id), onSuccess: refresh })
}
