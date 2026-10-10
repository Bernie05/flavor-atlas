import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { CardGridSkeleton } from '@/components/feedback/CardGridSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { AdminEditLink } from '@/features/admin/components/AdminEditLink'
import { cuisineQueries } from '@/features/cuisines/queries'
import { cuisineTint } from '@/features/cuisines/utils'
import { dishQueries, regionQueries } from '@/features/dishes/queries'
import { RegionTag } from '@/features/dishes/components/RegionTag'
import { VersionComparison } from '@/features/dishes/components/VersionComparison'
import { groupVersions } from '@/features/dishes/utils'
import { RecipeCard } from '@/features/recipes/components/RecipeCard'
import { recipeQueries } from '@/features/recipes/queries'
import { NotFoundError } from '@/services/data'
import { NotFoundPage } from './NotFoundPage'

/** A dish and all its versions: the everyday ones, and the regional ones with their place on the map. */
export function DishPage() {
  const { dishId = '' } = useParams()
  const dish = useQuery(dishQueries.detail(dishId))
  const recipes = useQuery(recipeQueries.list({ dishId }))
  const cuisines = useQuery(cuisineQueries.list())
  const regions = useQuery(regionQueries.list())

  if (dish.error instanceof NotFoundError) return <NotFoundPage message="We don't have that dish in the atlas yet." />
  if (dish.isError || recipes.isError) {
    return <ErrorState error={dish.error ?? recipes.error} onRetry={() => {
          void dish.refetch()
          void recipes.refetch()
        }} />
  }
  if (dish.isPending || recipes.isPending) return <CardGridSkeleton />

  const cuisine = cuisines.data?.find((c) => c.id === dish.data.cuisineId)
  const regionById = new Map(regions.data?.map((r) => [r.id, r]))
  const { everyday, regional } = groupVersions(recipes.data)

  return (
    <div className="space-y-14" style={cuisineTint(dish.data.cuisineId)}>
      <title>{`${dish.data.name} · Flavor Atlas`}</title>

      <header className="max-w-3xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <nav aria-label="Breadcrumb" className="label-mono text-tint-ink">
            <Link to="/recipes" className="inline-flex min-h-10 items-center hover:underline">
              Recipes
            </Link>
            {cuisine && (
              <>
                <span aria-hidden> / </span>
                <Link to={`/cuisines/${cuisine.id}`} className="inline-flex min-h-10 items-center hover:underline">
                  {cuisine.name}
                </Link>
              </>
            )}
          </nav>
          <AdminEditLink to={`/admin/dishes/${dish.data.id}/edit`} label={dish.data.name} />
        </div>
        <h1 className="text-6xl sm:text-7xl">
          <em>{dish.data.name}</em>
        </h1>
        {dish.data.description && <p className="text-lg text-ink-muted">{dish.data.description}</p>}
        <p className="label-mono text-ink-subtle tabular-nums">
          {recipes.data.length} {recipes.data.length === 1 ? 'version' : 'versions'}
          {regional.length > 0 && ` · ${regional.length} from a particular place`}
        </p>
      </header>

      {recipes.data.length === 0 && (
        <EmptyState title="No versions yet" description="Recipes for this dish will show up here once they're added." />
      )}

      {everyday.length > 0 && (
        <section aria-labelledby="everyday-heading" className="space-y-5">
          <div>
            <h2 id="everyday-heading" className="text-4xl">
              Everyday versions
            </h2>
            <p className="mt-1 text-ink-muted">Cooked all over, changing with what's in the market.</p>
          </div>
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {everyday.map((recipe) => (
              <li key={recipe.id}>
                <RecipeCard recipe={recipe} cuisine={cuisine} showCuisineLabel={false} showVariantNote />
              </li>
            ))}
          </ul>
        </section>
      )}

      {regional.length > 0 && (
        <section aria-labelledby="regional-heading" className="space-y-5">
          <div>
            <h2 id="regional-heading" className="text-4xl">
              Regional <em>versions</em>
            </h2>
            <p className="mt-1 text-ink-muted">Each one belongs to a place. Here's where, and what makes it different.</p>
          </div>
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {regional.map((recipe) => {
              const region = regionById.get(recipe.regionId)
              return (
                <li key={recipe.id} className="space-y-3">
                  <RecipeCard recipe={recipe} cuisine={cuisine} showCuisineLabel={false} showVariantNote />
                  {region && <RegionTag region={region} className="block px-0.5 text-tint-ink" />}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <VersionComparison recipes={recipes.data} />
    </div>
  )
}
