import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { CardGridSkeleton } from '@/components/feedback/CardGridSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { CuisineFlag } from '@/features/cuisines/components/CuisineFlag'
import { cuisineQueries } from '@/features/cuisines/queries'
import { cuisineTint, formatCoordinates } from '@/features/cuisines/utils'
import { regionQueries } from '@/features/dishes/queries'
import { RecipeCard } from '@/features/recipes/components/RecipeCard'
import { recipeQueries } from '@/features/recipes/queries'
import { NotFoundPage } from './NotFoundPage'

/**
 * A regional kitchen: the versions of dishes that come from one place
 * (Batangas, Hakata…). Reached from its dot on the zoomed-in map and from
 * the 📍 tag on its recipes.
 */
export function RegionPage() {
  const { regionId = '' } = useParams()
  const regions = useQuery(regionQueries.list())
  const cuisines = useQuery(cuisineQueries.list())
  const recipes = useQuery(recipeQueries.list())
  const sources = [regions, cuisines, recipes]

  const region = regions.data?.find((r) => r.id === regionId)
  const cuisine = cuisines.data?.find((c) => c.id === region?.cuisineId)
  if (regions.data && !region) return <NotFoundPage message="We don't have that regional kitchen in the atlas." />

  const here = (recipes.data ?? []).filter((recipe) => recipe.regionId === regionId).toSorted((a, b) => a.title.localeCompare(b.title))

  return (
    <div className="space-y-10" style={cuisineTint(region?.cuisineId)}>
      {region && <title>{`${region.name} · ${cuisine?.name ?? 'Regional'} recipes · Flavor Atlas`}</title>}
      <header className="atlas-dots -mx-4 space-y-3 bg-tint-soft px-4 py-8 sm:mx-0 sm:rounded-3xl sm:px-10">
        <nav aria-label="Breadcrumb">
          {cuisine ? (
            <Link to={`/cuisines/${cuisine.id}`} className="label-mono inline-flex min-h-10 items-center gap-2 text-tint-ink hover:underline">
              <CuisineFlag countryCode={cuisine.countryCode} size="sm" />
              {cuisine.name}
            </Link>
          ) : (
            <span className="label-mono inline-flex min-h-10 items-center text-tint-ink">Regional kitchen</span>
          )}
        </nav>
        <h1 className="text-6xl sm:text-7xl">
          <em>{region?.name ?? 'Loading…'}</em>
        </h1>
        {region && (
          <p className="label-mono text-tint-ink tabular-nums">
            <span aria-hidden>📍 </span>
            Regional kitchen · {formatCoordinates(region)}
          </p>
        )}
      </header>

      <section aria-labelledby="region-recipes" className="space-y-4">
        <h2 id="region-recipes" className="text-4xl">
          Cooked here
        </h2>
        {sources.some((s) => s.isPending) ? (
          <div role="status">
            <span className="sr-only">Loading recipes…</span>
            <CardGridSkeleton count={3} />
          </div>
        ) : sources.some((s) => s.isError) ? (
          <ErrorState
            error={sources.find((s) => s.isError)?.error}
            onRetry={() => sources.forEach((s) => s.isError && void s.refetch())}
          />
        ) : here.length === 0 ? (
          <EmptyState title="No recipes from here yet" description="Versions of dishes from this place will appear here." />
        ) : (
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {here.map((recipe) => (
              <li key={recipe.id}>
                <RecipeCard recipe={recipe} cuisine={cuisine} showCuisineLabel={false} showVariantNote />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
