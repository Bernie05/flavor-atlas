import { useMutation, useQueryClient } from '@tanstack/react-query'
import { recipeQueries } from '@/features/recipes/queries'
import { refreshRecipes } from '@/features/recipes/mutations'
import { activityMeta } from '@/features/activity/meta'
import { dataService } from '@/services/data'
import { submissionQueries } from './queries'
import type { Rating, RatingInput } from './schema'

/**
 * A review to delete, approve or reject, described for the change history
 * ("the 5-star review of Adobo"): never the reviewer's own words.
 */
export interface Review {
  id: string
  label: string
  recipeId: string
}

/** Delete a review, then refresh every recipe query so averages update everywhere. */
export function useDeleteRating() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: Review) => dataService.deleteRating(id),
    onSuccess: () => refreshRecipes(queryClient),
    meta: activityMeta((_: void, review: Review) => ({ kind: 'review', summary: `Deleted ${review.label}`, link: `/recipes/${review.recipeId}` })),
  })
}

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
    meta: activityMeta((rating: Rating) => ({ kind: 'review', summary: `Added a ${rating.score}-star review`, link: `/recipes/${rating.recipeId}` })),
  })
}

/** A visitor sends a review; it waits in the admin's queue, so nothing on the page changes. */
export function useSubmitReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RatingInput) => dataService.submitReview(input),
    // Only the admin's queue changes (when the admin is the one viewing).
    onSuccess: () => queryClient.invalidateQueries({ queryKey: submissionQueries.all() }),
  })
}

/** Approve or reject a queued review: the queue changes, and approving changes the recipe's ratings. */
export function useModerateSubmission() {
  const queryClient = useQueryClient()
  const refresh = () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: submissionQueries.all(), refetchType: 'all' }), refreshRecipes(queryClient)])
  return {
    approve: useMutation({
      mutationFn: ({ id }: Review) => dataService.approveSubmission(id),
      onSuccess: refresh,
      meta: activityMeta((_: unknown, review: Review) => ({ kind: 'review', summary: `Approved ${review.label}`, link: `/recipes/${review.recipeId}` })),
    }),
    reject: useMutation({
      mutationFn: ({ id }: Review) => dataService.rejectSubmission(id),
      onSuccess: refresh,
      // No link: a rejected review is gone, and its words never go into the history.
      meta: activityMeta((_: void, review: Review) => ({ kind: 'review', summary: `Rejected ${review.label}` })),
    }),
  }
}
