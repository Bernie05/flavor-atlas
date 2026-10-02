import { queryOptions } from '@tanstack/react-query'
import { dataService, type RecipeFilters } from '@/services/data'

// Query factory for recipes. See features/cuisines/queries.ts for the pattern.
export const recipeQueries = {
  all: () => ['recipes'] as const,

  list: (filters: RecipeFilters = {}) =>
    queryOptions({
      queryKey: [...recipeQueries.all(), 'list', filters],
      queryFn: () => dataService.listRecipes(filters),
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: [...recipeQueries.all(), 'detail', id],
      queryFn: () => dataService.getRecipe(id),
    }),
}
