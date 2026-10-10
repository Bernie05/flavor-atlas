import { useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { CardGridSkeleton } from '@/components/feedback/CardGridSkeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FlashMessage } from '@/features/admin/components/FlashMessage'
import { CuisineFlag } from '@/features/cuisines/components/CuisineFlag'
import { cuisineQueries } from '@/features/cuisines/queries'
import { cuisineTint, formatCoordinates } from '@/features/cuisines/utils'
import type { Dish } from '@/features/dishes/schema'
import { dishQueries, regionQueries, useDeleteDish, useDeleteRegion } from '@/features/dishes/queries'
import { MergeDishDialog } from '@/features/recipes/components/MergeDishDialog'
import { mergeTargets } from '@/features/recipes/move'
import { recipeQueries } from '@/features/recipes/queries'
import { describeError } from '@/services/data'

const actionClass = 'inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold hover:bg-surface-sunken'
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

type Target = { kind: 'dish' | 'region'; id: string; name: string; recipes: number }

/**
 * Every cuisine's dishes and regional kitchens: add, rename, move a region on
 * the map, or delete one no recipe uses. A dish or region with recipes can't
 * be deleted (the server refuses too); the dialog links to its recipes,
 * filtered, where they can be moved first. Two dishes that turn out to be one
 * can be merged: the versions move over and the extra dish is deleted.
 */
export function AdminDishesPage() {
  const cuisines = useQuery(cuisineQueries.list())
  const dishes = useQuery(dishQueries.list())
  const regions = useQuery(regionQueries.list())
  const recipes = useQuery(recipeQueries.list())
  const sources = [cuisines, dishes, regions, recipes]
  const deleteDish = useDeleteDish()
  const deleteRegion = useDeleteRegion()
  const navigate = useNavigate()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [toDelete, setToDelete] = useState<Target | null>(null)
  const [toMerge, setToMerge] = useState<Dish | null>(null)
  const remove = toDelete?.kind === 'region' ? deleteRegion : deleteDish

  if (sources.some((s) => s.isPending)) return <CardGridSkeleton count={4} />
  if (sources.some((s) => s.isError)) {
    return <ErrorState error={sources.find((s) => s.isError)?.error} onRetry={() => sources.forEach((s) => s.isError && void s.refetch())} />
  }

  const count = (field: 'dishId' | 'regionId', id: string) => recipes.data!.filter((recipe) => recipe[field] === id).length
  const close = () => {
    setToDelete(null)
    deleteDish.reset()
    deleteRegion.reset()
  }
  const blocked = (toDelete?.recipes ?? 0) > 0

  return (
    <div className="space-y-8">
      <title>Dishes & regions · Flavor Atlas admin</title>
      <ConfirmDialog
        open={toDelete !== null}
        title={blocked ? `${toDelete?.name} still has recipes` : `Delete ${toDelete?.name ?? ''}?`}
        description={
          blocked
            ? `${plural(toDelete!.recipes, 'recipe')} ${toDelete!.kind === 'dish' ? (toDelete!.recipes === 1 ? 'is a version' : 'are versions') + ' of this dish' : (toDelete!.recipes === 1 ? 'comes' : 'come') + ' from this region'}. Move ${toDelete!.recipes === 1 ? 'it' : 'them'} first, so none is left without one.`
            : `${toDelete?.name ?? 'It'} will be removed from the atlas. This can't be undone.`
        }
        canConfirm={!blocked}
        confirmLabel={toDelete?.kind === 'region' ? 'Delete region' : 'Delete dish'}
        pendingLabel="Deleting…"
        isPending={remove.isPending}
        error={remove.isError ? describeError(remove.error) : undefined}
        onCancel={close}
        onConfirm={() => {
          if (!toDelete) return
          remove.mutate(toDelete.id, {
            onSuccess: () => {
              navigate('.', { replace: true, state: { flash: `Deleted ${toDelete.name}.` } })
              setToDelete(null)
              requestAnimationFrame(() => headingRef.current?.focus())
            },
          })
        }}
      >
        {blocked && toDelete && (
          <Link
            to={`/admin/recipes?${toDelete.kind}=${toDelete.id}`}
            className="inline-flex min-h-10 items-center font-semibold text-accent hover:text-accent-hover"
          >
            See its recipes to move them
          </Link>
        )}
      </ConfirmDialog>

      <MergeDishDialog
        source={toMerge}
        dishes={dishes.data!}
        recipes={recipes.data!}
        regions={regions.data!}
        onClose={() => setToMerge(null)}
        onMerged={(message) => {
          navigate('.', { replace: true, state: { flash: message } })
          requestAnimationFrame(() => headingRef.current?.focus())
        }}
      />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="text-5xl">
            Dishes & regions
          </h1>
          <p className="label-mono mt-1 text-ink-subtle tabular-nums">
            {dishes.data!.length} {dishes.data!.length === 1 ? 'dish' : 'dishes'} · {plural(regions.data!.length, 'regional kitchen')}
          </p>
        </div>
      </header>
      <FlashMessage />

      {cuisines.data!.map((cuisine) => {
        const ownDishes = dishes.data!.filter((d) => d.cuisineId === cuisine.id).toSorted((a, b) => a.name.localeCompare(b.name))
        const ownRegions = regions.data!.filter((r) => r.cuisineId === cuisine.id).toSorted((a, b) => a.name.localeCompare(b.name))
        return (
          <section key={cuisine.id} aria-labelledby={`cuisine-${cuisine.id}`} style={cuisineTint(cuisine.id)} className="space-y-4">
            <h2 id={`cuisine-${cuisine.id}`} className="flex items-center gap-3 text-3xl">
              <CuisineFlag countryCode={cuisine.countryCode} size="md" />
              {cuisine.name}
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <Group
                title="Dishes"
                empty="No dishes yet."
                addLabel="New dish"
                addTo={`/admin/dishes/new?cuisine=${cuisine.id}`}
                cuisineName={cuisine.name}
                rows={ownDishes.map((dish) => {
                  const recipes = count('dishId', dish.id)
                  return {
                    id: dish.id,
                    name: dish.name,
                    detail: plural(recipes, 'version'),
                    editTo: `/admin/dishes/${dish.id}/edit`,
                    // Only offered when the cuisine has another dish to merge into.
                    onMerge: mergeTargets(dish, dishes.data!).length > 0 ? () => setToMerge(dish) : undefined,
                    onDelete: () => setToDelete({ kind: 'dish', id: dish.id, name: dish.name, recipes }),
                  }
                })}
              />
              <Group
                title="Regional kitchens"
                empty="No regional kitchens yet."
                addLabel="New region"
                addTo={`/admin/regions/new?cuisine=${cuisine.id}`}
                cuisineName={cuisine.name}
                rows={ownRegions.map((region) => {
                  const recipes = count('regionId', region.id)
                  return {
                    id: region.id,
                    name: region.name,
                    detail: `${formatCoordinates(region)} · ${plural(recipes, 'recipe')}`,
                    editTo: `/admin/regions/${region.id}/edit`,
                    onDelete: () => setToDelete({ kind: 'region', id: region.id, name: region.name, recipes }),
                  }
                })}
              />
            </div>
          </section>
        )
      })}
    </div>
  )
}

interface GroupProps {
  title: string
  empty: string
  addLabel: string
  addTo: string
  cuisineName: string
  rows: { id: string; name: string; detail: string; editTo: string; onMerge?: () => void; onDelete: () => void }[]
}

function Group({ title, empty, addLabel, addTo, cuisineName, rows }: GroupProps) {
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="label-mono text-ink-subtle">{title}</h3>
        <Link to={addTo} className={`${actionClass} text-accent`}>
          + {addLabel}
          <span className="sr-only"> in {cuisineName}</span>
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-surface px-4 py-3 text-sm text-ink-muted ring-1 ring-line">{empty}</p>
      ) : (
        <ul className="divide-y divide-line rounded-2xl bg-surface ring-1 ring-line">
          {rows.map((row) => (
            // Phones: actions under the name, so long names ("Tuguegarao, Cagayan") keep their words.
            <li key={row.id} className="grid items-center gap-x-3 gap-y-1 px-4 py-2 sm:grid-cols-[1fr_auto]">
              <span className="min-w-0">
                <span className="block font-semibold break-words">{row.name}</span>
                <span className="label-mono block text-ink-subtle tabular-nums">{row.detail}</span>
              </span>
              <span className="-ml-3 flex gap-1 sm:ml-0">
                <Link to={row.editTo} className={actionClass}>
                  Edit<span className="sr-only"> {row.name}</span>
                </Link>
                {row.onMerge && (
                  <button type="button" onClick={row.onMerge} className={actionClass}>
                    Merge<span className="sr-only"> {row.name}</span>
                  </button>
                )}
                <button type="button" onClick={row.onDelete} className={`${actionClass} text-danger`}>
                  Delete<span className="sr-only"> {row.name}</span>
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
