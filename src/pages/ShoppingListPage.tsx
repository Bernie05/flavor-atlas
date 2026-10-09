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
// aria-disabled, not disabled: a button that disables itself under the keyboard drops focus to <body>.
const stepButton =
  'grid size-10 place-items-center rounded-full border border-line-strong text-lg font-semibold hover:border-ink aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:border-line-strong'

/** One list of everything to buy for the saved recipes, each at the servings you choose. */
export function ShoppingListPage() {
  const savedIds = useSavedRecipeIds()
  const state = useShoppingState()
  const recipes = useQuery(recipeQueries.list())
  const [copyStatus, setCopyStatus] = useState('')
  // Lines already ticked when the page opened sink to the bottom; lines ticked now stay put,
  // so the checkbox under your finger (and keyboard focus) doesn't jump away mid-shop.
  const [tickedOnArrival] = useState(() => new Set(state.checked))
  // Any change to the list makes "Copied 12 items." out of date.
  const change = (action: () => void) => () => {
    action()
    setCopyStatus('')
  }

  const saved = pickSaved(savedIds, recipes.data ?? [])
  const peopleFor = (recipe: { id: string; servings: number }) => state.servings[recipe.id] ?? recipe.servings
  const lines = buildShoppingList(
    saved.filter((recipe) => !state.excluded.includes(recipe.id)).map((recipe) => ({ recipe, people: peopleFor(recipe) })),
  )
  const checked = new Set(state.checked)
  const toBuy = lines.filter((line) => !checked.has(line.key))
  const ordered = [...lines.filter((line) => !tickedOnArrival.has(line.key)), ...lines.filter((line) => tickedOnArrival.has(line.key))]

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
        <div role="status" className="h-64 animate-pulse rounded-2xl bg-surface-sunken motion-reduce:animate-none">
          <span className="sr-only">Loading shopping list</span>
        </div>
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
          {/* Sticky on wide screens, so the servings stay in reach beside a long list. */}
          <section aria-labelledby="list-recipes-heading" className="space-y-4 md:sticky md:top-24 md:self-start">
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
                        onChange={change(() => shoppingActions.toggleIncluded(recipe.id))}
                        className="size-4 shrink-0 accent-[var(--accent)]"
                      />
                      <span className={`font-display text-xl leading-tight ${included ? '' : 'text-ink-subtle line-through'}`}>
                        {recipe.title}
                      </span>
                    </label>
                    {included && (
                      <div role="group" aria-label={`Servings for ${recipe.title}`} className="flex items-center gap-3 pl-7">
                        <button
                          type="button"
                          onClick={change(() => people > 1 && shoppingActions.setServings(recipe.id, people - 1))}
                          aria-disabled={people <= 1}
                          aria-label={`Fewer servings of ${recipe.title}`}
                          className={stepButton}
                        >
                          −
                        </button>
                        <p className="min-w-20 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                          <span className="sr-only">{recipe.title}: </span>Serves {people}
                        </p>
                        <button
                          type="button"
                          onClick={change(() => people < MAX_SERVINGS && shoppingActions.setServings(recipe.id, people + 1))}
                          aria-disabled={people >= MAX_SERVINGS}
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
              <EmptyState title="Nothing to buy yet" description="Tick a recipe under Recipes to add its ingredients." />
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
                  {/* Always rendered: a button that vanishes when clicked drops keyboard focus. */}
                  <button
                    type="button"
                    onClick={change(() => checked.size > 0 && shoppingActions.clearChecked())}
                    aria-disabled={checked.size === 0}
                    className="inline-flex min-h-10 items-center px-2 text-sm font-medium text-accent hover:text-accent-hover aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
                  >
                    Untick all
                  </button>
                  <p className="text-sm text-ink-muted" aria-live="polite">
                    {copyStatus}
                  </p>
                </div>

                <ul className="divide-y divide-line border-y border-line">
                  {ordered.map((line) => {
                    const isChecked = checked.has(line.key)
                    // ids can't hold spaces: aria-describedby reads a space-separated list of them.
                    const id = `buy-${line.key.replace(/[^a-z0-9]+/gi, '-')}`
                    return (
                      <li key={line.key}>
                        <label htmlFor={id} className="flex cursor-pointer items-start gap-3 py-3">
                          <input
                            id={id}
                            type="checkbox"
                            checked={isChecked}
                            onChange={change(() => shoppingActions.toggleChecked(line.key))}
                            // The item is the name; which recipes use it is a description, read after it.
                            aria-label={[line.amount, line.name].filter(Boolean).join(' ')}
                            aria-describedby={`${id}-from`}
                            className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
                          />
                          {/* Stacked on phones, one aligned amount column from sm up. */}
                          <span className={`grid min-w-0 flex-1 gap-x-3 sm:grid-cols-[8rem_minmax(0,1fr)] ${isChecked ? 'text-ink-subtle line-through' : ''}`}>
                            <span className="font-mono text-sm font-semibold tabular-nums">{line.amount}</span>
                            <span className="min-w-0">
                              {line.name}
                              <span id={`${id}-from`} className="block text-sm text-ink-subtle">
                                {line.recipes.join(' · ')}
                              </span>
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
