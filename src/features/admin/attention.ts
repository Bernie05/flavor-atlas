import type { Cuisine } from '@/features/cuisines/schema'
import type { Dish } from '@/features/dishes/schema'
import { summarizeRatings } from '@/features/ratings/summary'
import type { RecipeWithRatings } from '@/features/recipes/schema'

/** One thing to fix, with where to fix it. */
export interface AttentionItem {
  id: string
  label: string
  /** Shown under the label: the cuisine, or the rating. */
  detail?: string
  to: string
  action: string
}

export type AttentionKind =
  | 'photo-credit'
  | 'empty-cuisine'
  | 'regional-note'
  | 'no-photo'
  | 'no-description'
  | 'empty-dish'
  | 'low-rating'
  | 'unrated'

export interface AttentionGroup {
  kind: AttentionKind
  title: string
  /** Why it matters, in one line. */
  why: string
  items: AttentionItem[]
}

/** Below this average a recipe is worth a look (with at least one review). */
export const LOW_RATING = 3

interface Sources {
  cuisines: Pick<Cuisine, 'id' | 'name'>[]
  dishes: Pick<Dish, 'id' | 'name' | 'cuisineId'>[]
  recipes: RecipeWithRatings[]
}

/**
 * Everything on the atlas that needs the admin, most important first: what
 * breaks a license or shows visitors an empty page, before what only looks
 * unfinished. Groups with nothing in them are left out, so an empty result
 * means all clear.
 */
export function findAttention({ cuisines, dishes, recipes }: Sources): AttentionGroup[] {
  const cuisineName = new Map(cuisines.map((c) => [c.id, c.name]))
  const byTitle = (a: RecipeWithRatings, b: RecipeWithRatings) => a.title.localeCompare(b.title)
  const sorted = recipes.toSorted(byTitle)
  const edit = (recipe: RecipeWithRatings): AttentionItem => ({
    id: recipe.id,
    label: recipe.title,
    detail: cuisineName.get(recipe.cuisineId),
    to: `/admin/recipes/${recipe.id}/edit`,
    action: 'Edit',
  })
  const used = (field: 'cuisineId' | 'dishId') => new Set(recipes.map((recipe) => recipe[field]))
  const usedCuisines = used('cuisineId')
  const usedDishes = used('dishId')

  const groups: AttentionGroup[] = [
    {
      kind: 'photo-credit',
      title: 'Photo without a credit',
      why: 'Free photo licenses require crediting the author.',
      items: sorted.filter((r) => r.imageUrl && !r.imageCredit.trim()).map(edit),
    },
    {
      kind: 'empty-cuisine',
      title: 'Cuisine with no recipes',
      why: 'Visitors who open it find an empty page.',
      items: cuisines
        .filter((c) => !usedCuisines.has(c.id))
        .map((c) => ({ id: c.id, label: c.name, to: `/admin/recipes/new?cuisine=${c.id}`, action: 'Add recipe' })),
    },
    {
      kind: 'regional-note',
      title: 'Regional version without its note',
      why: 'The note says what makes this version different.',
      items: sorted.filter((r) => r.regionId && !r.variantNote.trim()).map(edit),
    },
    {
      kind: 'no-photo',
      title: 'No photo yet',
      why: 'These show the dish emoji instead of a photo.',
      items: sorted.filter((r) => !r.imageUrl).map(edit),
    },
    {
      kind: 'no-description',
      title: 'No description',
      why: 'A line on the card tells visitors what to expect.',
      items: sorted.filter((r) => !r.description.trim()).map(edit),
    },
    {
      kind: 'empty-dish',
      title: 'Dish with no recipes',
      why: 'Left over after its last version was deleted.',
      items: dishes
        .filter((d) => !usedDishes.has(d.id))
        .toSorted((a, b) => a.name.localeCompare(b.name))
        .map((d) => ({ id: d.id, label: d.name, detail: cuisineName.get(d.cuisineId), to: `/admin/recipes/new?dish=${d.id}`, action: 'Add version' })),
    },
    {
      kind: 'low-rating',
      title: `Rated below ${LOW_RATING} stars`,
      why: 'Worth a look: a fix to the recipe may help.',
      items: recipes
        .map((recipe) => ({ recipe, rating: summarizeRatings(recipe.ratings) }))
        .filter(({ rating }) => rating.count > 0 && rating.average < LOW_RATING)
        .toSorted((a, b) => a.rating.average - b.rating.average || byTitle(a.recipe, b.recipe))
        .map(({ recipe, rating }) => ({
          id: recipe.id,
          label: recipe.title,
          detail: `${rating.average.toFixed(1)} stars from ${rating.count} ${rating.count === 1 ? 'review' : 'reviews'}`,
          to: `/recipes/${recipe.id}`,
          action: 'View',
        })),
    },
    {
      kind: 'unrated',
      title: 'No reviews yet',
      why: 'A first review helps visitors choose.',
      items: sorted
        .filter((r) => r.ratings.length === 0)
        .map((r) => ({ id: r.id, label: r.title, detail: cuisineName.get(r.cuisineId), to: `/admin/reviews?recipe=${r.id}`, action: 'Add review' })),
    },
  ]
  return groups.filter((group) => group.items.length > 0)
}
