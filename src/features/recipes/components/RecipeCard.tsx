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

/** Editorial card: the picture carries the card, text sits below it on the page. */
export function RecipeCard({ recipe, cuisine, showCuisineLabel = true }: RecipeCardProps) {
  const rating = summarizeRatings(recipe.ratings)

  return (
    <Link to={`/recipes/${recipe.id}`} style={cuisineTint(recipe.cuisineId)} className="group flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl">
        <RecipeCover
          recipe={recipe}
          emoji={recipe.emoji || cuisine?.emoji}
          className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        {cuisine && showCuisineLabel && (
          <span className="label-mono absolute top-3 left-3 rounded-full bg-surface/90 px-2.5 py-1 text-tint-ink backdrop-blur">
            {cuisine.name}
          </span>
        )}
      </div>
      <div className="space-y-1.5 px-0.5">
        <h3 className="text-[1.65rem] leading-tight decoration-1 underline-offset-4 group-hover:underline">
          {recipe.title}
        </h3>
        <p className="label-mono text-ink-muted tabular-nums">
          {formatDuration(totalMinutes(recipe))} · {DIFFICULTY_LABELS[recipe.difficulty]} · Serves {recipe.servings}
        </p>
        <StarRating value={rating.average} count={rating.count} />
      </div>
    </Link>
  )
}
