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
