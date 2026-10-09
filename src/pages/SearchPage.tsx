import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation, useNavigationType, useSearchParams } from 'react-router'
import { CardGridSkeleton } from '@/components/feedback/CardGridSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { CuisineFlag } from '@/features/cuisines/components/CuisineFlag'
import { cuisineQueries } from '@/features/cuisines/queries'
import type { Cuisine } from '@/features/cuisines/schema'
import { cuisineTint } from '@/features/cuisines/utils'
import { DishCard } from '@/features/dishes/components/DishCard'
import { dishQueries, regionQueries } from '@/features/dishes/queries'
import type { Dish } from '@/features/dishes/schema'
import { countVersions } from '@/features/dishes/utils'
import { RecipeCard } from '@/features/recipes/components/RecipeCard'
import { recipeQueries } from '@/features/recipes/queries'
import type { RecipeWithRatings } from '@/features/recipes/schema'
import { searchAtlas, type SearchResults } from '@/features/search/utils'

/**
 * One search across the atlas. The query is React state (instant while
 * typing) mirrored to ?q= so a search can be shared and survives Back
 * (see CLAUDE.md: setSearchParams doesn't queue, so the URL is rebuilt from state).
 */
export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  // The header's Search link and Back change the URL without remounting this
  // page. Those are PUSH or POP navigations; typing only REPLACEs, and its URL
  // lags a keystroke behind, so only the others may overwrite the field.
  // Adjusting state during render (not in an effect) avoids a frame of old text.
  const location = useLocation()
  const navigationType = useNavigationType()
  const [seenKey, setSeenKey] = useState(location.key)
  if (location.key !== seenKey) {
    setSeenKey(location.key)
    if (navigationType !== 'REPLACE') setQuery(searchParams.get('q') ?? '')
  }

  const cuisines = useQuery(cuisineQueries.list())
  const dishes = useQuery(dishQueries.list())
  const regions = useQuery(regionQueries.list())
  const recipes = useQuery(recipeQueries.list())
  const sources = [cuisines, dishes, regions, recipes]

  const search = (next: string) => {
    setQuery(next)
    setSearchParams(next.trim() ? { q: next } : {}, { replace: true })
  }

  const results =
    cuisines.data && dishes.data && regions.data && recipes.data
      ? searchAtlas(query, { cuisines: cuisines.data, dishes: dishes.data, regions: regions.data, recipes: recipes.data })
      : undefined
  const searching = query.trim() !== ''

  return (
    <div className="space-y-8">
      <title>{searching ? `“${query.trim()}” · Search · Flavor Atlas` : 'Search · Flavor Atlas'}</title>
      <header className="space-y-4">
        <p className="label-mono text-accent-ink">The whole atlas</p>
        <h1 className="text-6xl">
          <em>Search</em>
        </h1>
        <form role="search" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="atlas-search" className="sr-only">
            Search recipes, dishes and cuisines
          </label>
          <input
            id="atlas-search"
            type="search"
            value={query}
            onChange={(event) => search(event.target.value)}
            // The visitor came here to type, so the field is ready for them.
            autoFocus
            enterKeyHint="search"
            autoComplete="off"
            placeholder="A dish, an ingredient, a place…"
            className="min-h-12 w-full min-w-0 rounded-full border border-line-strong bg-surface px-5 text-lg placeholder:text-ink-subtle"
          />
        </form>
        {/* Always in the page so screen readers hear each new count. */}
        <p role="status" className="label-mono min-h-5 text-ink-subtle tabular-nums">
          {results && searching && (results.total === 1 ? '1 result' : `${results.total} results`)}
        </p>
      </header>

      {sources.some((source) => source.isPending) ? (
        <div role="status" aria-label="Loading the atlas">
          <CardGridSkeleton />
        </div>
      ) : sources.some((source) => source.isError) ? (
        <ErrorState
          error={sources.find((source) => source.isError)?.error}
          onRetry={() => sources.forEach((source) => source.isError && void source.refetch())}
        />
      ) : !results ? null : !searching ? (
        <Suggestions recipes={recipes.data ?? []} dishes={dishes.data ?? []} onPick={search} />
      ) : results.total === 0 ? (
        <EmptyState
          title="Nothing in the atlas matches that"
          description="Try a dish name, one ingredient, or a cuisine like Filipino."
          action={
            <Link to="/recipes" className="inline-flex min-h-10 items-center rounded-full bg-ink px-5 font-semibold text-canvas hover:bg-accent">
              Browse all recipes
            </Link>
          }
        />
      ) : (
        <Results results={results} recipes={recipes.data ?? []} cuisines={cuisines.data ?? []} />
      )}
    </div>
  )
}

