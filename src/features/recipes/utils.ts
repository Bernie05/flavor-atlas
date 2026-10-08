import { summarizeRatings } from '@/features/ratings/summary'
import { config } from '@/lib/config'
import type { Difficulty, Ingredient, Recipe, RecipeWithRatings } from './schema'

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

/**
 * The src for a recipe photo. Bundled photos ("/photos/x.webp") are resolved
 * against the asset base, so they load in the phone demo too.
 */
export function photoSrc(imageUrl: string, assetBase = config.assetBase): string {
  return imageUrl.startsWith('/photos/') ? assetBase + imageUrl.slice(1) : imageUrl
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
/** The photo that stands for a cuisine: its best-rated recipe that has one. */
export function coverRecipe(recipes: RecipeWithRatings[], cuisineId: string): RecipeWithRatings | undefined {
  return sortRecipes(
    recipes.filter((recipe) => recipe.cuisineId === cuisineId && recipe.imageUrl),
    'top-rated',
  )[0]
}

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

/**
 * An ingredient's amount for `to` servings, as a cook reads it: "1½ cup",
 * "3", or "" when the recipe gives no quantity ("salt, to taste").
 */
export function formatAmount(ingredient: Pick<Ingredient, 'quantity' | 'unit'>, from: number, to: number): string {
  if (ingredient.quantity === undefined) return ingredient.unit
  return [formatQuantity(scaleQuantity(ingredient.quantity, from, to)), ingredient.unit].filter(Boolean).join(' ')
}

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

/** Time limits the browser offers, in minutes. */
export const TIME_LIMITS = [30, 60] as const

export interface RecipeFilterState {
  query: string
  cuisineId: string
  /** Only recipes ready within this many minutes; 0 means any time. */
  maxMinutes: number
  /** '' means any difficulty. */
  difficulty: Difficulty | ''
  /** A recipe's main ingredient ("pork"); '' means any. */
  ingredient: string
  sort: RecipeSort
}

export const DEFAULT_FILTERS: RecipeFilterState = {
  query: '',
  cuisineId: '',
  maxMinutes: 0,
  difficulty: '',
  ingredient: '',
  sort: 'newest',
}

const isDifficulty = (value: string | null): value is Difficulty =>
  value !== null && value in DIFFICULTY_LABELS

/** True when anything narrows the list (sort doesn't). The locked cuisine of a cuisine page doesn't count. */
export const hasActiveFilters = (filters: RecipeFilterState, lockedCuisineId?: string) =>
  Boolean(
    filters.query ||
      filters.maxMinutes ||
      filters.difficulty ||
      filters.ingredient ||
      (filters.cuisineId && filters.cuisineId !== lockedCuisineId),
  )

/**
 * Read filters from the URL. Unknown values fall back to the defaults, so a
 * hand-edited link never breaks the page. `quick=1` is the older link for
 * "under 30 minutes" and still works.
 */
export function filtersFromParams(params: URLSearchParams, lockedCuisineId?: string): RecipeFilterState {
  const time = Number(params.get('time'))
  const level = params.get('level')
  const sort = params.get('sort')
  return {
    query: params.get('q') ?? '',
    cuisineId: lockedCuisineId ?? params.get('cuisine') ?? '',
    maxMinutes: TIME_LIMITS.find((limit) => limit === time) ?? (params.get('quick') === '1' ? 30 : 0),
    difficulty: isDifficulty(level) ? level : '',
    ingredient: params.get('ingredient')?.trim().toLowerCase() ?? '',
    sort: isRecipeSort(sort) ? sort : DEFAULT_FILTERS.sort,
  }
}

/** The URL for a filter state: only what differs from the defaults, so links stay short. */
export function filtersToParams(filters: RecipeFilterState, lockedCuisineId?: string): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.query) params.set('q', filters.query)
  if (filters.cuisineId && !lockedCuisineId) params.set('cuisine', filters.cuisineId)
  if (filters.maxMinutes) params.set('time', String(filters.maxMinutes))
  if (filters.difficulty) params.set('level', filters.difficulty)
  if (filters.ingredient) params.set('ingredient', filters.ingredient)
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set('sort', filters.sort)
  return params
}

/** The main ingredients used in a list, most common first, for the ingredient filter. */
export function mainIngredients(recipes: Pick<Recipe, 'mainIngredient'>[]): string[] {
  const counts = new Map<string, number>()
  for (const { mainIngredient } of recipes) {
    const key = mainIngredient.trim().toLowerCase()
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts].toSorted(([a, ca], [b, cb]) => cb - ca || a.localeCompare(b)).map(([name]) => name)
}

/** Everything the recipe browser does to a list, in one tested function. */
export function applyRecipeFilters(recipes: RecipeWithRatings[], filters: RecipeFilterState): RecipeWithRatings[] {
  const matching = filterRecipes(recipes, filters.query).filter(
    (recipe) =>
      (!filters.cuisineId || recipe.cuisineId === filters.cuisineId) &&
      (!filters.maxMinutes || totalMinutes(recipe) <= filters.maxMinutes) &&
      (!filters.difficulty || recipe.difficulty === filters.difficulty) &&
      (!filters.ingredient || recipe.mainIngredient.trim().toLowerCase() === filters.ingredient),
  )
  return sortRecipes(matching, filters.sort)
}

export interface StepTimer {
  /** The words in the step, e.g. "10 to 15 minutes". */
  label: string
  seconds: number
}

/** Longer waits (marinating overnight) aren't something to watch a countdown for. */
const MAX_TIMER_SECONDS = 3 * 60 * 60

const UNIT_SECONDS: Record<string, number> = { sec: 1, min: 60, hour: 3600, hr: 3600 }

/**
 * The times a step mentions, as timers: "Simmer for 10 to 15 minutes" →
 * 10 minutes. A range starts at its lower bound, so the cook checks early
 * rather than late. Waits longer than three hours are left out.
 */
export function findStepTimers(step: string): StepTimer[] {
  const pattern = /\b(\d+(?:\.\d+)?)(?:\s*(?:to|–|-)\s*\d+(?:\.\d+)?)?\s*(sec|min|hour|hr)(?:ute|ond)?s?\b/gi
  const timers: StepTimer[] = []
  for (const match of step.matchAll(pattern)) {
    const seconds = Math.round(Number(match[1]) * UNIT_SECONDS[match[2]!.toLowerCase()]!)
    if (seconds > 0 && seconds <= MAX_TIMER_SECONDS) timers.push({ label: match[0], seconds })
  }
  return timers
}

/** 245 → "4:05", 3723 → "1:02:03" */
export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = String(seconds % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/** The recipe's ingredients a step mentions, in recipe order, each once. */
export function ingredientsInStep<T extends Pick<Ingredient, 'name'>>(step: string, ingredients: T[]): T[] {
  const mentioned = new Set(
    highlightIngredients(step, ingredients)
      .filter((segment) => segment.ingredient)
      .map((segment) => segment.text.toLowerCase()),
  )
  return ingredients.filter((ingredient) => mentioned.has(ingredient.name.split(',')[0]!.trim().toLowerCase()))
}
