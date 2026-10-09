import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { recipeQueries } from '@/features/recipes/queries'
import { useSavedRecipeIds } from '@/features/saved/useSavedRecipes'
import { pickSaved } from '@/features/saved/utils'
import { shoppingActions, useShoppingState } from '@/features/shopping/useShoppingList'
import { buildShoppingList, toShoppingText } from '@/features/shopping/utils'

const MAX_SERVINGS = 24
const stepButton =
  'grid size-10 place-items-center rounded-full border border-line-strong text-lg font-semibold hover:bg-surface-sunken disabled:opacity-40'

/** One list of everything to buy for the saved recipes, each at the servings you choose. */
export function ShoppingListPage() {
  const savedIds = useSavedRecipeIds()
  const state = useShoppingState()
  const recipes = useQuery(recipeQueries.list())
  const [copyStatus, setCopyStatus] = useState('')

  const saved = pickSaved(savedIds, recipes.data ?? [])
  const peopleFor = (recipe: { id: string; servings: number }) => state.servings[recipe.id] ?? recipe.servings
  const lines = buildShoppingList(
    saved.filter((recipe) => !state.excluded.includes(recipe.id)).map((recipe) => ({ recipe, people: peopleFor(recipe) })),
  )
  const checked = new Set(state.checked)
  const toBuy = lines.filter((line) => !checked.has(line.key))
  // Ticked lines sink to the bottom, so what's left to find stays at the top.
  const ordered = [...toBuy, ...lines.filter((line) => checked.has(line.key))]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toShoppingText(toBuy))
      setCopyStatus(`Copied ${toBuy.length} ${toBuy.length === 1 ? 'item' : 'items'}.`)
    } catch {
      setCopyStatus("Couldn't copy here. Select the list below and copy it yourself.")
    }
  }

  return (
    <div className="space-y-10">
      <title>Shopping list · Flavor Atlas</title>
      <header className="space-y-2">
        <nav aria-label="Breadcrumb">
          <Link to="/saved" className="label-mono inline-flex min-h-10 items-center text-accent-ink hover:underline">
            Saved recipes
          </Link>
        </nav>
        <h1 className="text-6xl">
          Shopping <em>list</em>
        </h1>
        <p className="max-w-prose text-ink-muted">
          Everything your saved recipes need, added up. Choose how many you're cooking for, then tick things off as you shop.
        </p>
      </header>

      {recipes.isPending ? (
        <div aria-busy="true" aria-label="Loading" className="h-64 animate-pulse rounded-2xl bg-surface-sunken motion-reduce:animate-none" />
      ) : recipes.isError ? (
        <ErrorState error={recipes.error} onRetry={() => void recipes.refetch()} />
      ) : saved.length === 0 ? (
        <EmptyState
          title="Save a recipe to start a list"
          description="Tap the heart on any recipe. Its ingredients will be added up here."
          action={
            <Link to="/recipes" className="inline-flex min-h-10 items-center rounded-full bg-ink px-5 font-semibold text-canvas hover:bg-accent">
              Browse recipes
            </Link>
          }
        />
      ) : (
        <div className="grid gap-12 md:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16">
          <section aria-labelledby="list-recipes-heading" className="space-y-4 md:self-start">
            <h2 id="list-recipes-heading" className="text-3xl">
              Recipes
            </h2>
            <ul className="divide-y divide-line border-y border-line">
              {saved.map((recipe) => {
                const included = !state.excluded.includes(recipe.id)
                const people = peopleFor(recipe)
                return (
                  <li key={recipe.id} className="space-y-2 py-3">
                    <label className="flex min-h-10 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={included}
                        onChange={() => shoppingActions.toggleIncluded(recipe.id)}
                        className="size-4 shrink-0 accent-[var(--accent)]"
                      />
                      <span className={`font-display text-xl leading-tight ${included ? '' : 'text-ink-subtle line-through'}`}>
                        {recipe.title}
                      </span>
                    </label>
                    {included && (
                      <div className="flex items-center gap-3 pl-7">
                        <button
                          type="button"
                          onClick={() => shoppingActions.setServings(recipe.id, Math.max(1, people - 1))}
                          disabled={people <= 1}
                          aria-label={`Fewer servings of ${recipe.title}`}
                          className={stepButton}
                        >
                          −
                        </button>
                        <p className="min-w-20 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                          Serves {people}
                        </p>
                        <button
                          type="button"
                          onClick={() => shoppingActions.setServings(recipe.id, Math.min(MAX_SERVINGS, people + 1))}
                          disabled={people >= MAX_SERVINGS}
                          aria-label={`More servings of ${recipe.title}`}
                          className={stepButton}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>

          <section aria-labelledby="to-buy-heading" className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="to-buy-heading" className="text-3xl">
                To buy
              </h2>
              <p className="label-mono text-ink-subtle tabular-nums">
                {toBuy.length} left · {lines.length - toBuy.length} ticked
              </p>
            </div>

            {lines.length === 0 ? (
              <EmptyState title="Nothing to buy yet" description="Tick a recipe on the left to add its ingredients." />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void copy()}
                    disabled={toBuy.length === 0}
                    className="inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-canvas hover:bg-accent disabled:opacity-40"
                  >
                    Copy list
                  </button>
                  {checked.size > 0 && (
                    <button
                      type="button"
                      onClick={shoppingActions.clearChecked}
                      className="inline-flex min-h-10 items-center px-2 text-sm font-medium text-accent hover:text-accent-hover"
                    >
                      Untick all
                    </button>
                  )}
                  <p className="text-sm text-ink-muted" aria-live="polite">
                    {copyStatus}
                  </p>
                </div>

                <ul className="divide-y divide-line border-y border-line">
                  {ordered.map((line) => {
                    const isChecked = checked.has(line.key)
                    const id = `buy-${line.key}`
                    return (
                      <li key={line.key}>
                        <label htmlFor={id} className="flex cursor-pointer items-start gap-3 py-3">
                          <input
                            id={id}
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => shoppingActions.toggleChecked(line.key)}
                            className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
                          />
                          <span className={`flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 ${isChecked ? 'text-ink-subtle line-through' : ''}`}>
                            <span className="min-w-24 shrink-0 font-mono text-sm font-semibold whitespace-nowrap tabular-nums">{line.amount}</span>
                            <span className="min-w-0">
                              {line.name}
                              <span className="block text-sm text-ink-subtle">{line.recipes.join(' · ')}</span>
                            </span>
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
                <p className="text-sm text-ink-subtle">Water isn't listed: you'll have it at home.</p>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
