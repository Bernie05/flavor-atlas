import type { Dish, Region } from '@/features/dishes/schema'
import type { RecipeInput, RecipeWithRatings } from './schema'

export interface MovePlan {
  /** Each recipe to save, as it will be after the move. */
  updates: { id: string; title: string; input: RecipeInput }[]
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
    })
  }
  return plan
}

export interface MergePlan {
  /** The dish that goes away once its recipes have moved. */
  source: Dish
  target: Dish
  moves: MovePlan
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
 */
export function planMerge(source: Dish, target: Dish, recipes: RecipeWithRatings[], regions: Region[]): MergePlan {
  if (source.cuisineId !== target.cuisineId) throw new Error('Only dishes of the same cuisine can be merged')
  const moves = planMove(
    recipes.filter((recipe) => recipe.dishId === source.id),
    target,
    regions,
  )
  return { source, target, moves }
}
