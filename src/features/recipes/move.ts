import type { Dish, MergedDish, Region } from '@/features/dishes/schema'
import type { RecipeInput, RecipeWithRatings } from './schema'

/** One recipe saved by a move: what it becomes and what it was. */
export interface RecipeChange {
  id: string
  title: string
  input: RecipeInput
  previous: RecipeInput
}

export interface MovePlan {
  /** Each recipe to save, as it will be after the move, and as it was before (for undo). */
  updates: RecipeChange[]
  /** Recipes whose regional kitchen belongs to the old cuisine, so it's cleared. */
  losesRegion: { title: string; region: string }[]
  /** Already versions of the target dish: nothing to do. */
  unchanged: string[]
}

/**
 * Moving recipes to another dish: each takes the dish and its cuisine, since
 * every recipe belongs to a dish of the same cuisine. A regional kitchen
 * belongs to a cuisine too, so it's cleared when the cuisine changes; the
 * version's note stays, as it still says what makes the recipe different.
 * Pure, so the dialog can show the plan before anything is saved.
 */
export function planMove(recipes: RecipeWithRatings[], target: Dish, regions: Region[]): MovePlan {
  const regionById = new Map(regions.map((region) => [region.id, region]))
  const plan: MovePlan = { updates: [], losesRegion: [], unchanged: [] }

  for (const recipe of recipes) {
    if (recipe.dishId === target.id) {
      plan.unchanged.push(recipe.title)
      continue
    }
    const { id, title, createdAt: _created, ratings: _ratings, ...input } = recipe
    const region = regionById.get(recipe.regionId)
    const keepsRegion = !recipe.regionId || region?.cuisineId === target.cuisineId
    if (!keepsRegion) plan.losesRegion.push({ title, region: region?.name ?? 'its region' })
    plan.updates.push({
      id,
      title,
      input: { ...input, title, dishId: target.id, cuisineId: target.cuisineId, regionId: keepsRegion ? recipe.regionId : '' },
      previous: { ...input, title },
    })
  }
  return plan
}

export interface MergePlan {
  /** The dish that goes away once its recipes have moved. */
  source: Dish
  target: Dish
  moves: MovePlan
  /** The target's new `mergedFrom`: the source, and anything merged into it before, so old links still redirect. */
  mergedFrom: MergedDish[]
}

/** The dishes `source` can merge into: others of its cuisine, so regional versions keep their region. */
export function mergeTargets(source: Dish, dishes: Dish[]): Dish[] {
  return dishes
    .filter((dish) => dish.cuisineId === source.cuisineId && dish.id !== source.id)
    .toSorted((a, b) => a.name.localeCompare(b.name))
}

/**
 * Merging two dishes ("Pancit" and "Pancit Bihon" turn out to be one): every
 * version of `source` moves to `target`, then `source` is deleted. It's a
 * move plan (planMove) plus the delete, so the dialog can show it first.
 * The target remembers the source (`mergedFrom`), so links to it redirect.
 */
export function planMerge(source: Dish, target: Dish, recipes: RecipeWithRatings[], regions: Region[]): MergePlan {
  if (source.cuisineId !== target.cuisineId) throw new Error('Only dishes of the same cuisine can be merged')
  const moves = planMove(
    recipes.filter((recipe) => recipe.dishId === source.id),
    target,
    regions,
  )
  const mergedFrom = [...(target.mergedFrom ?? []), { id: source.id, name: source.name }, ...(source.mergedFrom ?? [])]
  return { source, target, moves, mergedFrom: mergedFrom.filter((entry, i) => mergedFrom.findIndex((e) => e.id === entry.id) === i) }
}

/** How long after a move or merge it can still be undone; after that the data may have moved on. */
export const UNDO_WINDOW_MS = 10 * 60 * 1000

/**
 * What it takes to undo a move or a merge. It's plain data, not a function,
 * because it travels in the router's navigation state (with the "Moved…"
 * message), and browser history can only store what it can copy.
 */
export type Undo =
  | { kind: 'move'; at: number; recipes: RecipeChange[] }
  | { kind: 'merge'; at: number; source: Dish; target: Dish; recipes: RecipeChange[] }

export const undoMove = (plan: MovePlan, at: number): Undo => ({ kind: 'move', at, recipes: plan.updates })

export type MergeUndo = Extract<Undo, { kind: 'merge' }>

export const undoMerge = (plan: MergePlan, at: number): MergeUndo => ({
  kind: 'merge',
  at,
  source: plan.source,
  target: plan.target,
  recipes: plan.moves.updates,
})

export const canUndo = (undo: Undo, now: number) => now - undo.at < UNDO_WINDOW_MS

/** Saving each recipe as it was: the reverse of a move. `dishId` replaces the old dish's id (a merged dish comes back with a new one). */
export const restoreRecipes = (recipes: RecipeChange[], dishId?: string) =>
  recipes.map(({ id, title, previous }) => ({ id, title, input: dishId ? { ...previous, dishId } : previous }))

/** What an undo brought back, for the message that replaces "Moved…". */
export function undoneMessage(undo: Undo): string {
  const n = undo.recipes.length
  if (undo.kind === 'merge') return `Undone: ${undo.source.name} is back${n > 0 ? `, with its ${n} ${n === 1 ? 'version' : 'versions'}` : ''}.`
  return `Undone: ${n === 1 ? `${undo.recipes[0]!.title} is` : `${n} recipes are`} back where ${n === 1 ? 'it was' : 'they were'}.`
}

/**
 * A dish an earlier, unfinished undo already brought back: it remembers the
 * merged dish's id. Reusing it makes pressing Undo again safe (no second copy).
 */
export const findRestoredDish = (dishes: Dish[], undo: MergeUndo) =>
  dishes.find((dish) => dish.id !== undo.target.id && dish.mergedFrom?.some((merged) => merged.id === undo.source.id))
