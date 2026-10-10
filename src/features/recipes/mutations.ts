import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { dishQueries, useCreateDish } from '@/features/dishes/queries'
import { dataService } from '@/services/data'
import type { RecipeSubmission } from './form'
import type { MergePlan, MovePlan } from './move'
import { recipeQueries } from './queries'
import type { Recipe, RecipeInput, RecipeWithRatings } from './schema'

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

interface SaveMutation {
  mutateAsync: (input: RecipeInput) => Promise<Recipe>
  isPending: boolean
  error: Error | null
}

/**
 * Turns a form submission into a saved recipe. When the cook typed a new dish
 * name, the dish is created first and the recipe is saved under its id.
 * The created dish is remembered, so retrying after a failed save does not
 * create the same dish twice.
 */
export function useSubmitRecipe(save: SaveMutation) {
  const createDish = useCreateDish()
  const created = useRef(new Map<string, string>())

  const submit = async ({ input, newDishName }: RecipeSubmission, onSaved: (recipe: Recipe) => void) => {
    try {
      let dishId = input.dishId
      if (newDishName) {
        const key = `${input.cuisineId}/${newDishName.toLowerCase()}`
        dishId =
          created.current.get(key) ??
          (await createDish.mutateAsync({ cuisineId: input.cuisineId, name: newDishName, description: '' })).id
        created.current.set(key, dishId)
      }
      onSaved(await save.mutateAsync({ ...input, dishId }))
    } catch {
      // Shown through `error` below; the form stays filled in for another try.
    }
  }

  return { submit, isPending: createDish.isPending || save.isPending, error: createDish.error ?? save.error }
}

/**
 * Save a move plan (planMove), one recipe at a time: json-server has no
 * transactions. If one fails, the error says how many were moved; each saved
 * recipe is whole, so running the move again for the rest is safe.
 */
async function saveMoves(plan: MovePlan) {
  let moved = 0
  for (const { id, input } of plan.updates) {
    try {
      await dataService.updateRecipe(id, input)
    } catch (error) {
      throw new Error(
        `Moved ${moved} of ${plan.updates.length}; “${plan.updates[moved]?.title}” couldn't be saved. Try the rest again.`,
        { cause: error },
      )
    }
    moved++
  }
  return moved
}

/** Recipes and dishes both change (a dish's versions); refresh either way, so a partial move shows. */
const refreshAfterMove = (queryClient: QueryClient) =>
  Promise.all([refreshRecipes(queryClient), queryClient.invalidateQueries({ queryKey: dishQueries.all(), refetchType: 'all' })])

export function useMoveRecipes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveMoves,
    onSettled: () => refreshAfterMove(queryClient),
  })
}

/**
 * Merge two dishes (planMerge): move the source's versions, then delete it.
 * The delete comes last, so a failed move leaves the source dish (and the
 * recipes not yet moved) in place, and merging again picks up the rest.
 * The server would refuse the delete anyway while a recipe still uses it.
 */
export function useMergeDishes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ source, moves }: MergePlan) => {
      const moved = await saveMoves(moves)
      try {
        await dataService.deleteDish(source.id)
      } catch (error) {
        throw new Error(`Moved every version, but ${source.name} itself couldn't be deleted. Delete it from the list.`, { cause: error })
      }
      return moved
    },
    // The deleted dish's page must not be refetched (404); everything else refreshes, even after a partial merge.
    onSuccess: (_moved, { source }) => queryClient.removeQueries({ queryKey: dishQueries.detail(source.id).queryKey }),
    onSettled: () => refreshAfterMove(queryClient),
  })
}
