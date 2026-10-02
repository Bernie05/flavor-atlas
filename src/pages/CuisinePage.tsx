import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { CardGridSkeleton } from '@/components/feedback/CardGridSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Plate } from '@/components/ui/Plate'
import { cuisineQueries } from '@/features/cuisines/queries'
import { cuisineTint, formatCoordinates } from '@/features/cuisines/utils'
import { RecipeCard } from '@/features/recipes/components/RecipeCard'
import { recipeQueries } from '@/features/recipes/queries'
import {
  RECIPE_SORTS,
  filterRecipes,
  isRecipeSort,
  sortRecipes,
  type RecipeSort,
} from '@/features/recipes/utils'
import { NotFoundError } from '@/services/data'
import { NotFoundPage } from './NotFoundPage'

export function CuisinePage() {
  const { cuisineId = '' } = useParams()
  // A key tied to the cuisine resets search and sort when you switch cuisines.
  return <CuisineView key={cuisineId} cuisineId={cuisineId} />
}

function CuisineView({ cuisineId }: { cuisineId: string }) {
  const cuisine = useQuery(cuisineQueries.detail(cuisineId))
  const recipes = useQuery(recipeQueries.list({ cuisineId }))

  // Search and sort live in React state, so typing feels instant, and are
  // mirrored to the URL (?q=...&sort=...) so a filtered view survives a refresh
  // and can be shared. The URL is always rebuilt from state, never patched,
  // because React Router's URL updates can lag behind fast consecutive changes.
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [sort, setSort] = useState<RecipeSort>(() => {
    const param = searchParams.get('sort')
    return isRecipeSort(param) ? param : 'newest'
  })

  const applyFilters = (next: { query: string; sort: RecipeSort }) => {
    setQuery(next.query)
    setSort(next.sort)

    const params = new URLSearchParams()
    if (next.query) params.set('q', next.query)
    if (next.sort !== 'newest') params.set('sort', next.sort)
    setSearchParams(params, { replace: true })
  }

  if (cuisine.error instanceof NotFoundError) {
    return <NotFoundPage message="We don't have that cuisine in the atlas yet." />
  }

  const visibleRecipes = sortRecipes(filterRecipes(recipes.data ?? [], query), sort)

  return (
    <div className="space-y-6" style={cuisineTint(cuisineId)}>
      {cuisine.data && <title>{`${cuisine.data.name} recipes · Flavor Atlas`}</title>}

      <nav aria-label="Breadcrumb">
        <Link to="/" className="label-mono inline-block py-2 text-ink-muted hover:text-accent">
          ← All cuisines
        </Link>
      </nav>

      <header className="atlas-dots flex items-center gap-5 rounded-3xl p-5 sm:gap-8 sm:p-8">
        <Plate emoji={cuisine.data?.emoji ?? '🍽️'} size="md" className="sm:size-32 sm:text-6xl" />
        <div className="min-w-0 space-y-1.5">
          {cuisine.data && (
            <p className="label-mono text-tint-ink tabular-nums">
              {cuisine.data.origin} · {formatCoordinates(cuisine.data)}
            </p>
          )}
          <h1 className="text-4xl text-tint-ink sm:text-5xl">{cuisine.data?.name ?? 'Loading…'}</h1>
          <p className="text-ink-muted">{cuisine.data?.description}</p>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="recipe-search" className="sr-only">
          Search recipes
        </label>
        <input
          id="recipe-search"
          type="search"
          value={query}
          onChange={(event) => applyFilters({ query: event.target.value, sort })}
          placeholder="Search by name or ingredient"
          className="min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-4 py-2.5 placeholder:text-ink-subtle"
        />
        <label htmlFor="recipe-sort" className="sr-only">
          Sort recipes
        </label>
        <select
          id="recipe-sort"
          value={sort}
          onChange={(event) => {
            const value = event.target.value
            if (isRecipeSort(value)) applyFilters({ query, sort: value })
          }}
          className="rounded-full border border-line-strong bg-surface px-4 py-2.5"
        >
          {Object.entries(RECIPE_SORTS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl">Recipes</h2>
        <Link
          to={`/recipes/new?cuisine=${cuisineId}`}
          className="inline-flex min-h-10 items-center rounded-full border border-line-strong px-4 text-sm font-semibold whitespace-nowrap hover:bg-surface-sunken"
        >
          + Add {cuisine.data?.name ?? ''} recipe
        </Link>
      </div>
      {recipes.isPending ? (
        <CardGridSkeleton />
      ) : recipes.isError ? (
        <ErrorState error={recipes.error} onRetry={() => recipes.refetch()} />
      ) : visibleRecipes.length === 0 ? (
        <EmptyState
          title={query ? `No recipes match "${query}"` : 'No recipes here yet'}
          description={query ? 'Try a different name or ingredient.' : 'Be the first to add one.'}
          action={
            !query && (
              <Link
                to={`/recipes/new?cuisine=${cuisineId}`}
                className="inline-flex min-h-10 items-center rounded-full bg-ink px-4 font-semibold text-canvas hover:bg-accent"
              >
                Add a recipe
              </Link>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} cuisine={cuisine.data} showCuisineLabel={false} />
          ))}
        </div>
      )}
    </div>
  )
}
