import { useMutation, useQueryClient } from '@tanstack/react-query'
import { recipeQueries } from '@/features/recipes/queries'
import { refreshRecipes } from '@/features/recipes/mutations'
import { dataService } from '@/services/data'
import type { RatingInput } from './schema'

/**
 * Add a rating with an optimistic update: the recipe page shows the new
 * rating (and its new average) immediately, before the server answers.
 *
 *   onMutate  → snapshot the cached recipe, then write the guess into the cache
 *   onError   → put the snapshot back (the guess was wrong)
 *   onSettled → refetch either way, so the cache ends up matching the server
 */
export function useAddRating(recipeId: string) {
  const queryClient = useQueryClient()
  const detail = recipeQueries.detail(recipeId)

  return useMutation({
    mutationFn: (input: RatingInput) => dataService.createRating(input),

    onMutate: async (input) => {
      // Stop in-flight fetches so they can't overwrite our optimistic data.
      await queryClient.cancelQueries({ queryKey: detail.queryKey })
      const previous = queryClient.getQueryData(detail.queryKey)

      queryClient.setQueryData(detail.queryKey, (recipe) =>
        recipe && {
          ...recipe,
          ratings: [
            ...recipe.ratings,
            { ...input, id: `optimistic-${Date.now()}`, createdAt: new Date().toISOString() },
          ],
        },
      )
      return { previous }
    },

    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(detail.queryKey, context.previous)
    },

    onSettled: () => refreshRecipes(queryClient),
  })
}
