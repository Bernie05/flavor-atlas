import { Link } from 'react-router'
import { FoodEmoji } from '@/components/ui/FoodEmoji'
import { StarRating } from '@/components/ui/StarRating'
import { CuisineCloth } from '@/features/cuisines/components/CuisineCloth'
import type { Cuisine } from '@/features/cuisines/schema'
import { cuisineTint } from '@/features/cuisines/utils'
import { summarizeRatings } from '@/features/ratings/summary'
import type { RecipeWithRatings } from '../schema'
import { usePhoto } from '../usePhoto'
import { formatDuration, totalMinutes } from '../utils'

interface FeaturedRecipeCardProps {
  recipe: RecipeWithRatings
  cuisine?: Cuisine
}

/** The home page's cover story: the top-rated recipe, shown large. */
export function FeaturedRecipeCard({ recipe, cuisine }: FeaturedRecipeCardProps) {
  const rating = summarizeRatings(recipe.ratings)
  const photo = usePhoto(recipe.imageUrl)

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      style={cuisineTint(recipe.cuisineId)}
      className={`group relative isolate grid items-center gap-6 overflow-hidden rounded-3xl p-6 sm:p-8 ${
        photo.visible ? 'on-photo pt-56 sm:pt-72' : 'bg-tint-soft sm:grid-cols-[1fr_auto]'
      }`}
    >
      {photo.visible && (
        <>
          <img
            src={photo.src}
            alt=""
            loading="lazy"
            onError={photo.onError}
            className="absolute inset-0 -z-10 size-full bg-surface-sunken object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
          <div aria-hidden className="photo-scrim absolute inset-0 -z-10" />
        </>
      )}
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
      {!photo.visible && (
        <CuisineCloth
          cuisineId={recipe.cuisineId}
          className="order-first aspect-[4/3] w-full rounded-2xl sm:order-none sm:aspect-square sm:w-64"
        >
          <FoodEmoji emoji={recipe.emoji || cuisine?.emoji || '🍽️'} size="lg" />
        </CuisineCloth>
      )}
    </Link>
  )
}
