import { useState } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { Cuisine } from '@/features/cuisines/schema'
import type { Dish, Region } from '@/features/dishes/schema'
import { describeError } from '@/services/data'
import { useMoveRecipes } from '../mutations'
import { planMove } from '../move'
import type { RecipeWithRatings } from '../schema'

interface MoveRecipesDialogProps {
  open: boolean
  recipes: RecipeWithRatings[]
  cuisines: Cuisine[]
  dishes: Dish[]
  regions: Region[]
  onClose: () => void
  onMoved: (message: string) => void
}

/**
 * Move the selected recipes to another dish (and so its cuisine). The plan
 * (planMove) is spelled out before anything is saved: which recipes move,
 * which lose a regional kitchen that belongs to the old cuisine.
 */
export function MoveRecipesDialog({ open, recipes, cuisines, dishes, regions, onClose, onMoved }: MoveRecipesDialogProps) {
  const [targetId, setTargetId] = useState('')
  const move = useMoveRecipes()
  const target = dishes.find((dish) => dish.id === targetId)
  const plan = target ? planMove(recipes, target, regions) : undefined
  const cuisineName = new Map(cuisines.map((c) => [c.id, c.name]))
  const count = (n: number) => `${n} ${n === 1 ? 'recipe' : 'recipes'}`

  const close = () => {
    setTargetId('')
    move.reset()
    onClose()
  }

  return (
    <ConfirmDialog
      open={open}
      title={`Move ${count(recipes.length)}`}
      description="Each one becomes a version of the dish you pick, in that dish's cuisine."
      tone="primary"
      confirmLabel={plan ? `Move ${count(plan.updates.length)}` : 'Move'}
      pendingLabel="Moving…"
      confirmBlocked={!plan || plan.updates.length === 0}
      blockedHint={plan ? 'They are all versions of that dish already.' : 'Choose a dish first.'}
      onBlockedConfirm={() => document.getElementById('move-target')?.focus()}
      isPending={move.isPending}
      error={move.error ? `${move.error.message}${move.error.cause ? ` (${describeError(move.error.cause)})` : ''}` : undefined}
      onCancel={close}
      onConfirm={() => {
        if (!plan || !target) return
        move.mutate(plan, {
          onSuccess: (moved) => {
            onMoved(`Moved ${count(moved)} to ${target.name}.`)
            close()
          },
        })
      }}
    >
      <div className="space-y-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="move-target" className="text-sm font-semibold">
            Move to
          </label>
          <select
            id="move-target"
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3"
          >
            <option value="">Choose a dish…</option>
            {cuisines.map((cuisine) => (
              <optgroup key={cuisine.id} label={cuisine.name}>
                {dishes
                  .filter((dish) => dish.cuisineId === cuisine.id)
                  .toSorted((a, b) => a.name.localeCompare(b.name))
                  .map((dish) => (
                    <option key={dish.id} value={dish.id}>
                      {dish.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>
        {/* The plan, read out as it changes. */}
        <div aria-live="polite" className="space-y-2 text-sm text-ink-muted">
          {plan && target && (
            <>
              {plan.updates.length > 0 && (
                <p>
                  {count(plan.updates.length)} will become {plan.updates.length === 1 ? 'a version' : 'versions'} of{' '}
                  <span className="font-semibold text-ink">{target.name}</span> ({cuisineName.get(target.cuisineId)}).
                </p>
              )}
              {plan.losesRegion.length > 0 && (
                <p>
                  Regional kitchens belong to a cuisine, so these lose theirs (their notes stay):{' '}
                  {plan.losesRegion.map((item) => `${item.title} (${item.region})`).join(', ')}.
                </p>
              )}
              {plan.unchanged.length > 0 && <p>Already versions of {target.name}: {plan.unchanged.join(', ')}.</p>}
            </>
          )}
        </div>
      </div>
    </ConfirmDialog>
  )
}
