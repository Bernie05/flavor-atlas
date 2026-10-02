import { Link } from 'react-router'
import { StarRating } from '@/components/ui/StarRating'
import type { Cuisine } from '@/features/cuisines/schema'
import { cuisineTint } from '@/features/cuisines/utils'
import { summarizeRatings } from '@/features/ratings/summary'
import type { RecipeWithRatings } from '../schema'
import { DIFFICULTY_LABELS, formatDuration, totalMinutes } from '../utils'
import { RecipeCover } from './RecipeCover'

interface RecipeCardProps {
  recipe: RecipeWithRatings
  cuisine?: Cuisine
  /** Hide the cuisine name when the page already shows it. */
  showCuisineLabel?: boolean
}

export function RecipeCard({ recipe, cuisine, showCuisineLabel = true }: RecipeCardProps) {
  const rating = summarizeRatings(recipe.ratings)

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      style={cuisineTint(recipe.cuisineId)}
      className="group flex flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-line transition hover:-translate-y-0.5 hover:ring-tint motion-reduce:hover:translate-y-0"
    >
      <RecipeCover recipe={recipe} emoji={recipe.emoji || cuisine?.emoji} className="aspect-[5/2] w-full sm:aspect-[16/10]" />
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {cuisine && showCuisineLabel && <span className="label-mono text-tint-ink">{cuisine.name}</span>}
        <h3 className="text-xl">{recipe.title}</h3>
        <p className="label-mono text-ink-muted tabular-nums">
          {formatDuration(totalMinutes(recipe))} · {DIFFICULTY_LABELS[recipe.difficulty]} · Serves{' '}
          {recipe.servings}
        </p>
        <div className="mt-auto pt-2">
          <StarRating value={rating.average} count={rating.count} />
        </div>
      </div>
    </Link>
  )
}
