import { summarizeRatings } from '@/features/ratings/summary'
import type { RecipeWithRatings } from '@/features/recipes/schema'

/** Recipes per page in the admin list: a phone screen or two, and three pages for the seed. */
export const PAGE_SIZE = 12

/** How the admin can order the recipe list. Lowest rated is for finding what needs work. */
export const ADMIN_RECIPE_SORTS = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  name: 'Name, A to Z',
  'top-rated': 'Highest rated',
  'lowest-rated': 'Lowest rated',
} as const

export type AdminRecipeSort = keyof typeof ADMIN_RECIPE_SORTS

export const isAdminRecipeSort = (value: string | null): value is AdminRecipeSort => value !== null && value in ADMIN_RECIPE_SORTS

/** A new sorted array (the input is never changed). Ties keep a stable order by name. */
export function sortAdminRecipes(recipes: RecipeWithRatings[], sort: AdminRecipeSort): RecipeWithRatings[] {
  const byName = (a: RecipeWithRatings, b: RecipeWithRatings) => a.title.localeCompare(b.title)
  // Each recipe's average once, up front: a comparator runs n·log n times, and would re-average both recipes on every call.
  const summaries = new Map(recipes.map((recipe) => [recipe, summarizeRatings(recipe.ratings)]))
  const rating = (recipe: RecipeWithRatings) => summaries.get(recipe)!
  switch (sort) {
    case 'newest':
      return recipes.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt) || byName(a, b))
    case 'oldest':
      return recipes.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt) || byName(a, b))
    case 'name':
      return recipes.toSorted(byName)
    case 'top-rated':
      // Unrated recipes have no average to compare: they go last either way.
      return recipes.toSorted((a, b) => {
        const [ra, rb] = [rating(a), rating(b)]
        return Number(rb.count > 0) - Number(ra.count > 0) || rb.average - ra.average || rb.count - ra.count || byName(a, b)
      })
    case 'lowest-rated':
      return recipes.toSorted((a, b) => {
        const [ra, rb] = [rating(a), rating(b)]
        return Number(rb.count > 0) - Number(ra.count > 0) || ra.average - rb.average || rb.count - ra.count || byName(a, b)
      })
  }
}

export interface Page<T> {
  items: T[]
  /** The page shown, 1-based: a page past the end (after deleting) shows the last one. */
  page: number
  pageCount: number
  /** Positions of the first and last item shown, 1-based ("13–24 of 27"); 0 when empty. */
  first: number
  last: number
  total: number
}

/** One page of a list. Always at least one page, so an empty list is page 1 of 1. */
export function paginate<T>(items: T[], page: number, size = PAGE_SIZE): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount)
  const start = (current - 1) * size
  const shown = items.slice(start, start + size)
  return { items: shown, page: current, pageCount, first: shown.length ? start + 1 : 0, last: start + shown.length, total: items.length }
}

/** A page number from the URL (?page=2); anything else is page 1. */
export const parsePage = (value: string | null) => {
  const page = Number(value)
  return Number.isInteger(page) && page >= 1 ? page : 1
}

/**
 * The page numbers to show: all of them when few, else the first, the last
 * and the current one with its neighbours, gaps marked 'gap' ("1 … 4 5 6 … 20").
 */
export function pageNumbers(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const near = [1, page - 1, page, page + 1, pageCount].filter((n) => n >= 1 && n <= pageCount)
  const unique = [...new Set(near)].sort((a, b) => a - b)
  return unique.flatMap((n, i) => (i > 0 && n - unique[i - 1]! > 1 ? ['gap' as const, n] : [n]))
}