/** Before typing: the dishes with the most versions, one tap from a search. */
function Suggestions({
  recipes,
  dishes,
  onPick,
}: {
  recipes: RecipeWithRatings[]
  dishes: Dish[]
  onPick: (query: string) => void
}) {
  const counts = countVersions(recipes)
  const popular = dishes
    .filter((dish) => counts.has(dish.id))
    .toSorted((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.name.localeCompare(b.name))
    .slice(0, 6)

  return (
    <section aria-labelledby="try-heading" className="space-y-3">
      <h2 id="try-heading" className="label-mono text-ink-subtle">
        Try
      </h2>
      <ul className="flex flex-wrap gap-2">
        {[...popular.map((dish) => dish.name), 'garlic', 'coconut milk'].map((term) => (
          <li key={term}>
            <button
              type="button"
              onClick={() => onPick(term)}
              className="inline-flex min-h-10 items-center rounded-full border border-line-strong px-4 text-sm font-medium text-ink-muted hover:text-ink"
            >
              {term}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Results({
  results,
  recipes,
  cuisines,
}: {
  results: SearchResults
  recipes: RecipeWithRatings[]
  cuisines: Cuisine[]
}) {
  const cuisinesById = new Map(cuisines.map((cuisine) => [cuisine.id, cuisine]))

  return (
    <div className="space-y-12">
      {results.cuisines.length > 0 && (
        <section aria-labelledby="cuisine-results" className="space-y-4">
          <h2 id="cuisine-results" className="text-4xl">
            Cuisines
          </h2>
          <ul className="flex flex-wrap gap-3">
            {results.cuisines.map((cuisine) => (
              <li key={cuisine.id} style={cuisineTint(cuisine.id)}>
                <Link
                  to={`/cuisines/${cuisine.id}`}
                  className="inline-flex min-h-12 items-center gap-3 rounded-full bg-tint-soft py-2 pr-5 pl-3 text-tint-ink hover:underline"
                >
                  <CuisineFlag countryCode={cuisine.countryCode} size="md" />
                  <span className="font-display text-2xl leading-none">{cuisine.name}</span>
                  <span className="label-mono">{cuisine.origin}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {results.dishes.length > 0 && (
        <section aria-labelledby="dish-results" className="space-y-4">
          <h2 id="dish-results" className="text-4xl">
            Dishes
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.dishes.map(({ dish, versions }) => {
              const ofDish = recipes.filter((recipe) => recipe.dishId === dish.id)
              return (
                <li key={dish.id}>
                  <DishCard
                    dish={dish}
                    emoji={ofDish[0]?.emoji || cuisinesById.get(dish.cuisineId)?.emoji || '🍽️'}
                    versions={versions}
                    regional={ofDish.filter((recipe) => recipe.regionId).length}
                  />
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {results.recipes.length > 0 && (
        <section aria-labelledby="recipe-results" className="space-y-4">
          <h2 id="recipe-results" className="text-4xl">
            Recipes
          </h2>
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {results.recipes.map(({ recipe, matchedIngredients }) => (
              <li key={recipe.id}>
                <RecipeCard
                  recipe={recipe}
                  cuisine={cuisinesById.get(recipe.cuisineId)}
                  note={matchedIngredients.length > 0 ? `Uses ${matchedIngredients.join(', ')}` : undefined}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
