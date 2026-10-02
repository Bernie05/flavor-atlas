import { z } from 'zod'
import seed from '../../../db.seed.json'
import { cuisineSchema } from '@/features/cuisines/schema'
import { dishSchema, regionSchema, type Dish } from '@/features/dishes/schema'
import { ratingSchema, type Rating } from '@/features/ratings/schema'
import { recipeSchema, type Recipe } from '@/features/recipes/schema'
import type { DataService } from './DataService'
import { NotFoundError } from './errors'

export const dbSchema = z.object({
  cuisines: z.array(cuisineSchema),
  dishes: z.array(dishSchema),
  regions: z.array(regionSchema),
  recipes: z.array(recipeSchema),
  ratings: z.array(ratingSchema),
})

type Db = z.infer<typeof dbSchema>

// Parsed lazily on first use, so builds that use the http service don't pay for it.
let db: Db | undefined
const getDb = () => (db ??= dbSchema.parse(structuredClone(seed)))

/** Simulate network latency so loading states behave like the real thing. */
const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms))

function findRecipe(id: string): Recipe {
  const recipe = getDb().recipes.find((r) => r.id === id)
  if (!recipe) throw new NotFoundError("We couldn't find that recipe.")
  return recipe
}

const withRatings = (recipe: Recipe) => ({
  ...recipe,
  ratings: getDb().ratings.filter((rating) => rating.recipeId === recipe.id),
})

/**
 * In-memory implementation of DataService backed by db.seed.json.
 * Changes last until the page reloads.
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

  async listDishes() {
    await delay()
    return structuredClone(getDb().dishes)
  },

  async getDish(id) {
    await delay()
    const dish = getDb().dishes.find((d) => d.id === id)
    if (!dish) throw new NotFoundError("We couldn't find that dish.")
    return structuredClone(dish)
  },

  async createDish(input) {
    await delay()
    const dish: Dish = { ...input, id: crypto.randomUUID() }
    getDb().dishes.push(dish)
    return structuredClone(dish)
  },

  async listRegions() {
    await delay()
    return structuredClone(getDb().regions)
  },

  async listRecipes(filters = {}) {
    await delay()
    const recipes = getDb().recipes.filter(
      (recipe) =>
        (!filters.cuisineId || recipe.cuisineId === filters.cuisineId) &&
        (!filters.dishId || recipe.dishId === filters.dishId),
    )
    return structuredClone(recipes.map(withRatings))
  },

  async getRecipe(id) {
    await delay()
    return structuredClone(withRatings(findRecipe(id)))
  },

  async createRecipe(input) {
    await delay()
    const recipe: Recipe = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    getDb().recipes.push(recipe)
    return structuredClone(recipe)
  },

  async updateRecipe(id, input) {
    await delay()
    const recipe = Object.assign(findRecipe(id), input)
    return structuredClone(recipe)
  },

  async deleteRecipe(id) {
    await delay()
    const db = getDb()
    findRecipe(id) // throws NotFoundError, like the real API's 404
    db.recipes = db.recipes.filter((recipe) => recipe.id !== id)
    db.ratings = db.ratings.filter((rating) => rating.recipeId !== id)
  },

  async deleteRating(id) {
    await delay()
    const db = getDb()
    if (!db.ratings.some((rating) => rating.id === id)) throw new NotFoundError("We couldn't find that review.")
    db.ratings = db.ratings.filter((rating) => rating.id !== id)
  },

  async createRating(input) {
    await delay()
    findRecipe(input.recipeId) // can't rate a recipe that doesn't exist
    const rating: Rating = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    getDb().ratings.push(rating)
    return structuredClone(rating)
  },
}
