import { z } from 'zod'
import { dishSchema, type Dish, type MergedDish, type Region } from '@/features/dishes/schema'
import { recipePlacementSchema, type RecipePlacement, type RecipeWithRatings } from './schema'
import { countOf } from '@/lib/plural'

/**
 * One recipe moved: where it goes and where it was. Only the placement, not
 * the whole recipe: a move sends three fields instead of every ingredient and
 * step, its undo is small enough to keep in the history, and undoing it can't
 * wipe out an edit made to the recipe since.
 */
export const recipeChangeSchema = z.object({
  id: z.string(),
  title: z.string(),
  to: recipePlacementSchema,
  from: recipePlacementSchema,
})

export type RecipeChange = z.infer<typeof recipeChangeSchema>

export interface MovePlan {
  /** The dish the recipes become versions of. */
  target: Dish
  /** Each recipe to move, with where it was (for undo). */
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
  const plan: MovePlan = { target, updates: [], losesRegion: [], unchanged: [] }

  for (const recipe of recipes) {
    if (recipe.dishId === target.id) {
      plan.unchanged.push(recipe.title)
      continue
    }
    const { id, title, dishId, cuisineId, regionId } = recipe
    const region = regionById.get(regionId)
    const keepsRegion = !regionId || region?.cuisineId === target.cuisineId
    if (!keepsRegion) plan.losesRegion.push({ title, region: region?.name ?? 'its region' })
    plan.updates.push({
      id,
      title,
      to: { dishId: target.id, cuisineId: target.cuisineId, regionId: keepsRegion ? regionId : '' },
      from: { dishId, cuisineId, regionId },
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
 * message), and browser history can only store what it can copy. It's also
 * kept in the change history, so it has a schema: stored data is validated
 * when it's read back.
 */
export const undoSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('move'), at: z.number(), recipes: z.array(recipeChangeSchema) }),
  z.object({ kind: z.literal('merge'), at: z.number(), source: dishSchema, target: dishSchema, recipes: z.array(recipeChangeSchema) }),
])

export type Undo = z.infer<typeof undoSchema>

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

/** The reverse of a move: each recipe back where it was. `dishId` replaces the old dish's id (a merged dish comes back with a new one). */
export const restoreRecipes = (recipes: RecipeChange[], dishId?: string): { id: string; title: string; to: RecipePlacement }[] =>
  recipes.map(({ id, title, from }) => ({ id, title, to: dishId ? { ...from, dishId } : from }))

/** What an undo brought back, for the message that replaces "Moved…". */
export function undoneMessage(undo: Undo): string {
  const n = undo.recipes.length
  if (undo.kind === 'merge') return `Undone: ${undo.source.name} is back${n > 0 ? `, with its ${countOf(n, 'version')}` : ''}.`
  return `Undone: ${n === 1 ? `${undo.recipes[0]!.title} is` : `${n} recipes are`} back where ${n === 1 ? 'it was' : 'they were'}.`
}

/**
 * A dish an earlier, unfinished undo already brought back: it remembers the
 * merged dish's id. Reusing it makes pressing Undo again safe (no second copy).
 */
export const findRestoredDish = (dishes: Dish[], undo: MergeUndo) =>
  dishes.find((dish) => dish.id !== undo.target.id && dish.mergedFrom?.some((merged) => merged.id === undo.source.id))
