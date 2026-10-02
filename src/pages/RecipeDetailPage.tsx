import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { ErrorState } from '@/components/feedback/ErrorState'
import { StarRating } from '@/components/ui/StarRating'
import { cuisineQueries } from '@/features/cuisines/queries'
import { summarizeRatings } from '@/features/ratings/summary'
import { RecipeCover } from '@/features/recipes/components/RecipeCover'
import { recipeQueries } from '@/features/recipes/queries'
import { DIFFICULTY_LABELS, formatDuration, formatQuantity, totalMinutes } from '@/features/recipes/utils'
import { NotFoundError } from '@/services/data'
import { NotFoundPage } from './NotFoundPage'

export function RecipeDetailPage() {
  const { recipeId = '' } = useParams()
  const recipeQuery = useQuery(recipeQueries.detail(recipeId))
  // Usually already cached from the home page, so this costs no extra request.
  const cuisines = useQuery(cuisineQueries.list())

  if (recipeQuery.error instanceof NotFoundError) {
    return <NotFoundPage message="This recipe may have been deleted." />
  }
  if (recipeQuery.isError) {
    return <ErrorState error={recipeQuery.error} onRetry={() => recipeQuery.refetch()} />
  }
  if (recipeQuery.isPending) {
    return <RecipeDetailSkeleton />
  }

  const recipe = recipeQuery.data
  const cuisine = cuisines.data?.find((c) => c.id === recipe.cuisineId)
  const rating = summarizeRatings(recipe.ratings)

  const facts = [
    { label: 'Prep', value: formatDuration(recipe.prepMinutes) },
    { label: 'Cook', value: formatDuration(recipe.cookMinutes) },
    { label: 'Total', value: formatDuration(totalMinutes(recipe)) },
    { label: 'Serves', value: String(recipe.servings) },
    { label: 'Difficulty', value: DIFFICULTY_LABELS[recipe.difficulty] },
  ]

  return (
    <article className="space-y-8">
      <title>{`${recipe.title} · Flavor Atlas`}</title>

      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <Link to="/" className="hover:text-accent">
          Cuisines
        </Link>
        {cuisine && (
          <>
            <span aria-hidden> / </span>
            <Link to={`/cuisines/${cuisine.id}`} className="hover:text-accent">
              {cuisine.name}
            </Link>
          </>
        )}
      </nav>

      <header className="grid gap-6 md:grid-cols-[1fr_minmax(0,20rem)] md:items-start">
        <div className="min-w-0 space-y-3">
          <h1 className="text-3xl font-bold sm:text-4xl">{recipe.title}</h1>
          <StarRating value={rating.average} count={rating.count} size="lg" />
          {recipe.description && <p className="max-w-prose text-ink-muted">{recipe.description}</p>}
        </div>
        <RecipeCover
          recipe={recipe}
          fallbackEmoji={cuisine?.emoji}
          className="aspect-[16/9] w-full rounded-xl md:aspect-[4/3]"
        />
      </header>

      <dl className="grid grid-cols-6 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-5">
        {facts.map((fact, index) => (
          <div
            key={fact.label}
            className={`bg-surface px-4 py-3 sm:col-span-1 ${index < 3 ? 'col-span-2' : 'col-span-3'}`}
          >
            <dt className="text-xs font-semibold tracking-wide text-ink-subtle uppercase">{fact.label}</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-8 md:grid-cols-[minmax(0,18rem)_1fr]">
        <section aria-labelledby="ingredients-heading" className="min-w-0">
          <h2 id="ingredients-heading" className="text-xl font-semibold">
            Ingredients
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={index} className="flex gap-3 py-2">
                <span className="w-20 shrink-0 font-semibold tabular-nums">
                  {ingredient.quantity !== undefined && formatQuantity(ingredient.quantity)} {ingredient.unit}
                </span>
                <span className="min-w-0">{ingredient.name}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="steps-heading" className="min-w-0">
          <h2 id="steps-heading" className="text-xl font-semibold">
            Steps
          </h2>
          <ol className="mt-3 space-y-4">
            {recipe.steps.map((step, index) => (
              <li key={index} className="flex gap-4">
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-accent font-semibold text-on-accent tabular-nums"
                >
                  {index + 1}
                </span>
                <p className="min-w-0 pt-1">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  )
}

function RecipeDetailSkeleton() {
  const bar = 'animate-pulse rounded bg-surface-sunken motion-reduce:animate-none'
  return (
    <div aria-busy="true" aria-label="Loading recipe" className="space-y-4">
      <div className={`h-4 w-32 ${bar}`} />
      <div className={`h-9 w-2/3 ${bar}`} />
      <div className={`h-4 w-40 ${bar}`} />
      <div className={`h-24 w-full ${bar}`} />
    </div>
  )
}
