import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { CardGridSkeleton } from '@/components/feedback/CardGridSkeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Plate } from '@/components/ui/Plate'
import { cuisineQueries } from '@/features/cuisines/queries'
import { cuisineTint, formatCoordinates } from '@/features/cuisines/utils'
import { RecipeBrowser } from '@/features/recipes/components/RecipeBrowser'
import { recipeQueries } from '@/features/recipes/queries'
import { NotFoundError } from '@/services/data'
import { NotFoundPage } from './NotFoundPage'

export function CuisinePage() {
  const { cuisineId = '' } = useParams()
  // A key tied to the cuisine resets search and filters when you switch cuisines.
  return <CuisineView key={cuisineId} cuisineId={cuisineId} />
}

function CuisineView({ cuisineId }: { cuisineId: string }) {
  const cuisine = useQuery(cuisineQueries.detail(cuisineId))
  const cuisines = useQuery(cuisineQueries.list())
  const recipes = useQuery(recipeQueries.list({ cuisineId }))

  if (cuisine.error instanceof NotFoundError) {
    return <NotFoundPage message="We don't have that cuisine in the atlas yet." />
  }

  return (
    <div className="space-y-10" style={cuisineTint(cuisineId)}>
      {cuisine.data && <title>{`${cuisine.data.name} recipes · Flavor Atlas`}</title>}

      <header className="atlas-dots -mx-4 grid items-center gap-6 px-4 py-10 sm:mx-0 sm:grid-cols-[1fr_auto] sm:rounded-3xl sm:px-10">
        <div className="min-w-0 space-y-3">
          <nav aria-label="Breadcrumb">
            <Link to="/recipes" className="label-mono inline-flex min-h-10 items-center text-tint-ink hover:underline">
              All recipes
            </Link>
          </nav>
          <h1 className="text-6xl sm:text-7xl">
            <em>{cuisine.data?.name ?? 'Loading…'}</em>
          </h1>
          {cuisine.data && (
            <p className="label-mono text-tint-ink tabular-nums">
              {cuisine.data.origin} · {formatCoordinates(cuisine.data)}
            </p>
          )}
          <p className="max-w-prose text-lg text-ink-muted">{cuisine.data?.description}</p>
        </div>
        <Plate emoji={cuisine.data?.emoji ?? '🍽️'} size="lg" className="justify-self-center sm:size-48 sm:text-8xl" />
      </header>

      {recipes.isPending || cuisines.isPending ? (
        <CardGridSkeleton />
      ) : recipes.isError || cuisines.isError ? (
        <ErrorState error={recipes.error ?? cuisines.error} onRetry={() => void recipes.refetch()} />
      ) : (
        <RecipeBrowser recipes={recipes.data} cuisines={cuisines.data} lockedCuisineId={cuisineId} />
      )}
    </div>
  )
}
