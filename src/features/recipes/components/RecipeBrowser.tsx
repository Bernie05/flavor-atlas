import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { EmptyState } from '@/components/feedback/EmptyState'
import type { Cuisine } from '@/features/cuisines/schema'
import { cuisineTint } from '@/features/cuisines/utils'
import type { RecipeWithRatings } from '../schema'
import {
  applyRecipeFilters,
  DEFAULT_FILTERS,
  isRecipeSort,
  RECIPE_SORTS,
  type RecipeFilterState,
} from '../utils'
import { RecipeCard } from './RecipeCard'

interface RecipeBrowserProps {
  recipes: RecipeWithRatings[]
  cuisines: Cuisine[]
  /** On a cuisine page the cuisine is fixed, so its filter is hidden. */
  lockedCuisineId?: string
}

const chipClass = (active: boolean) =>
  `inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors ${
    active ? 'border-ink bg-ink text-canvas' : 'border-line-strong text-ink-muted hover:text-ink'
  }`

/**
 * Search, filter and sort a list of recipes.
 * Filters live in React state (instant) and are mirrored to the URL, which is
 * always rebuilt from state (see CLAUDE.md: setSearchParams doesn't queue).
 */
export function RecipeBrowser({ recipes, cuisines, lockedCuisineId }: RecipeBrowserProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<RecipeFilterState>(() => {
    const sort = searchParams.get('sort')
    return {
      query: searchParams.get('q') ?? '',
      cuisineId: lockedCuisineId ?? searchParams.get('cuisine') ?? '',
      quick: searchParams.get('quick') === '1',
      sort: isRecipeSort(sort) ? sort : DEFAULT_FILTERS.sort,
    }
  })

  const update = (patch: Partial<RecipeFilterState>) => {
    const next = { ...filters, ...patch }
    setFilters(next)
    const params = new URLSearchParams()
    if (next.query) params.set('q', next.query)
    if (next.cuisineId && !lockedCuisineId) params.set('cuisine', next.cuisineId)
    if (next.quick) params.set('quick', '1')
    if (next.sort !== DEFAULT_FILTERS.sort) params.set('sort', next.sort)
    setSearchParams(params, { replace: true })
  }

  const visible = applyRecipeFilters(recipes, filters)
  const cuisinesById = new Map(cuisines.map((c) => [c.id, c]))
  const filtered = filters.query || filters.quick || (filters.cuisineId && !lockedCuisineId)

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="recipe-search" className="sr-only">
            Search recipes
          </label>
          <input
            id="recipe-search"
            type="search"
            value={filters.query}
            onChange={(event) => update({ query: event.target.value })}
            placeholder="Search by name or ingredient"
            className="min-h-11 min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-4 placeholder:text-ink-subtle"
          />
          <label htmlFor="recipe-sort" className="sr-only">
            Sort recipes
          </label>
          <select
            id="recipe-sort"
            value={filters.sort}
            onChange={(event) => isRecipeSort(event.target.value) && update({ sort: event.target.value })}
            className="min-h-11 rounded-full border border-line-strong bg-surface px-4"
          >
            {Object.entries(RECIPE_SORTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div role="group" aria-label="Filters" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
          {!lockedCuisineId && (
            <>
              <button type="button" aria-pressed={!filters.cuisineId} onClick={() => update({ cuisineId: '' })} className={chipClass(!filters.cuisineId)}>
                All cuisines
              </button>
              {cuisines.map((cuisine) => (
                <button
                  key={cuisine.id}
                  type="button"
                  style={cuisineTint(cuisine.id)}
                  aria-pressed={filters.cuisineId === cuisine.id}
                  onClick={() => update({ cuisineId: filters.cuisineId === cuisine.id ? '' : cuisine.id })}
                  className={chipClass(filters.cuisineId === cuisine.id)}
                >
                  <span aria-hidden className="size-2.5 rounded-full bg-tint" />
                  {cuisine.name}
                </button>
              ))}
            </>
          )}
          <button type="button" aria-pressed={filters.quick} onClick={() => update({ quick: !filters.quick })} className={chipClass(filters.quick)}>
            Under 30 min
          </button>
        </div>
      </div>

      <p className="label-mono text-ink-subtle tabular-nums" aria-live="polite">
        {visible.length} {visible.length === 1 ? 'recipe' : 'recipes'}
      </p>

      {visible.length === 0 ? (
        <EmptyState
          title={filters.query ? `No recipes match "${filters.query}"` : 'No recipes here yet'}
          description={filtered ? 'Try a different search or clear a filter.' : 'Check back soon.'}
        />
      ) : (
        <>
          <h2 className="sr-only">Recipes</h2>
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((recipe) => (
              <li key={recipe.id}>
                <RecipeCard
                  recipe={recipe}
                  cuisine={cuisinesById.get(recipe.cuisineId)}
                  showCuisineLabel={!lockedCuisineId}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
