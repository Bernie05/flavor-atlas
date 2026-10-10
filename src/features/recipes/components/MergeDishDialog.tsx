import { useId, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { inputClass } from '@/components/ui/formStyles'
import type { Dish, Region } from '@/features/dishes/schema'
import { describeError } from '@/services/data'
import { mergeTargets, planMerge } from '../move'
import { useMergeDishes } from '../mutations'
import type { RecipeWithRatings } from '../schema'

interface MergeDishDialogProps {
  /** The dish to merge away; null keeps the dialog closed. */
  source: Dish | null
  dishes: Dish[]
  recipes: RecipeWithRatings[]
  regions: Region[]
  onClose: () => void
  onMerged: (message: string) => void
}

const versions = (n: number) => `${n} ${n === 1 ? 'version' : 'versions'}`

/**
 * Merge one dish into another of its cuisine: its versions move over, then
 * it's deleted. Like moving recipes, the plan is spelled out before saving.
 */
export function MergeDishDialog({ source, dishes, recipes, regions, onClose, onMerged }: MergeDishDialogProps) {
  const selectId = useId()
  const [targetId, setTargetId] = useState('')
  const merge = useMergeDishes()
  const targets = source ? mergeTargets(source, dishes) : []
  const target = targets.find((dish) => dish.id === targetId)
  const plan = source && target ? planMerge(source, target, recipes, regions) : undefined
  const ownVersions = source ? recipes.filter((recipe) => recipe.dishId === source.id).length : 0

  const close = () => {
    setTargetId('')
    merge.reset()
    onClose()
  }

  return (
    <ConfirmDialog
      open={source !== null}
      title={`Merge ${source?.name ?? ''}`}
      description={
        targets.length === 0
          ? `There's no other dish in its cuisine to merge it into.`
          : `Its ${versions(ownVersions)} become versions of the dish you pick, then ${source?.name ?? 'it'} is deleted. Ratings stay with their recipes.`
      }
      canConfirm={targets.length > 0}
      tone="primary"
      confirmLabel={target ? `Merge into ${target.name}` : 'Merge'}
      pendingLabel="Merging…"
      confirmBlocked={!plan}
      blockedHint="Choose a dish first."
      onBlockedConfirm={() => document.getElementById(selectId)?.focus()}
      isPending={merge.isPending}
      error={merge.error ? `${merge.error.message}${merge.error.cause ? ` (${describeError(merge.error.cause)})` : ''}` : undefined}
      // Escape mid-merge would drop the result (no message, focus lost): the dialog stays until it's done.
      onCancel={merge.isPending ? () => {} : close}
      onConfirm={() => {
        if (!plan) return
        merge.mutate(plan, {
          onSuccess: (moved) => {
            onMerged(`Merged ${plan.source.name} into ${plan.target.name}${moved > 0 ? ` (${versions(moved)} moved)` : ''}.`)
            close()
          },
        })
      }}
    >
      {targets.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={selectId} className="text-sm font-semibold">
              Merge into
            </label>
            <select
              id={selectId}
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
              className={inputClass}
            >
              <option value="">Choose a dish…</option>
              {targets.map((dish) => (
                <option key={dish.id} value={dish.id}>
                  {dish.name}
                </option>
              ))}
            </select>
          </div>
          {/* The plan, read out as it changes. */}
          <p aria-live="polite" className="text-sm text-ink-muted empty:hidden">
            {plan &&
              (plan.moves.updates.length > 0
                ? `${plan.target.name} will have ${versions(plan.moves.updates.length + recipes.filter((r) => r.dishId === plan.target.id).length)}.`
                : `${plan.source.name} has no versions, so it's simply deleted.`)}
          </p>
        </div>
      )}
    </ConfirmDialog>
  )
}
