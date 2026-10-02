import { summarizeRatings } from '@/features/ratings/summary'
import type { Rating } from '@/features/ratings/schema'
import type { RecipeWithRatings } from '@/features/recipes/schema'

export interface AtlasStats {
  recipes: number
  cuisines: number
  reviews: number
  /** Average of every review, or 0 with no reviews. */
  averageScore: number
  /** Recipes nobody has rated yet. */
  unrated: number
}

export function computeStats(recipes: RecipeWithRatings[], cuisineCount: number): AtlasStats {
  const allRatings = recipes.flatMap((recipe) => recipe.ratings)
  return {
    recipes: recipes.length,
    cuisines: cuisineCount,
    reviews: allRatings.length,
    averageScore: summarizeRatings(allRatings).average,
    unrated: recipes.filter((recipe) => recipe.ratings.length === 0).length,
  }
}

export interface ReviewRow extends Rating {
  recipeTitle: string
}

/** Every review with its recipe's title, newest first: the admin review list. */
export function listReviews(recipes: RecipeWithRatings[]): ReviewRow[] {
  return recipes
    .flatMap((recipe) => recipe.ratings.map((rating) => ({ ...rating, recipeTitle: recipe.title })))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
