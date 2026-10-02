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

/** The home page's cover story: the top-rated recipe, shown large. */
export function FeaturedRecipeCard({ recipe, cuisine }: FeaturedRecipeCardProps) {
  const rating = summarizeRatings(recipe.ratings)

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      style={cuisineTint(recipe.cuisineId)}
      className="group atlas-dots relative grid items-center gap-6 overflow-hidden rounded-3xl p-6 sm:grid-cols-[1fr_auto] sm:p-8"
    >
      <div className="min-w-0 space-y-3">
        <p className="label-mono text-tint-ink">Top rated{cuisine && ` · ${cuisine.name}`}</p>
        <h2 className="text-5xl decoration-1 underline-offset-[6px] group-hover:underline">{recipe.title}</h2>
        {recipe.description && <p className="line-clamp-3 max-w-md text-ink-muted">{recipe.description}</p>}
        <StarRating value={rating.average} count={rating.count} />
        <p className="label-mono text-ink-muted tabular-nums">
          Ready in {formatDuration(totalMinutes(recipe))} · Serves {recipe.servings}
        </p>
        <span className="mt-1 inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-canvas group-hover:bg-accent">
          Cook this
        </span>
      </div>
      <Plate
        emoji={recipe.emoji || cuisine?.emoji || '🍽️'}
        size="lg"
        className="order-first justify-self-center sm:order-none sm:size-52 sm:text-8xl"
      />
    </Link>
  )
}
