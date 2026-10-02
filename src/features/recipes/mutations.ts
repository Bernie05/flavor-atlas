import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { dataService } from '@/services/data'
import { recipeQueries } from './queries'
import type { RecipeInput, RecipeWithRatings } from './schema'

/**
 * Refresh every cached recipe query after a change.
 *
 * By default invalidateQueries only refetches queries on screen; the rest are
 * marked stale and shown from cache (old data) the next time they mount, then
 * refetched. refetchType 'all' refreshes off-screen lists too. Returning this
 * promise from onSuccess keeps the mutation pending until it finishes, so the
 * page we navigate to already has fresh data.
 */
export const refreshRecipes = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: recipeQueries.all(), refetchType: 'all' })

export function useCreateRecipe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RecipeInput) => dataService.createRecipe(input),
    onSuccess: () => refreshRecipes(queryClient),
  })
}

export function useUpdateRecipe(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RecipeInput) => dataService.updateRecipe(id, input),
    onSuccess: () => refreshRecipes(queryClient),
  })
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => dataService.deleteRecipe(id),
    onSuccess: (_result, id) => {
      // Remove the recipe from every cached list immediately, so no screen
      // can show it again, and drop its detail entry so it isn't refetched (404).
      queryClient.setQueriesData<RecipeWithRatings[]>({ queryKey: recipeQueries.lists() }, (recipes) =>
        recipes?.filter((recipe) => recipe.id !== id),
      )
      queryClient.removeQueries({ queryKey: recipeQueries.detail(id).queryKey })
      return refreshRecipes(queryClient)
    },
  })
}
