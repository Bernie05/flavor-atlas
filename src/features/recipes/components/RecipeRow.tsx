import { Link } from 'react-router'
import type { Cuisine } from '@/features/cuisines/schema'
import type { RecipeWithRatings } from '../schema'
import { RecipeCard } from './RecipeCard'

interface RecipeRowProps {
  id: string
  title: string
  description: string
  recipes: RecipeWithRatings[]
  cuisinesById: Map<string, Cuisine>
  /** Where "See all" goes. */
  moreHref?: string
}

/**
 * A collection ("Ready in 30 minutes", "Most loved"). Swipes sideways on
 * phones, so several collections fit on one screen; a grid on wider screens.
 */
export function RecipeRow({ id, title, description, recipes, cuisinesById, moreHref }: RecipeRowProps) {
  if (recipes.length === 0) return null

  return (
    <section aria-labelledby={id} className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 id={id} className="text-4xl">
            {title}
          </h2>
          <p className="mt-1 text-ink-muted">{description}</p>
        </div>
        {moreHref && (
          <Link to={moreHref} className="label-mono inline-flex min-h-10 items-center shrink-0 text-accent-ink hover:underline">
            See all<span className="sr-only"> {title}</span>
          </Link>
        )}
      </div>
      <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-5 sm:scroll-px-0 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {recipes.map((recipe) => (
          <li key={recipe.id} className="w-[78%] shrink-0 snap-start sm:w-auto">
            <RecipeCard recipe={recipe} cuisine={cuisinesById.get(recipe.cuisineId)} />
          </li>
        ))}
      </ul>
    </section>
  )
}
