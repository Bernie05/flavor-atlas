import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { StarRating } from '@/components/ui/StarRating'
import type { Cuisine } from '@/features/cuisines/schema'
import { cuisineTint } from '@/features/cuisines/utils'
import { regionQueries } from '@/features/dishes/queries'
import { summarizeRatings } from '@/features/ratings/summary'
import { SaveButton } from '@/features/saved/components/SaveButton'
import type { RecipeWithRatings } from '../schema'
import { DIFFICULTY_LABELS, formatDuration, totalMinutes } from '../utils'
import { RecipeCover } from './RecipeCover'

interface RecipeCardProps {
  recipe: RecipeWithRatings
  cuisine?: Cuisine
  /** Hide the cuisine name when the page already shows it. */
  showCuisineLabel?: boolean
  /** Show the version note ("Turmeric instead of soy sauce…") under the title. */
  showVariantNote?: boolean
}

/** Editorial card: the picture carries the card, text sits below it on the page. */
export function RecipeCard({ recipe, cuisine, showCuisineLabel = true, showVariantNote = false }: RecipeCardProps) {
  const rating = summarizeRatings(recipe.ratings)
  // Regions rarely change and stay cached, so every card can look its own up.
  const region = useQuery(regionQueries.list()).data?.find((r) => r.id === recipe.regionId)
  // The badge names the place: the region for a regional version, else the cuisine.
  const badge = region?.name ?? (showCuisineLabel ? cuisine?.name : undefined)

  return (
    // The heart is a sibling of the link, not inside it: a button inside a link is invalid HTML
    // and confuses keyboards and screen readers.
    <div className="relative" style={cuisineTint(recipe.cuisineId)}>
      <Link to={`/recipes/${recipe.id}`} className="group flex flex-col gap-3">
        <div className="relative overflow-hidden rounded-2xl">
          <RecipeCover
            recipe={recipe}
            emoji={recipe.emoji || cuisine?.emoji}
            className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
          {badge && (
            <span className="label-mono absolute top-3 left-3 rounded-full bg-surface/90 px-2.5 py-1 text-tint-ink backdrop-blur">
              {region && <span aria-hidden>📍 </span>}
              {badge}
            </span>
          )}
        </div>
        <div className="space-y-1.5 px-0.5">
          <h3 className="text-[1.65rem] leading-tight decoration-1 underline-offset-4 group-hover:underline">
            {recipe.title}
          </h3>
          {showVariantNote && recipe.variantNote && <p className="text-sm text-ink-muted">{recipe.variantNote}</p>}
          <p className="label-mono text-ink-muted tabular-nums">
            {formatDuration(totalMinutes(recipe))} · {DIFFICULTY_LABELS[recipe.difficulty]} · Serves {recipe.servings}
          </p>
          <StarRating value={rating.average} count={rating.count} />
        </div>
      </Link>
      <SaveButton recipeId={recipe.id} recipeTitle={recipe.title} variant="icon" className="absolute top-2 right-2" />
    </div>
  )
}
