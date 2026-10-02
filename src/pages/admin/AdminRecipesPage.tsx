import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { CardGridSkeleton } from '@/components/feedback/CardGridSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StarRating } from '@/components/ui/StarRating'
import { FlashMessage } from '@/features/admin/components/FlashMessage'
import { cuisineQueries } from '@/features/cuisines/queries'
import { dishQueries } from '@/features/dishes/queries'
import { summarizeRatings } from '@/features/ratings/summary'
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
  const dishById = new Map(useQuery(dishQueries.list()).data?.map((d) => [d.id, d]))
  const dishLine = (recipe: RecipeWithRatings) => {
    const dishName = dishById.get(recipe.dishId)?.name
    // "Japchae" titled "Japchae" doesn't need the dish repeated under it.
    return [dishName !== recipe.title && dishName, recipe.variant].filter(Boolean).join(' · ')
  }
  const deleteRecipe = useDeleteRecipe()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [cuisineId, setCuisineId] = useState('')
  const [toDelete, setToDelete] = useState<RecipeWithRatings | null>(null)

  if (recipes.isPending || cuisines.isPending) return <CardGridSkeleton />
  if (recipes.isError || cuisines.isError) {
    return <ErrorState error={recipes.error ?? cuisines.error} onRetry={() => void recipes.refetch()} />
  }

  const cuisineById = new Map(cuisines.data.map((c) => [c.id, c]))
  const visible = applyRecipeFilters(recipes.data, { ...DEFAULT_FILTERS, query, cuisineId, sort: 'newest' })

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

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl">Recipes</h1>
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
          onChange={(event) => setCuisineId(event.target.value)}
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

      {visible.length === 0 ? (
        <EmptyState title="No recipes match" description="Try a different search or cuisine." />
      ) : (
        <>
          {/* Wide screens: a table to scan and compare (scrolls inside its box if it ever runs out of room). */}
          <div className="hidden overflow-x-auto rounded-2xl bg-surface ring-1 ring-line lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-sunken">
                <tr className="label-mono text-ink-subtle">
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

          {/* Phones: one row per recipe, actions underneath. */}
          <ul className="divide-y divide-line rounded-2xl bg-surface ring-1 ring-line lg:hidden">
            {visible.map((recipe) => {
              const cuisine = cuisineById.get(recipe.cuisineId)
              const rating = summarizeRatings(recipe.ratings)
              return (
                <li key={recipe.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-center gap-3">
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
    </div>
  )
}
