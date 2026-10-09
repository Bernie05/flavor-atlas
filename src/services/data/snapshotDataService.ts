import { z } from 'zod'
import { cuisineSchema, type Cuisine } from '@/features/cuisines/schema'
import { cuisineIdFor } from '@/features/cuisines/utils'
import { dishSchema, regionSchema, type Dish } from '@/features/dishes/schema'
import { ratingSchema, type Rating } from '@/features/ratings/schema'
import { recipeSchema, type Recipe } from '@/features/recipes/schema'
import type { DataService } from './DataService'
import { cuisineExists, cuisineNameInvalid, NotFoundError } from './errors'

export const dbSchema = z.object({
  cuisines: z.array(cuisineSchema),
  dishes: z.array(dishSchema),
  regions: z.array(regionSchema),
  recipes: z.array(recipeSchema),
  ratings: z.array(ratingSchema),
})

export type Db = z.infer<typeof dbSchema>

/** The collections the app can change. Cuisines and regions are fixed. */
export type WritableCollection = 'cuisines' | 'dishes' | 'recipes' | 'ratings'

export interface WritableRecords {
  cuisines: Cuisine
  dishes: Dish
  recipes: Recipe
  ratings: Rating
}

/**
 * Where a snapshot-based service keeps its data. Two small verbs are all a
 * backend has to provide: read the whole database, and put one record
 * (`null` deletes it). The in-memory mock and the artifact's shared
 * database both implement it, so the query logic below exists once.
 */
export interface SnapshotStore {
  read(): Promise<Db>
  put<C extends WritableCollection>(collection: C, id: string, record: WritableRecords[C] | null): Promise<void>
}

const withRatings = (db: Db, recipe: Recipe) => ({
  ...recipe,
  ratings: db.ratings.filter((rating) => rating.recipeId === recipe.id),
})

function findRecipe(db: Db, id: string): Recipe {
  const recipe = db.recipes.find((r) => r.id === id)
  if (!recipe) throw new NotFoundError("We couldn't find that recipe.")
  return recipe
}

/**
 * A DataService over any {@link SnapshotStore}. Every result is a
 * structuredClone, so callers can never mutate the store by accident: the
 * same guarantee a real network boundary gives you.
 */
export function createSnapshotDataService(store: SnapshotStore): DataService {
  return {
    async listCuisines() {
      return structuredClone((await store.read()).cuisines)
    },

    async getCuisine(id) {
      const cuisine = (await store.read()).cuisines.find((c) => c.id === id)
      if (!cuisine) throw new NotFoundError("We couldn't find that cuisine.")
      return structuredClone(cuisine)
    },

    async createCuisine(input) {
      const cuisine: Cuisine = { ...input, id: cuisineIdFor(input.name) }
      if (!cuisine.id) throw cuisineNameInvalid()
      if ((await store.read()).cuisines.some((c) => c.id === cuisine.id)) throw cuisineExists(input.name)
      await store.put('cuisines', cuisine.id, cuisine)
      return structuredClone(cuisine)
    },

    async listDishes() {
      return structuredClone((await store.read()).dishes)
    },

    async getDish(id) {
      const dish = (await store.read()).dishes.find((d) => d.id === id)
      if (!dish) throw new NotFoundError("We couldn't find that dish.")
      return structuredClone(dish)
    },

    async createDish(input) {
      const dish: Dish = { ...input, id: crypto.randomUUID() }
      await store.put('dishes', dish.id, dish)
      return structuredClone(dish)
    },

    async listRegions() {
      return structuredClone((await store.read()).regions)
    },

    async listRecipes(filters = {}) {
      const db = await store.read()
      const recipes = db.recipes.filter(
        (recipe) =>
          (!filters.cuisineId || recipe.cuisineId === filters.cuisineId) &&
          (!filters.dishId || recipe.dishId === filters.dishId),
      )
      return structuredClone(recipes.map((recipe) => withRatings(db, recipe)))
    },

    async getRecipe(id) {
      const db = await store.read()
      return structuredClone(withRatings(db, findRecipe(db, id)))
    },

    async createRecipe(input) {
      const recipe: Recipe = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
      await store.put('recipes', recipe.id, recipe)
      return structuredClone(recipe)
    },

    async updateRecipe(id, input) {
      const recipe: Recipe = { ...findRecipe(await store.read(), id), ...input }
      await store.put('recipes', id, recipe)
      return structuredClone(recipe)
    },

    async deleteRecipe(id) {
      const db = await store.read()
      findRecipe(db, id) // throws NotFoundError, like the real API's 404
      // Ratings first: if a write fails midway, no rating is left pointing at a missing recipe.
      for (const rating of db.ratings.filter((r) => r.recipeId === id)) await store.put('ratings', rating.id, null)
      await store.put('recipes', id, null)
    },

    async deleteRating(id) {
      if (!(await store.read()).ratings.some((rating) => rating.id === id)) {
        throw new NotFoundError("We couldn't find that review.")
      }
      await store.put('ratings', id, null)
    },

    async createRating(input) {
      findRecipe(await store.read(), input.recipeId) // can't rate a recipe that doesn't exist
      const rating: Rating = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
      await store.put('ratings', rating.id, rating)
      return structuredClone(rating)
    },
  }
}

/** Replace or remove one record in a list by id, returning a new list. */
export function putRecord<T extends { id: string }>(list: T[], id: string, record: T | null): T[] {
  const rest = list.filter((item) => item.id !== id)
  if (!record) return rest
  const index = list.findIndex((item) => item.id === id)
  return index === -1 ? [...rest, record] : [...rest.slice(0, index), record, ...rest.slice(index)]
}

/** A new database with one record replaced, added or (with `null`) removed. */
export function applyPut<C extends WritableCollection>(db: Db, collection: C, id: string, record: WritableRecords[C] | null): Db {
  // A switch, because TypeScript can't link a generic key to its record type in `{ [collection]: ... }`.
  switch (collection) {
    case 'cuisines':
      return { ...db, cuisines: putRecord(db.cuisines, id, record as Cuisine | null) }
    case 'dishes':
      return { ...db, dishes: putRecord(db.dishes, id, record as Dish | null) }
    case 'recipes':
      return { ...db, recipes: putRecord(db.recipes, id, record as Recipe | null) }
    case 'ratings':
      return { ...db, ratings: putRecord(db.ratings, id, record as Rating | null) }
  }
  throw new Error(`Unknown collection: ${String(collection)}`)
}
