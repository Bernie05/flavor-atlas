import { summarizeRatings } from '@/features/ratings/summary'
import type { Difficulty, Ingredient, Recipe, RecipeWithRatings } from './schema'

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

export const totalMinutes = (recipe: Pick<Recipe, 'prepMinutes' | 'cookMinutes'>) =>
  recipe.prepMinutes + recipe.cookMinutes

/** 45 → "45 min", 60 → "1 hr", 75 → "1 hr 15 min" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`
}

// Cooks read "½ cup", not "0.5 cup".
const FRACTIONS: [value: number, glyph: string][] = [
  [0.25, '¼'],
  [0.33, '⅓'],
  [0.5, '½'],
  [0.67, '⅔'],
  [0.75, '¾'],
]

/** 0.5 → "½", 1.5 → "1½", 0.33 → "⅓", 400 → "400", 1.2 → "1.2" */
export function formatQuantity(quantity: number): string {
  const whole = Math.floor(quantity)
  const remainder = quantity - whole
  if (remainder < 0.01) return String(whole)

  const fraction = FRACTIONS.find(([value]) => Math.abs(value - remainder) < 0.02)
  if (fraction) return `${whole > 0 ? whole : ''}${fraction[1]}`

  return String(Math.round(quantity * 100) / 100)
}

/** Case-insensitive match on title, description and ingredient names. */
export function filterRecipes<T extends Recipe>(recipes: T[], query: string): T[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return recipes

  return recipes.filter((recipe) =>
    [recipe.title, recipe.description, ...recipe.ingredients.map((i) => i.name)].some((text) =>
      text.toLowerCase().includes(needle),
    ),
  )
}

export const RECIPE_SORTS = {
  newest: 'Newest',
  'top-rated': 'Top rated',
  quickest: 'Quickest',
} as const

export type RecipeSort = keyof typeof RECIPE_SORTS

export const isRecipeSort = (value: string | null): value is RecipeSort =>
  value !== null && value in RECIPE_SORTS

/** Returns a new sorted array; the input is never mutated. */
export function sortRecipes(recipes: RecipeWithRatings[], sort: RecipeSort): RecipeWithRatings[] {
  switch (sort) {
    case 'newest':
      return recipes.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
    case 'top-rated':
      // Highest average first; between equal averages, more ratings wins.
      return recipes.toSorted((a, b) => {
        const ra = summarizeRatings(a.ratings)
        const rb = summarizeRatings(b.ratings)
        return rb.average - ra.average || rb.count - ra.count
      })
    case 'quickest':
      return recipes.toSorted((a, b) => totalMinutes(a) - totalMinutes(b))
  }
}

/** Rescale a quantity written for `from` servings to `to` servings. */
export const scaleQuantity = (quantity: number, from: number, to: number) => (quantity * to) / from

export interface StepSegment {
  text: string
  /** True when this piece of the step names one of the recipe's ingredients. */
  ingredient: boolean
}

/**
 * Split a step into plain text and ingredient mentions, so the page can
 * highlight them ("Add the **soy sauce** and **garlic**"). The key for each
 * ingredient is its name before any comma ("garlic, crushed" → "garlic").
 * Longer names match first, so "soy sauce" wins over "sauce".
 */
export function highlightIngredients(step: string, ingredients: Pick<Ingredient, 'name'>[]): StepSegment[] {
  const keys = [
    ...new Set(
      ingredients
        .map((i) => i.name.split(',')[0]!.trim().toLowerCase())
        .filter((key) => key.length >= 3),
    ),
  ].sort((a, b) => b.length - a.length)
  if (keys.length === 0) return [{ text: step, ingredient: false }]

  const escaped = keys.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi')

  const segments: StepSegment[] = []
  let last = 0
  for (const match of step.matchAll(pattern)) {
    if (match.index > last) segments.push({ text: step.slice(last, match.index), ingredient: false })
    segments.push({ text: match[0], ingredient: true })
    last = match.index + match[0].length
  }
  if (last < step.length) segments.push({ text: step.slice(last), ingredient: false })
  return segments
}

/** Recipes ready within `maxMinutes`, quickest first. */
export const quickRecipes = (recipes: RecipeWithRatings[], maxMinutes = 30) =>
  sortRecipes(
    recipes.filter((recipe) => totalMinutes(recipe) <= maxMinutes),
    'quickest',
  )

export interface RecipeFilterState {
  query: string
  cuisineId: string
  /** Only recipes ready in 30 minutes or less. */
  quick: boolean
  sort: RecipeSort
}

export const DEFAULT_FILTERS: RecipeFilterState = { query: '', cuisineId: '', quick: false, sort: 'newest' }

/** Everything the recipe browser does to a list, in one tested function. */
export function applyRecipeFilters(recipes: RecipeWithRatings[], filters: RecipeFilterState): RecipeWithRatings[] {
  const matching = filterRecipes(recipes, filters.query).filter(
    (recipe) =>
      (!filters.cuisineId || recipe.cuisineId === filters.cuisineId) && (!filters.quick || totalMinutes(recipe) <= 30),
  )
  return sortRecipes(matching, filters.sort)
}
