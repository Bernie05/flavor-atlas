import type { Cuisine } from '@/features/cuisines/schema'
import type { Dish, Region } from '@/features/dishes/schema'
import { countVersions } from '@/features/dishes/utils'
import type { RecipeWithRatings } from '@/features/recipes/schema'

/**
 * Lowercase and without accents, so "pho" finds "Phở" and "creme" finds "Crème".
 * NFD splits "ở" into "o" plus combining marks, which the regex then drops.
 */
export const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/đ/g, 'd') // Vietnamese đ is its own letter, not d plus a mark

/** The words a search is made of. "Chicken, garlic" → ["chicken", "garlic"]. */
export const searchTerms = (query: string) => normalize(query).split(/[^\p{L}\p{N}]+/u).filter(Boolean)

/**
 * How well one search word matches one piece of text: a whole word (1.2) beats
 * the start of a word (1, so "chick" finds "chicken"), which beats a match
 * inside a word (0.5, only for 3+ letters: "dobo" finds "adobo", "a" finds
 * nothing). A trailing "s" is forgiven, so "onions" finds "onion".
 */
function matchStrength(term: string, text: string): number {
  const words = normalize(text).split(/[^\p{L}\p{N}]+/u)
  const variants = term.length > 3 && term.endsWith('s') ? [term, term.slice(0, -1)] : [term]
  let best = 0
  for (const variant of variants) {
    for (const word of words) {
      if (word === variant) return 1.2
      if (word.startsWith(variant)) best = Math.max(best, 1)
      else if (variant.length >= 3 && word.includes(variant)) best = Math.max(best, 0.5)
    }
  }
  return best
}

interface Field {
  text: string
  /** How much a match here counts: a title outranks an ingredient, which outranks a description. */
  weight: number
  /** Set on ingredient fields, to tell the cook why a recipe came up. */
  ingredient?: string
}

/**
 * Every search word must match some field (so "chicken garlic" means both),
 * and each word counts where it matched best. Returns 0 for no match.
 */
function score(terms: string[], fields: Field[]): { score: number; ingredients: string[] } {
  let total = 0
  const ingredients = new Set<string>()
  for (const term of terms) {
    let best = 0
    let bestField: Field | undefined
    for (const field of fields) {
      const strength = matchStrength(term, field.text) * field.weight
      if (strength > best) [best, bestField] = [strength, field]
    }
    if (best === 0) return { score: 0, ingredients: [] }
    total += best
    if (bestField?.ingredient) ingredients.add(bestField.ingredient)
  }
  return { score: total, ingredients: [...ingredients] }
}

export interface RecipeHit {
  recipe: RecipeWithRatings
  /** Ingredients the search found in it, when that's why it matched: "Uses garlic". */
  matchedIngredients: string[]
}

export interface DishHit {
  dish: Dish
  versions: number
}

export interface SearchResults {
  cuisines: Cuisine[]
  dishes: DishHit[]
  recipes: RecipeHit[]
  total: number
}

export interface SearchSources {
  cuisines: Cuisine[]
  dishes: Dish[]
  regions: Region[]
  recipes: RecipeWithRatings[]
}

const EMPTY: SearchResults = { cuisines: [], dishes: [], recipes: [], total: 0 }

/** Highest score first; ties in name order so results don't jump around while typing. */
function rank<T>(items: { item: T; score: number; name: string }[]): T[] {
  return items
    .filter((entry) => entry.score > 0)
    .toSorted((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((entry) => entry.item)
}

/** One search across the whole atlas: cuisines, dishes and recipes, best matches first. */
export function searchAtlas(query: string, { cuisines, dishes, regions, recipes }: SearchSources): SearchResults {
  const terms = searchTerms(query)
  if (terms.length === 0) return EMPTY

  const cuisineName = new Map(cuisines.map((c) => [c.id, c.name]))
  const dishName = new Map(dishes.map((d) => [d.id, d.name]))
  const regionName = new Map(regions.map((r) => [r.id, r.name]))
  const versions = countVersions(recipes)

  const cuisineHits = rank(
    cuisines.map((cuisine) => ({
      item: cuisine,
      name: cuisine.name,
      score: score(terms, [
        { text: cuisine.name, weight: 10 },
        { text: cuisine.origin, weight: 5 },
        { text: cuisine.description, weight: 1 },
      ]).score,
    })),
  )

  const dishHits = rank(
    // A dish without recipes yet has nothing to show, as on the cuisine page.
    dishes.filter((dish) => versions.has(dish.id)).map((dish) => ({
      item: { dish, versions: versions.get(dish.id) ?? 0 },
      name: dish.name,
      score: score(terms, [
        { text: dish.name, weight: 10 },
        { text: cuisineName.get(dish.cuisineId) ?? '', weight: 4 },
        { text: dish.description, weight: 1 },
      ]).score,
    })),
  )

  const recipeHits = rank(
    recipes.map((recipe) => {
      const result = score(terms, [
        { text: recipe.title, weight: 10 },
        { text: dishName.get(recipe.dishId) ?? '', weight: 6 },
        { text: cuisineName.get(recipe.cuisineId) ?? '', weight: 4 },
        { text: regionName.get(recipe.regionId) ?? '', weight: 4 },
        { text: recipe.mainIngredient, weight: 4 },
        ...recipe.ingredients.map((ingredient) => {
          const name = ingredient.name.split(',')[0]!.trim()
          return { text: name, weight: 3, ingredient: name.toLowerCase() }
        }),
        { text: recipe.description, weight: 1 },
      ])
      return { item: { recipe, matchedIngredients: result.ingredients }, name: recipe.title, score: result.score }
    }),
  )

  return {
    cuisines: cuisineHits,
    dishes: dishHits,
    recipes: recipeHits,
    total: cuisineHits.length + dishHits.length + recipeHits.length,
  }
}
