import type { RecipeWithRatings } from '@/features/recipes/schema'

export interface DishVersions {
  /** Versions with no region: the classic and everyday ones. */
  everyday: RecipeWithRatings[]
  /** Versions tied to a place, grouped under their region. */
  regional: RecipeWithRatings[]
}

/** Split a dish's recipes into everyday and regional versions, each sorted by name. */
export function groupVersions(recipes: RecipeWithRatings[]): DishVersions {
  const byTitle = (a: RecipeWithRatings, b: RecipeWithRatings) => a.title.localeCompare(b.title)
  return {
    everyday: recipes.filter((r) => !r.regionId).toSorted(byTitle),
    regional: recipes.filter((r) => r.regionId).toSorted(byTitle),
  }
}

/** The other versions of the same dish, for "Other ways to cook …". */
export const otherVersions = (recipe: RecipeWithRatings, all: RecipeWithRatings[]) =>
  all.filter((r) => r.dishId === recipe.dishId && r.id !== recipe.id)

/** Number of versions per dish id. */
export function countVersions(recipes: RecipeWithRatings[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const recipe of recipes) counts.set(recipe.dishId, (counts.get(recipe.dishId) ?? 0) + 1)
  return counts
}
