import { useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FlashMessage } from '@/features/admin/components/FlashMessage'
import { CuisineFlag } from '@/features/cuisines/components/CuisineFlag'
import { countryName } from '@/features/cuisines/flags'
import { cuisineQueries, useDeleteCuisine } from '@/features/cuisines/queries'
import type { Cuisine } from '@/features/cuisines/schema'
import { cuisineTint, cuisineUsage, formatCoordinates } from '@/features/cuisines/utils'
import { dishQueries, regionQueries } from '@/features/dishes/queries'
import { recipeQueries } from '@/features/recipes/queries'
import { describeError } from '@/services/data'

const actionClass = 'inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold hover:bg-surface-sunken'

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** Every cuisine on the atlas: add one, edit one, add a recipe to one, or delete an unused one. */
export function AdminCuisinesPage() {
  const cuisines = useQuery(cuisineQueries.list())
  const recipes = useQuery(recipeQueries.list())
  // Only for the delete dialog's "what goes with it" line; the page works without them.
  const dishes = useQuery(dishQueries.list()).data ?? []
  const regions = useQuery(regionQueries.list()).data ?? []
  const deleteCuisine = useDeleteCuisine()
  const navigate = useNavigate()
  const [toDelete, setToDelete] = useState<Cuisine | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const usage = toDelete ? cuisineUsage(toDelete.id, { recipes: recipes.data ?? [], dishes, regions }) : undefined
  const blocked = (usage?.recipes ?? 0) > 0
  const closeDialog = () => {
    setToDelete(null)
    deleteCuisine.reset()
  }

  return (
    <div className="space-y-6">
      <title>Cuisines · Flavor Atlas admin</title>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="text-5xl outline-none">
            Cuisines
          </h1>
          {cuisines.data && <p className="label-mono mt-1 text-ink-subtle tabular-nums">{cuisines.data.length} on the map</p>}
        </div>
        <Link to="/admin/cuisines/new" className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 font-semibold text-canvas hover:bg-accent">
          + New cuisine
        </Link>
      </header>
      <FlashMessage />
      <ConfirmDialog
        open={toDelete !== null}
        title={blocked ? `${toDelete?.name} still has recipes` : `Delete ${toDelete?.name ?? 'cuisine'}?`}
        description={
          blocked
            ? `${plural(usage!.recipes, 'recipe')} still ${usage!.recipes === 1 ? 'uses' : 'use'} this cuisine. Delete them or give them another cuisine first, so none is left without one.`
            : [
                `${toDelete?.name ?? 'The cuisine'} will be removed from the map and the site`,
                usage && (usage.dishes > 0 || usage.regions > 0)
                  ? `, with its ${[usage.dishes > 0 && plural(usage.dishes, 'empty dish'), usage.regions > 0 && plural(usage.regions, 'regional kitchen')].filter(Boolean).join(' and ')}`
                  : '',
                ". This can't be undone.",
              ].join('')
        }
        canConfirm={!blocked}
        confirmLabel="Delete cuisine"
        pendingLabel="Deleting…"
        isPending={deleteCuisine.isPending}
        error={deleteCuisine.isError ? describeError(deleteCuisine.error) : undefined}
        onCancel={closeDialog}
        onConfirm={() => {
          if (!toDelete) return
          deleteCuisine.mutate(toDelete.id, {
            onSuccess: () => {
              navigate('.', { replace: true, state: { flash: `Deleted ${toDelete.name}.` } })
              setToDelete(null)
              // Its row (and the Delete button that had focus) is gone: start again from the top of the page.
              requestAnimationFrame(() => headingRef.current?.focus())
            },
          })
        }}
      >
        {blocked && toDelete && (
          <Link to={`/admin/recipes?cuisine=${toDelete.id}`} className="inline-flex min-h-10 items-center font-semibold text-accent hover:text-accent-hover">
            See its recipes
          </Link>
        )}
      </ConfirmDialog>

      {cuisines.isPending || recipes.isPending ? (
        <div role="status" className="divide-y divide-line rounded-2xl bg-surface ring-1 ring-line">
          <span className="sr-only">Loading cuisines…</span>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} aria-hidden className="flex items-center gap-4 p-4">
              <div className="size-11 animate-pulse rounded-xl bg-surface-sunken motion-reduce:animate-none" />
              <div className="h-10 flex-1 animate-pulse rounded-lg bg-surface-sunken motion-reduce:animate-none" />
            </div>
          ))}
        </div>
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
              <li key={cuisine.id} style={cuisineTint(cuisine.id)} className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 p-4 sm:grid-cols-[auto_1fr_auto]">
                <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-tint-soft">
                  <CuisineFlag countryCode={cuisine.countryCode} size="md" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-2xl leading-tight">{cuisine.name}</p>
                  <p className="label-mono text-ink-subtle tabular-nums">
                    {countryName(cuisine.countryCode)} · {cuisine.origin} · {formatCoordinates(cuisine)} · {count}{' '}
                    {count === 1 ? 'recipe' : 'recipes'}
                  </p>
                </div>
                {/* Under the text on phones, beside it from sm up. */}
                <div className="col-start-2 flex flex-wrap gap-1 sm:col-start-auto">
                  <Link to={`/cuisines/${cuisine.id}`} className={`${actionClass} text-ink-muted`}>
                    View<span className="sr-only"> {cuisine.name}</span>
                  </Link>
                  <Link to={`/admin/cuisines/${cuisine.id}/edit`} className={actionClass}>
                    Edit<span className="sr-only"> {cuisine.name}</span>
                  </Link>
                  <Link to={`/admin/recipes/new?cuisine=${cuisine.id}`} className={actionClass}>
                    Add recipe<span className="sr-only"> to {cuisine.name}</span>
                  </Link>
                  <button type="button" onClick={() => setToDelete(cuisine)} className={`${actionClass} text-danger`}>
                    Delete<span className="sr-only"> {cuisine.name}</span>
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
