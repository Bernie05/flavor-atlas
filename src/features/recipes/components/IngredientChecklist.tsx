import { useState } from 'react'
import type { Ingredient } from '../schema'
import { formatQuantity } from '../utils'

interface IngredientChecklistProps {
  ingredients: Ingredient[]
}

/**
 * Ingredients as a mise en place checklist: tick items off as you gather them.
 * State is local and resets when you leave the recipe; it's a cooking aid,
 * not data worth saving.
 */
export function IngredientChecklist({ ingredients }: IngredientChecklistProps) {
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set())

  const toggle = (index: number) =>
    setChecked((previous) => {
      const next = new Set(previous)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })

  return (
    <section aria-labelledby="ingredients-heading" className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="ingredients-heading" className="text-2xl">
          Ingredients
        </h2>
        <p className="label-mono text-ink-subtle tabular-nums" aria-live="polite">
          {checked.size} of {ingredients.length} ready
        </p>
      </div>

      <ul className="mt-3 divide-y divide-line">
        {ingredients.map((ingredient, index) => {
          const id = `ingredient-${index}`
          const isChecked = checked.has(index)
          return (
            <li key={index}>
              <label htmlFor={id} className="flex cursor-pointer items-start gap-3 py-2.5">
                <input
                  id={id}
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(index)}
                  className="mt-1 size-4 shrink-0 accent-[var(--tint)]"
                />
                <span className={`flex min-w-0 flex-1 items-baseline gap-3 ${isChecked ? 'text-ink-subtle line-through' : ''}`}>
                  <span className="w-20 shrink-0 font-mono text-sm font-semibold tabular-nums">
                    {ingredient.quantity !== undefined && formatQuantity(ingredient.quantity)} {ingredient.unit}
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
          className="mt-2 text-sm font-medium text-accent hover:text-accent-hover"
        >
          Clear checklist
        </button>
      )}
    </section>
  )
}
