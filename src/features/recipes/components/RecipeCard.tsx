import { Link } from 'react-router'
import { StarRating } from '@/components/ui/StarRating'
import type { Cuisine } from '@/features/cuisines/schema'
import { summarizeRatings } from '@/features/ratings/summary'
import type { RecipeWithRatings } from '../schema'
import { DIFFICULTY_LABELS, formatDuration, totalMinutes } from '../utils'
import { RecipeCover } from './RecipeCover'

interface RecipeCardProps {
  recipe: RecipeWithRatings
  cuisine?: Cuisine
}

export function RecipeCard({ recipe, cuisine }: RecipeCardProps) {
  const rating = summarizeRatings(recipe.ratings)

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-accent"
    >
      <RecipeCover recipe={recipe} fallbackEmoji={cuisine?.emoji} className="aspect-[5/2] w-full sm:aspect-[16/10]" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        {cuisine && (
          <span className="text-xs font-semibold tracking-wide text-accent-ink uppercase">
            {cuisine.name}
          </span>
        )}
        <h3 className="text-lg leading-snug font-semibold group-hover:text-accent">{recipe.title}</h3>
        <p className="text-sm text-ink-muted tabular-nums">
          {formatDuration(totalMinutes(recipe))} · {DIFFICULTY_LABELS[recipe.difficulty]} · Serves{' '}
          {recipe.servings}
        </p>
        <div className="mt-auto pt-1">
          <StarRating value={rating.average} count={rating.count} />
        </div>
      </div>
    </Link>
  )
}
