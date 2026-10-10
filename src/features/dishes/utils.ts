import type { RecipeWithRatings } from '@/features/recipes/schema'
import type { Dish } from './schema'

/** The dish an old, merged-away dish id now lives in, with the old name, for a "now part of" note. */
export function findMergedInto(dishes: Dish[], oldId: string): { dish: Dish; oldName: string } | undefined {
  for (const dish of dishes) {
    const merged = dish.mergedFrom?.find((entry) => entry.id === oldId)
    if (merged) return { dish, oldName: merged.name }
  }
  return undefined
}

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

/** How an ingredient is compared across versions: its name before any comma, lowercased ("Garlic, crushed" → "garlic"). */
export const ingredientKey = (name: string) => name.split(',')[0]!.trim().toLowerCase()

export interface VersionDifference<T> {
  recipe: T
  /** Ingredients no other version uses: what makes this one itself. */
  only: string[]
  /** Ingredients every other version uses but this one leaves out. */
  without: string[]
}

export interface VersionComparison<T> {
  /** Ingredients every version uses: the heart of the dish. */
  shared: string[]
  versions: VersionDifference<T>[]
}

/** Basics every kitchen has: "leaves out water" tells a cook nothing. */
const PANTRY_BASICS = new Set(['water', 'salt'])

/**
 * Compare a dish's versions by ingredient, ignoring pantry basics. Names keep the wording of the
 * first recipe that uses them. Needs at least two versions to say anything,
 * so a single version compares to nothing.
 */
export function compareVersions<T extends { ingredients: { name: string }[] }>(recipes: T[]): VersionComparison<T> {
  if (recipes.length < 2) return { shared: [], versions: [] }

  const display = new Map<string, string>()
  const keysOf = recipes.map((recipe) => {
    const keys = new Set<string>()
    for (const { name } of recipe.ingredients) {
      const key = ingredientKey(name)
      if (!key || PANTRY_BASICS.has(key)) continue
      keys.add(key)
      if (!display.has(key)) display.set(key, name.split(',')[0]!.trim())
    }
    return keys
  })
  const usedBy = (key: string) => keysOf.filter((keys) => keys.has(key)).length
  const label = (key: string) => display.get(key) ?? key
  const all = [...display.keys()]

  return {
    shared: all.filter((key) => usedBy(key) === recipes.length).map(label),
    versions: recipes.map((recipe, i) => ({
      recipe,
      only: [...keysOf[i]!].filter((key) => usedBy(key) === 1).map(label),
      without: all
        .filter((key) => !keysOf[i]!.has(key) && usedBy(key) === recipes.length - 1)
        .map(label),
    })),
  }
}
