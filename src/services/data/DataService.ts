import type { Cuisine, CuisineInput, CuisineUpdate } from '@/features/cuisines/schema'
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
  /** Adds a cuisine with an id made from its name; fails with a 409 ApiError if that id is taken. */
  createCuisine(input: CuisineInput): Promise<Cuisine>
  /** Changes a cuisine; its id (page address, color names) stays. */
  updateCuisine(id: string, input: CuisineUpdate): Promise<Cuisine>
  /**
   * Deletes a cuisine with its empty dishes and its regions. Refused with a 409
   * ApiError while any recipe uses it, so no recipe is left without a cuisine.
   */
  deleteCuisine(id: string): Promise<void>
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
