import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { EmptyState } from '@/components/feedback/EmptyState'
import type { Cuisine } from '@/features/cuisines/schema'
import { cuisineTint } from '@/features/cuisines/utils'
import type { RecipeWithRatings } from '../schema'
import { DIFFICULTIES } from '../schema'
import {
  applyRecipeFilters,
  DEFAULT_FILTERS,
  DIFFICULTY_LABELS,
  filtersFromParams,
  filtersToParams,
  formatDuration,
  hasActiveFilters,
  isRecipeSort,
  mainIngredients,
  RECIPE_SORTS,
  TIME_LIMITS,
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

// Same pill shape as the chips; an active filter gets the strong border so it stands out.
const selectClass = (active: boolean) =>
  `min-h-10 w-full min-w-0 truncate rounded-full border bg-surface px-3 text-sm sm:w-auto ${
    active ? 'border-ink font-semibold text-ink' : 'border-line-strong text-ink-muted'
  }`

/**
 * Search, filter and sort a list of recipes.
 * Filters live in React state (instant) and are mirrored to the URL, which is
 * always rebuilt from state (see CLAUDE.md: setSearchParams doesn't queue).
 */
export function RecipeBrowser({ recipes, cuisines, lockedCuisineId }: RecipeBrowserProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<RecipeFilterState>(() => filtersFromParams(searchParams, lockedCuisineId))

  const update = (patch: Partial<RecipeFilterState>) => {
    const next = { ...filters, ...patch }
    setFilters(next)
    setSearchParams(filtersToParams(next, lockedCuisineId), { replace: true })
  }

  const clearFilters = () =>
    update({ ...DEFAULT_FILTERS, cuisineId: lockedCuisineId ?? '', sort: filters.sort })

  const visible = applyRecipeFilters(recipes, filters)
  const cuisinesById = new Map(cuisines.map((c) => [c.id, c]))
  const filtered = hasActiveFilters(filters, lockedCuisineId)
  const ingredients = mainIngredients(recipes)

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label htmlFor="recipe-search" className="sr-only">
          Search recipes
        </label>
        <input
          id="recipe-search"
          type="search"
          value={filters.query}
          onChange={(event) => update({ query: event.target.value })}
          placeholder="Search by name or ingredient"
          className="min-h-11 w-full min-w-0 rounded-full border border-line-strong bg-surface px-4 placeholder:text-ink-subtle"
        />

        {!lockedCuisineId && (
          <div role="group" aria-label="Cuisine" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
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
          </div>
        )}

        {/* Sort and three filters as selects in a 2×2 block, one column on the narrowest phones, so no label gets cut off. */}
        <div role="group" aria-label="Sort and filter" className="grid grid-cols-2 gap-2 max-[359px]:grid-cols-1 sm:flex sm:flex-wrap">
          <label htmlFor="recipe-sort" className="sr-only">
            Sort recipes
          </label>
          <select
            id="recipe-sort"
            value={filters.sort}
            onChange={(event) => isRecipeSort(event.target.value) && update({ sort: event.target.value })}
            className={selectClass(false)}
          >
            {Object.entries(RECIPE_SORTS).map(([value, label]) => (
              <option key={value} value={value}>
                Sort: {label}
              </option>
            ))}
          </select>
          <label htmlFor="recipe-time" className="sr-only">
            Time
          </label>
          <select
            id="recipe-time"
            value={filters.maxMinutes}
            onChange={(event) => update({ maxMinutes: Number(event.target.value) })}
            className={selectClass(Boolean(filters.maxMinutes))}
          >
            <option value={0}>Any time</option>
            {TIME_LIMITS.map((limit) => (
              <option key={limit} value={limit}>
                Under {formatDuration(limit)}
              </option>
            ))}
          </select>
          <label htmlFor="recipe-level" className="sr-only">
            Difficulty
          </label>
          <select
            id="recipe-level"
            value={filters.difficulty}
            onChange={(event) => {
              const value = event.target.value
              update({ difficulty: DIFFICULTIES.find((d) => d === value) ?? '' })
            }}
            className={selectClass(Boolean(filters.difficulty))}
          >
            <option value="">Any level</option>
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {DIFFICULTY_LABELS[difficulty]}
              </option>
            ))}
          </select>
          <label htmlFor="recipe-ingredient" className="sr-only">
            Main ingredient
          </label>
          <select
            id="recipe-ingredient"
            value={filters.ingredient}
            onChange={(event) => update({ ingredient: event.target.value })}
            className={selectClass(Boolean(filters.ingredient))}
          >
            <option value="">Any ingredient</option>
            {ingredients.map((ingredient) => (
              <option key={ingredient} value={ingredient}>
                {ingredient[0]!.toUpperCase() + ingredient.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex min-h-10 items-center justify-between gap-4">
        <p className="label-mono text-ink-subtle tabular-nums" aria-live="polite">
          {visible.length} {visible.length === 1 ? 'recipe' : 'recipes'}
        </p>
        {filtered && (
          <button type="button" onClick={clearFilters} className="min-h-10 text-sm font-medium text-accent hover:text-accent-hover hover:underline">
            Clear filters
          </button>
        )}
      </div>

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
