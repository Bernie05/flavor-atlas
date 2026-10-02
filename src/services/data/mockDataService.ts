import { z } from 'zod'
import seed from '../../../db.seed.json'
import { cuisineSchema } from '@/features/cuisines/schema'
import { ratingSchema } from '@/features/ratings/schema'
import { recipeSchema, type Recipe } from '@/features/recipes/schema'
import type { DataService } from './DataService'
import { NotFoundError } from './errors'

const dbSchema = z.object({
  cuisines: z.array(cuisineSchema),
  recipes: z.array(recipeSchema),
  ratings: z.array(ratingSchema),
})

type Db = z.infer<typeof dbSchema>

// Parsed lazily on first use, so builds that use the http service don't pay for it.
let db: Db | undefined
const getDb = () => (db ??= dbSchema.parse(structuredClone(seed)))

/** Simulate network latency so loading states behave like the real thing. */
const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms))

const withRatings = (recipe: Recipe) => ({
  ...recipe,
  ratings: getDb().ratings.filter((rating) => rating.recipeId === recipe.id),
})

/**
 * In-memory implementation of DataService backed by db.seed.json.
 * Every result is a structuredClone, so callers can never mutate the "database"
 * by accident: the same guarantee a real network boundary gives you.
 */
export const mockDataService: DataService = {
  async listCuisines() {
    await delay()
    return structuredClone(getDb().cuisines)
  },

  async getCuisine(id) {
    await delay()
    const cuisine = getDb().cuisines.find((c) => c.id === id)
    if (!cuisine) throw new NotFoundError("We couldn't find that cuisine.")
    return structuredClone(cuisine)
  },

  async listRecipes(filters = {}) {
    await delay()
    const recipes = getDb().recipes.filter(
      (recipe) => !filters.cuisineId || recipe.cuisineId === filters.cuisineId,
    )
    return structuredClone(recipes.map(withRatings))
  },

  async getRecipe(id) {
    await delay()
    const recipe = getDb().recipes.find((r) => r.id === id)
    if (!recipe) throw new NotFoundError("We couldn't find that recipe.")
    return structuredClone(withRatings(recipe))
  },
}
