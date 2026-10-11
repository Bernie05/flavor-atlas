import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { activityMeta, type Named } from '@/features/activity/meta'
import { dataService } from '@/services/data'
import type { Dish, DishInput, DishUpdate, Region, RegionInput } from './schema'

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
    meta: activityMeta((dish: Dish) => ({ kind: 'dish', summary: `Added the dish ${dish.name}`, link: `/dishes/${dish.id}` })),
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
  return useMutation({
    mutationFn: (input: DishUpdate) => dataService.updateDish(id, input),
    onSuccess: refresh,
    meta: activityMeta((dish: Dish) => ({ kind: 'dish', summary: `Edited the dish ${dish.name}`, link: `/dishes/${dish.id}` })),
  })
}

export function useDeleteDish() {
  const refresh = useRefreshDishes()
  return useMutation({
    mutationFn: ({ id }: Named) => dataService.deleteDish(id),
    onSuccess: refresh,
    meta: activityMeta((_: void, { name }: Named) => ({ kind: 'dish', summary: `Deleted the dish ${name}` })),
  })
}

export function useCreateRegion() {
  const refresh = useRefreshRegions()
  return useMutation({
    mutationFn: (input: RegionInput) => dataService.createRegion(input),
    onSuccess: refresh,
    meta: activityMeta((region: Region) => ({ kind: 'region', summary: `Added the regional kitchen ${region.name}`, link: `/regions/${region.id}` })),
  })
}

export function useUpdateRegion(id: string) {
  const refresh = useRefreshRegions()
  return useMutation({
    mutationFn: (input: Omit<RegionInput, 'cuisineId'>) => dataService.updateRegion(id, input),
    onSuccess: refresh,
    meta: activityMeta((region: Region) => ({ kind: 'region', summary: `Edited the regional kitchen ${region.name}`, link: `/regions/${region.id}` })),
  })
}

export function useDeleteRegion() {
  const refresh = useRefreshRegions()
  return useMutation({
    mutationFn: ({ id }: Named) => dataService.deleteRegion(id),
    onSuccess: refresh,
    meta: activityMeta((_: void, { name }: Named) => ({ kind: 'region', summary: `Deleted the regional kitchen ${name}` })),
  })
}
