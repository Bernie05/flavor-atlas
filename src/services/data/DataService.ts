import type { Cuisine } from '@/features/cuisines/schema'
import type { Dish, DishInput, Region } from '@/features/dishes/schema'
import type { Rating, RatingInput } from '@/features/ratings/schema'
import type { Recipe, RecipeInput, RecipeWithRatings } from '@/features/recipes/schema'

export interface RecipeFilters {
  cuisineId?: string
  dishId?: string
}

/**
 * The contract every data source must fulfil. Components and queries depend
 * on this interface, never on json-server or the mock directly, so the
 * backend can be swapped without touching UI code (dependency inversion).
 */
export interface DataService {
  listCuisines(): Promise<Cuisine[]>
  getCuisine(id: string): Promise<Cuisine>
  listDishes(): Promise<Dish[]>
  getDish(id: string): Promise<Dish>
  createDish(input: DishInput): Promise<Dish>
  listRegions(): Promise<Region[]>
  listRecipes(filters?: RecipeFilters): Promise<RecipeWithRatings[]>
  getRecipe(id: string): Promise<RecipeWithRatings>
  createRecipe(input: RecipeInput): Promise<Recipe>
  updateRecipe(id: string, input: RecipeInput): Promise<Recipe>
  /** Deletes the recipe and all of its ratings. */
  deleteRecipe(id: string): Promise<void>
  createRating(input: RatingInput): Promise<Rating>
  deleteRating(id: string): Promise<void>
}
