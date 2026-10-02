import { Link } from 'react-router'
import { Plate } from '@/components/ui/Plate'
import { StarRating } from '@/components/ui/StarRating'
import type { Cuisine } from '@/features/cuisines/schema'
import { cuisineTint } from '@/features/cuisines/utils'
import { summarizeRatings } from '@/features/ratings/summary'
import type { RecipeWithRatings } from '../schema'
import { formatDuration, totalMinutes } from '../utils'

interface FeaturedRecipeCardProps {
  recipe: RecipeWithRatings
  cuisine?: Cuisine
}

/** The home page's spotlight: the top-rated recipe, shown large. */
export function FeaturedRecipeCard({ recipe, cuisine }: FeaturedRecipeCardProps) {
  const rating = summarizeRatings(recipe.ratings)

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      style={cuisineTint(recipe.cuisineId)}
      className="group atlas-dots relative flex items-center gap-5 overflow-hidden rounded-3xl p-5 ring-1 ring-tint/50 transition hover:ring-tint sm:p-7"
    >
      <Plate emoji={recipe.emoji || cuisine?.emoji || '🍽️'} size="md" className="sm:size-32 sm:text-6xl" />
      <div className="min-w-0 space-y-1.5">
        <p className="label-mono text-tint-ink">Top rated{cuisine && ` · ${cuisine.name}`}</p>
        <h2 className="text-2xl sm:text-3xl">{recipe.title}</h2>
        <StarRating value={rating.average} count={rating.count} />
        <p className="label-mono text-ink-muted tabular-nums">
          Ready in {formatDuration(totalMinutes(recipe))}
        </p>
      </div>
    </Link>
  )
}
