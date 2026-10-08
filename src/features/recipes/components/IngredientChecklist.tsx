import { useState } from 'react'
import type { Ingredient } from '../schema'
import { formatAmount } from '../utils'

interface IngredientChecklistProps {
  ingredients: Ingredient[]
  /** How many the recipe is written for. */
  servings: number
  /** How many you're cooking for. Owned by the page, so cook mode scales the same way. */
  people: number
  onPeopleChange: (people: number) => void
}

const MAX_SERVINGS = 24

/**
 * Ingredients as a mise en place checklist, with a servings scaler.
 * The servings number is controlled by the page (cook mode needs it too); the
 * ticks stay local because nothing else reads them. Both reset when you
 * leave the recipe: a cooking aid, not data.
 */
export function IngredientChecklist({ ingredients, servings, people, onPeopleChange }: IngredientChecklistProps) {
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set())

  const toggle = (index: number) =>
    setChecked((previous) => {
      const next = new Set(previous)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })

  const stepButton =
    'grid size-10 place-items-center rounded-full border border-line-strong text-lg font-semibold hover:bg-surface-sunken disabled:opacity-40'

  return (
    <section aria-labelledby="ingredients-heading" className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="ingredients-heading" className="text-4xl">
          Ingredients
        </h2>
        <p className="label-mono text-ink-subtle tabular-nums" aria-live="polite">
          {checked.size} of {ingredients.length} ready
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onPeopleChange(Math.max(1, people - 1))}
          disabled={people <= 1}
          aria-label="Fewer servings"
          className={stepButton}
        >
          −
        </button>
        <p className="min-w-24 text-center font-semibold tabular-nums" aria-live="polite">
          Serves {people}
        </p>
        <button
          type="button"
          onClick={() => onPeopleChange(Math.min(MAX_SERVINGS, people + 1))}
          disabled={people >= MAX_SERVINGS}
          aria-label="More servings"
          className={stepButton}
        >
          +
        </button>
        {people !== servings && (
          <button type="button" onClick={() => onPeopleChange(servings)} className="inline-flex min-h-10 items-center px-2 text-sm font-medium text-accent hover:text-accent-hover">
            Reset
          </button>
        )}
      </div>

      <ul className="divide-y divide-line border-y border-line">
        {ingredients.map((ingredient, index) => {
          const id = `ingredient-${index}`
          const isChecked = checked.has(index)
          return (
            <li key={index}>
              <label htmlFor={id} className="flex cursor-pointer items-start gap-3 py-3 max-md:scroll-mt-32">
                <input
                  id={id}
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(index)}
                  className="mt-1 size-4 shrink-0 accent-[var(--tint)]"
                />
                <span className={`flex min-w-0 flex-1 items-baseline gap-3 ${isChecked ? 'text-ink-subtle line-through' : ''}`}>
                  <span className="w-20 shrink-0 font-mono text-sm font-semibold tabular-nums">
                    {formatAmount(ingredient, servings, people)}
                  </span>
                  <span className="min-w-0">{ingredient.name}</span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      {checked.size > 0 && (
        <button
          type="button"
          onClick={() => setChecked(new Set())}
          className="inline-flex min-h-10 items-center text-sm font-medium text-accent hover:text-accent-hover"
        >
          Clear checklist
        </button>
      )}
    </section>
  )
}
