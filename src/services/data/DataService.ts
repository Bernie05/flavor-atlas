import type { Cuisine } from '@/features/cuisines/schema'
import type { RecipeWithRatings } from '@/features/recipes/schema'

export interface RecipeFilters {
  cuisineId?: string
}

/**
 * The contract every data source must fulfil. Components and queries depend
 * on this interface, never on json-server or the mock directly, so the
 * backend can be swapped without touching UI code (dependency inversion).
 */
export interface DataService {
  listCuisines(): Promise<Cuisine[]>
  getCuisine(id: string): Promise<Cuisine>
  listRecipes(filters?: RecipeFilters): Promise<RecipeWithRatings[]>
  getRecipe(id: string): Promise<RecipeWithRatings>
}
