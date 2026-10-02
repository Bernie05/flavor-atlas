import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { CardGridSkeleton } from '@/components/feedback/CardGridSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { cuisineQueries } from '@/features/cuisines/queries'
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
    <div className="space-y-6">
      {cuisine.data && <title>{`${cuisine.data.name} recipes · Flavor Atlas`}</title>}

      <nav aria-label="Breadcrumb">
        <Link to="/" className="text-sm text-ink-muted hover:text-accent">
          ← All cuisines
        </Link>
      </nav>

      <header className="flex items-center gap-4">
        <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-xl bg-accent-soft text-3xl">
          {cuisine.data?.emoji ?? '🍽️'}
        </span>
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">{cuisine.data?.name ?? 'Loading…'}</h1>
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
          className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2 placeholder:text-ink-subtle"
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
          className="rounded-full border border-line bg-surface px-4 py-2"
        >
          {Object.entries(RECIPE_SORTS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {recipes.isPending ? (
        <CardGridSkeleton />
      ) : recipes.isError ? (
        <ErrorState error={recipes.error} onRetry={() => recipes.refetch()} />
      ) : visibleRecipes.length === 0 ? (
        <EmptyState
          title={query ? `No recipes match "${query}"` : 'No recipes here yet'}
          description={query ? 'Try a different name or ingredient.' : 'Be the first to add one.'}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} cuisine={cuisine.data} />
          ))}
        </div>
      )}
    </div>
  )
}
