import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { CardGridSkeleton } from '@/components/feedback/CardGridSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { FlashMessage } from '@/features/admin/components/FlashMessage'
import { CuisineFlag } from '@/features/cuisines/components/CuisineFlag'
import { countryName } from '@/features/cuisines/flags'
import { cuisineQueries } from '@/features/cuisines/queries'
import { cuisineTint, formatCoordinates } from '@/features/cuisines/utils'
import { recipeQueries } from '@/features/recipes/queries'

const actionClass = 'inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold hover:bg-surface-sunken'

/** Every cuisine on the atlas, with a way to add one and to add a recipe to each. */
export function AdminCuisinesPage() {
  const cuisines = useQuery(cuisineQueries.list())
  const recipes = useQuery(recipeQueries.list())

  return (
    <div className="space-y-6">
      <title>Cuisines · Flavor Atlas admin</title>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl">Cuisines</h1>
          {cuisines.data && <p className="label-mono mt-1 text-ink-subtle tabular-nums">{cuisines.data.length} on the map</p>}
        </div>
        <Link to="/admin/cuisines/new" className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 font-semibold text-canvas hover:bg-accent">
          + New cuisine
        </Link>
      </header>
      <FlashMessage />

      {cuisines.isPending || recipes.isPending ? (
        <CardGridSkeleton count={4} />
      ) : cuisines.isError || recipes.isError ? (
        <ErrorState
          error={cuisines.error ?? recipes.error}
          onRetry={() => {
            if (cuisines.isError) void cuisines.refetch()
            if (recipes.isError) void recipes.refetch()
          }}
        />
      ) : cuisines.data.length === 0 ? (
        <EmptyState title="No cuisines yet" description="Add the first one and it appears on the map." />
      ) : (
        <ul className="divide-y divide-line rounded-2xl bg-surface ring-1 ring-line">
          {cuisines.data.map((cuisine) => {
            const count = recipes.data.filter((recipe) => recipe.cuisineId === cuisine.id).length
            return (
              <li key={cuisine.id} style={cuisineTint(cuisine.id)} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-tint-soft">
                  <CuisineFlag countryCode={cuisine.countryCode} size="md" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-2xl leading-tight">{cuisine.name}</p>
                  <p className="label-mono text-ink-subtle tabular-nums">
                    {countryName(cuisine.countryCode)} · {cuisine.origin} · {formatCoordinates(cuisine)} · {count}{' '}
                    {count === 1 ? 'recipe' : 'recipes'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Link to={`/cuisines/${cuisine.id}`} className={`${actionClass} text-ink-muted`}>
                    View<span className="sr-only"> {cuisine.name}</span>
                  </Link>
                  <Link to={`/admin/recipes/new?cuisine=${cuisine.id}`} className={actionClass}>
                    Add recipe<span className="sr-only"> to {cuisine.name}</span>
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
