import { useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { CardGridSkeleton } from '@/components/feedback/CardGridSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StarRating } from '@/components/ui/StarRating'
import { FlashMessage, type FlashState } from '@/features/admin/components/FlashMessage'
import { cuisineQueries } from '@/features/cuisines/queries'
import { dishQueries, regionQueries } from '@/features/dishes/queries'
import { summarizeRatings } from '@/features/ratings/summary'
import { MoveRecipesDialog } from '@/features/recipes/components/MoveRecipesDialog'
import { RecipeCover } from '@/features/recipes/components/RecipeCover'
import { useDeleteRecipe } from '@/features/recipes/mutations'
import { recipeQueries } from '@/features/recipes/queries'
import type { RecipeWithRatings } from '@/features/recipes/schema'
import { applyRecipeFilters, DEFAULT_FILTERS, formatDuration, totalMinutes } from '@/features/recipes/utils'
import { describeError } from '@/services/data'

const actionClass =
  'inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold hover:bg-surface-sunken'

export function AdminRecipesPage() {
  const recipes = useQuery(recipeQueries.list())
  const cuisines = useQuery(cuisineQueries.list())
  // Optional: rows just skip the dish line until it loads.
  const dishes = useQuery(dishQueries.list()).data
  const regions = useQuery(regionQueries.list()).data
  const dishById = new Map(dishes?.map((d) => [d.id, d]))
  const dishLine = (recipe: RecipeWithRatings) => {
    const dishName = dishById.get(recipe.dishId)?.name
    // "Japchae" titled "Japchae" doesn't need the dish repeated under it.
    return [dishName !== recipe.title && dishName, recipe.variant].filter(Boolean).join(' · ')
  }
  const deleteRecipe = useDeleteRecipe()
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  // ?cuisine=filipino opens the list filtered, e.g. from a cuisine that can't be deleted yet.
  // The filter is React state mirrored to the URL, so a reload keeps it (as on CuisinePage).
  const [searchParams, setSearchParams] = useSearchParams()
  const [cuisineFilter, setCuisineFilter] = useState(() => searchParams.get('cuisine') ?? '')
  const filterByCuisine = (id: string) => {
    setCuisineFilter(id)
    // Change only the cuisine: a ?dish= or ?region= filter stays.
    const next = new URLSearchParams(searchParams)
    if (id) next.set('cuisine', id)
    else next.delete('cuisine')
    setSearchParams(next, { replace: true })
  }
  const headingRef = useRef<HTMLHeadingElement>(null)
  // The selection bar (and the button that had focus) goes away: start again from the heading.
  const focusHeading = () => requestAnimationFrame(() => headingRef.current?.focus())
  const [toDelete, setToDelete] = useState<RecipeWithRatings | null>(null)
  // ?dish=… or ?region=… come from a dish or region that can't be deleted yet: its recipes, to move.
  const dishFilter = searchParams.get('dish')
  const regionFilter = searchParams.get('region')
  const clearPlaceFilter = () => setSearchParams(cuisineFilter ? { cuisine: cuisineFilter } : {}, { replace: true })
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [moving, setMoving] = useState(false)
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (recipes.isPending || cuisines.isPending) return <CardGridSkeleton />
  if (recipes.isError || cuisines.isError) {
    return <ErrorState error={recipes.error ?? cuisines.error} onRetry={() => {
            if (recipes.isError) void recipes.refetch()
            if (cuisines.isError) void cuisines.refetch()
          }} />
  }

  const cuisineById = new Map(cuisines.data.map((c) => [c.id, c]))
  // An id that isn't a cuisine (a stale link) shows everything, matching what the select shows.
  const cuisineId = cuisineById.has(cuisineFilter) ? cuisineFilter : ''
  const visible = applyRecipeFilters(recipes.data, { ...DEFAULT_FILTERS, query, cuisineId, sort: 'newest' }).filter(
    (recipe) => (!dishFilter || recipe.dishId === dishFilter) && (!regionFilter || recipe.regionId === regionFilter),
  )
  const placeName = dishFilter ? dishById.get(dishFilter)?.name : regions?.find((r) => r.id === regionFilter)?.name
  const selectedRecipes = recipes.data.filter((recipe) => selected.has(recipe.id))
  const allShownSelected = visible.length > 0 && visible.every((recipe) => selected.has(recipe.id))
  const selectAllShown = () =>
    setSelected((current) => {
      const next = new Set(current)
      for (const recipe of visible) {
        if (allShownSelected) next.delete(recipe.id)
        else next.add(recipe.id)
      }
      return next
    })
  // Selected recipes the current filters hide: Move would include them, so the bar says so.
  const hiddenSelected = selected.size - visible.filter((recipe) => selected.has(recipe.id)).length
  // The label around the 20px box makes a 40px target without moving the layout.
  const checkbox = (recipe: RecipeWithRatings) => (
    <label className="-m-2.5 inline-flex size-10 shrink-0 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        checked={selected.has(recipe.id)}
        onChange={() => toggle(recipe.id)}
        aria-label={`Select ${recipe.title}`}
        className="size-5 accent-[var(--accent)]"
      />
    </label>
  )

  const rowActions = (recipe: RecipeWithRatings) => (
    <>
      <Link to={`/recipes/${recipe.id}`} className={`${actionClass} text-ink-muted`}>
        View<span className="sr-only"> {recipe.title}</span>
      </Link>
      <Link to={`/admin/recipes/${recipe.id}/edit`} className={actionClass}>
        Edit<span className="sr-only"> {recipe.title}</span>
      </Link>
      <button type="button" onClick={() => setToDelete(recipe)} className={`${actionClass} text-danger`}>
        Delete<span className="sr-only"> {recipe.title}</span>
      </button>
    </>
  )

  return (
    <div className="space-y-6">
      <title>Recipes · Flavor Atlas admin</title>
      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete ${toDelete?.title ?? 'recipe'}?`}
        description="The recipe and its reviews will be removed from the atlas. This can't be undone."
        confirmLabel="Delete recipe"
        pendingLabel="Deleting…"
        isPending={deleteRecipe.isPending}
        error={deleteRecipe.isError ? describeError(deleteRecipe.error) : undefined}
        onCancel={() => {
          setToDelete(null)
          deleteRecipe.reset()
        }}
        onConfirm={() => {
          if (!toDelete) return
          deleteRecipe.mutate(toDelete.id, {
            onSuccess: () => {
              navigate('.', { replace: true, state: { flash: `Deleted “${toDelete.title}”.` } })
              setToDelete(null)
            },
          })
        }}
      />

      <MoveRecipesDialog
        open={moving}
        recipes={selectedRecipes}
        cuisines={cuisines.data}
        dishes={dishes ?? []}
        regions={regions ?? []}
        onClose={() => setMoving(false)}
        onMoved={(message, undo) => {
          setSelected(new Set())
          focusHeading()
          // The router's own address (in the phone preview it isn't the browser's).
          navigate(`.${location.search}`, { replace: true, state: { flash: message, undo } satisfies FlashState })
        }}
      />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="text-5xl">
            Recipes
          </h1>
          <p className="label-mono mt-1 text-ink-subtle tabular-nums">{recipes.data.length} in the atlas</p>
        </div>
        <Link
          to="/admin/recipes/new"
          className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 font-semibold text-canvas hover:bg-accent"
        >
          + New recipe
        </Link>
      </header>

      <FlashMessage />

      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="admin-search" className="sr-only">
          Search recipes
        </label>
        <input
          id="admin-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or ingredient"
          className="min-h-11 min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-4 placeholder:text-ink-subtle"
        />
        <label htmlFor="admin-cuisine" className="sr-only">
          Filter by cuisine
        </label>
        <select
          id="admin-cuisine"
          value={cuisineId}
          onChange={(event) => filterByCuisine(event.target.value)}
          className="min-h-11 rounded-full border border-line-strong bg-surface px-4"
        >
          <option value="">All cuisines</option>
          {cuisines.data.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {(dishFilter || regionFilter) && (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-accent-soft px-3 py-1.5 font-semibold text-accent-ink">
            Only {dishFilter ? `versions of ${placeName ?? 'this dish'}` : `recipes from ${placeName ?? 'this region'}`}
          </span>
          <button type="button" onClick={clearPlaceFilter} className="min-h-10 rounded-full px-3 font-semibold text-accent hover:bg-surface-sunken">
            Show all
          </button>
        </p>
      )}

      {visible.length === 0 ? (
        <EmptyState title="No recipes match" description="Try a different search or cuisine." />
      ) : (
        <>
          {/* Wide screens: a table to scan and compare (scrolls inside its box if it ever runs out of room). */}
          <div className="hidden overflow-x-auto rounded-2xl bg-surface ring-1 ring-line lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-sunken">
                <tr className="label-mono text-ink-subtle">
                  <th scope="col" className="w-12 py-3 pl-4">
                    <label className="-m-2.5 inline-flex size-10 cursor-pointer items-center justify-center">
                      <input
                        type="checkbox"
                        checked={allShownSelected}
                        onChange={selectAllShown}
                        aria-label={allShownSelected ? 'Deselect all shown' : 'Select all shown'}
                        className="size-5 accent-[var(--accent)]"
                      />
                    </label>
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">Recipe</th>
                  <th scope="col" className="px-4 py-3 font-medium">Cuisine</th>
                  <th scope="col" className="px-4 py-3 font-medium">Time</th>
                  <th scope="col" className="px-4 py-3 font-medium">Rating</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((recipe) => {
                  const cuisine = cuisineById.get(recipe.cuisineId)
                  const rating = summarizeRatings(recipe.ratings)
                  return (
                    <tr key={recipe.id}>
                      {/* A selected row is marked by a strong accent edge (a pale tint was ~1.1:1). */}
                      <td className={`border-l-4 py-2 pl-3 ${selected.has(recipe.id) ? 'border-accent' : 'border-transparent'}`}>{checkbox(recipe)}</td>
                      <th scope="row" className="px-4 py-2 text-left font-normal">
                        <span className="flex items-center gap-3">
                          <RecipeCover
                    recipe={recipe}
                    emoji={recipe.emoji || cuisine?.emoji}
                    emojiSize="sm"
                    className="size-11 shrink-0 rounded-xl"
                  />
                          <span>
                            <span className="block font-semibold">{recipe.title}</span>
                            <span className="block text-sm text-ink-subtle">{dishLine(recipe)}</span>
                          </span>
                        </span>
                      </th>
                      <td className="px-4 py-2 text-ink-muted">{cuisine?.name}</td>
                      <td className="px-4 py-2 font-mono whitespace-nowrap tabular-nums">{formatDuration(totalMinutes(recipe))}</td>
                      <td className="px-4 py-2">
                        <StarRating value={rating.average} count={rating.count} />
                      </td>
                      <td className="px-4 py-2">
                        <span className="flex justify-end gap-1 whitespace-nowrap">{rowActions(recipe)}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Phones have no table header, so select-all gets its own row. */}
          <label className="flex min-h-10 cursor-pointer items-center gap-3 px-1 text-sm font-semibold lg:hidden">
            <input type="checkbox" checked={allShownSelected} onChange={selectAllShown} className="size-5 accent-[var(--accent)]" />
            Select all shown ({visible.length})
          </label>

          {/* Phones: one row per recipe, actions underneath. */}
          <ul className="divide-y divide-line rounded-2xl bg-surface ring-1 ring-line lg:hidden">
            {visible.map((recipe) => {
              const cuisine = cuisineById.get(recipe.cuisineId)
              const rating = summarizeRatings(recipe.ratings)
              return (
                <li key={recipe.id} className={`space-y-2 border-l-4 py-3 pr-4 pl-3 ${selected.has(recipe.id) ? 'border-accent' : 'border-transparent'}`}>
                  <div className="flex items-center gap-3">
                    {checkbox(recipe)}
                    <RecipeCover
                    recipe={recipe}
                    emoji={recipe.emoji || cuisine?.emoji}
                    emojiSize="sm"
                    className="size-11 shrink-0 rounded-xl"
                  />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{recipe.title}</p>
                      <p className="truncate text-sm text-ink-subtle">{dishLine(recipe)}</p>
                      <p className="label-mono text-ink-subtle">
                        {cuisine?.name} · {formatDuration(totalMinutes(recipe))}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StarRating value={rating.average} count={rating.count} />
                    <span className="flex gap-1">{rowActions(recipe)}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {/* The selection's actions, in reach while scrolling a long list. */}
      {selected.size > 0 && (
        <div role="region" aria-label="Selected recipes" className="sticky bottom-4 z-10 flex flex-wrap items-center gap-2 rounded-full bg-ink py-2 pr-2 pl-5 text-canvas">
          <span className="font-semibold tabular-nums">
            {selected.size} selected{hiddenSelected > 0 && <span className="font-normal"> ({hiddenSelected} not shown)</span>}
          </span>
          <span className="ml-auto flex gap-1">
            <button type="button" onClick={() => setMoving(true)} className="min-h-10 rounded-full bg-canvas px-4 text-sm font-semibold text-ink hover:bg-accent-soft">
              Move to a dish…
            </button>
            <button
              type="button"
              onClick={() => {
                setSelected(new Set())
                focusHeading()
              }}
              className="min-h-10 rounded-full px-4 text-sm font-semibold hover:bg-canvas/15"
            >
              Clear
            </button>
          </span>
        </div>
      )}
    </div>
  )
}
