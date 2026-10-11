import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { dishQueries, useCreateDish } from '@/features/dishes/queries'
import { activityMeta, type Named } from '@/features/activity/meta'
import { entryForUndo } from '@/features/activity/utils'
import { dataService } from '@/services/data'
import type { RecipeSubmission } from './form'
import { findRestoredDish, restoreRecipes, undoMerge, undoMove, undoneMessage, type MergePlan, type MovePlan, type Undo } from './move'
import { recipeQueries } from './queries'
import type { Recipe, RecipeInput, RecipePlacement, RecipeWithRatings } from './schema'
import { countOf } from '@/lib/plural'

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
    meta: activityMeta((recipe: Recipe) => ({ kind: 'recipe', summary: `Added “${recipe.title}”`, link: `/recipes/${recipe.id}` })),
  })
}

export function useUpdateRecipe(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RecipeInput) => dataService.updateRecipe(id, input),
    onSuccess: () => refreshRecipes(queryClient),
    meta: activityMeta((recipe: Recipe) => ({ kind: 'recipe', summary: `Edited “${recipe.title}”`, link: `/recipes/${recipe.id}` })),
  })
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient()
  return useMutation({
    // The title travels with the id, for the change history ("Deleted “Japchae”").
    mutationFn: ({ id }: Named) => dataService.deleteRecipe(id),
    meta: activityMeta((_: void, { name }: Named) => ({ kind: 'recipe', summary: `Deleted “${name}”` })),
    onSuccess: (_result, { id }) => {
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
async function saveMoves(plan: { updates: { id: string; title: string; to: RecipePlacement }[] }) {
  let moved = 0
  // One at a time, not all at once: if one fails, "Moved 2 of 4" is exact and the rest can be retried.
  for (const { id, to } of plan.updates) {
    try {
      await dataService.placeRecipe(id, to)
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

/** What a move or merge returns: how many recipes moved, and the data to undo it (also kept in the history). */
interface Moved {
  moved: number
  undo: Undo
}

export function useMoveRecipes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (plan: MovePlan): Promise<Moved> => ({ moved: await saveMoves(plan), undo: undoMove(plan, Date.now()) }),
    onSettled: () => refreshAfterMove(queryClient),
    meta: activityMeta(({ moved, undo }: Moved, plan: MovePlan) => ({
      kind: 'move',
      summary: `Moved ${countOf(moved, 'recipe')} to ${plan.target.name}`,
      link: `/dishes/${plan.target.id}`,
      undo,
    })),
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
    mutationFn: async (plan: MergePlan): Promise<Moved> => {
      const { source, target, moves, mergedFrom } = plan
      const moved = await saveMoves(moves)
      try {
        // Before the delete: if it fails, the redirect is harmless (the old dish still has its own page).
        await dataService.updateDish(target.id, { name: target.name, description: target.description, mergedFrom })
        await dataService.deleteDish(source.id)
      } catch (error) {
        throw new Error(`Moved every version, but ${source.name} itself couldn't be removed. Merge it again to finish.`, { cause: error })
      }
      return { moved, undo: undoMerge(plan, Date.now()) }
    },
    meta: activityMeta(({ moved, undo }: Moved, { source, target }: MergePlan) => ({
      kind: 'merge',
      summary: `Merged ${source.name} into ${target.name}${moved > 0 ? ` (${countOf(moved, 'version')})` : ''}`,
      link: `/dishes/${target.id}`,
      undo,
    })),
    // The deleted dish's page must not be refetched (404); everything else refreshes, even after a partial merge.
    onSuccess: (_moved, { source }) => queryClient.removeQueries({ queryKey: dishQueries.detail(source.id).queryKey }),
    onSettled: () => refreshAfterMove(queryClient),
  })
}

/**
 * Undo a move or a merge (see `Undo` in move.ts): each recipe is saved as it
 * was. A merged dish comes back as a new dish (the server picks its id); it
 * remembers its old id, so links to it still lead to it, and the dish it was
 * merged into forgets it.
 */
export function useUndoChange() {
  const queryClient = useQueryClient()
  return useMutation({
    // Every step can run twice: recipes are saved whole (as they were), and the merged dish is
    // looked up before it's recreated. So after a failure, pressing Undo again finishes the job.
    mutationFn: async (undo: Undo) => {
      const moved = await reverse(undo)
      // Its history entry stops offering Undo (best effort: the undo itself is done).
      const entry = entryForUndo(await dataService.listActivity().catch(() => []), undo.at)
      if (entry) await dataService.markActivityUndone(entry.id).catch(() => {})
      return moved
    },
    meta: activityMeta((_: number, undo: Undo) => ({ kind: 'undo', summary: undoneMessage(undo).replace(/\.$/, '') })),
    onSettled: () => refreshAfterMove(queryClient),
  })
}

/** The undo itself: every step can run twice (see useUndoChange). */
async function reverse(undo: Undo): Promise<number> {
  try {
    if (undo.kind === 'move') return await saveMoves({ updates: restoreRecipes(undo.recipes) })
    const { source, target } = undo
    const dish =
      findRestoredDish(await dataService.listDishes(), undo) ??
      (await dataService.createDish({ cuisineId: source.cuisineId, name: source.name, description: source.description }))
    await dataService.updateDish(dish.id, {
      name: dish.name,
      description: dish.description,
      mergedFrom: [{ id: source.id, name: source.name }, ...(source.mergedFrom ?? [])],
    })
    const moved = await saveMoves({ updates: restoreRecipes(undo.recipes, dish.id) })
    await dataService.updateDish(target.id, { name: target.name, description: target.description, mergedFrom: target.mergedFrom ?? [] })
    return moved
  } catch (error) {
    throw new Error("Couldn't finish undoing. Press Undo again to finish.", { cause: error })
  }
}
