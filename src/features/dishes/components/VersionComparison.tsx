import { Link } from 'react-router'
import type { RecipeWithRatings } from '@/features/recipes/schema'
import { compareVersions } from '../utils'

/** Chips shown per list before "+N more": ramen versions share almost nothing and would fill the screen. */
const MAX_CHIPS = 6

/**
 * What sets each version of a dish apart, by ingredient: what every version
 * shares, then what each one adds and leaves out. Expects the page's cuisine
 * tint around it.
 */
export function VersionComparison({ recipes }: { recipes: RecipeWithRatings[] }) {
  const { shared, versions } = compareVersions(recipes.toSorted((a, b) => a.title.localeCompare(b.title)))
  if (versions.length === 0) return null

  return (
    <section aria-labelledby="compare-heading" className="space-y-6">
      <div>
        <h2 id="compare-heading" className="text-4xl">
          How the versions <em>differ</em>
        </h2>
        <p className="mt-1 text-ink-muted">Compared by ingredient, so you can pick the one that fits your kitchen.</p>
      </div>

      {shared.length > 0 && (
        <div className="space-y-2 rounded-2xl bg-tint-soft p-5">
          <p className="label-mono text-tint-ink">In every version</p>
          <ChipList items={shared} chipClass="bg-surface text-ink ring-1 ring-tint/25" />
        </div>
      )}

      <ul className="divide-y divide-line border-y border-line">
        {versions.map(({ recipe, only, without }) => (
          <li key={recipe.id} className="grid gap-3 py-5 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-8">
            <div className="min-w-0 space-y-1">
              <Link to={`/recipes/${recipe.id}`} className="inline-flex min-h-10 items-center font-display text-2xl leading-tight hover:underline">
                {recipe.title}
              </Link>
              {recipe.variantNote && <p className="text-sm text-ink-muted">{recipe.variantNote}</p>}
            </div>
            <div className="min-w-0 space-y-3">
              {only.length > 0 && (
                <div className="space-y-1.5">
                  <p className="label-mono text-ink-subtle">Adds</p>
                  <ChipList items={only} chipClass="bg-tint-soft font-medium text-tint-ink" />
                </div>
              )}
              {without.length > 0 && (
                <div className="space-y-1.5">
                  <p className="label-mono text-ink-subtle">Leaves out</p>
                  <ChipList items={without} chipClass="text-ink-muted line-through ring-1 ring-line" />
                </div>
              )}
              {only.length === 0 && without.length === 0 && (
                <p className="text-ink-muted">The shared base, cooked its own way.</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ChipList({ items, chipClass }: { items: string[]; chipClass: string }) {
  const chips = (list: string[]) =>
    list.map((item) => (
      <li key={item} className={`rounded-full px-3 py-1 text-sm ${chipClass}`}>
        {item}
      </li>
    ))
  const hidden = items.slice(MAX_CHIPS)

  return (
    <div className="space-y-2">
      <ul className="flex flex-wrap gap-2">{chips(items.slice(0, MAX_CHIPS))}</ul>
      {/* <details>, not a tooltip, so touch and keyboard users can open the rest too. */}
      {hidden.length > 0 && (
        <details className="group">
          <summary className="inline-flex min-h-10 cursor-pointer items-center text-sm font-medium text-accent hover:text-accent-hover">
            <span className="group-open:hidden">+{hidden.length} more</span>
            <span className="hidden group-open:inline">Show fewer</span>
          </summary>
          <ul className="mt-1 flex flex-wrap gap-2">{chips(hidden)}</ul>
        </details>
      )}
    </div>
  )
}
