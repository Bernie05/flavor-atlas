import { useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { canUndo, undoneMessage, type Undo } from '@/features/recipes/move'
import { useUndoChange } from '@/features/recipes/mutations'
import { describeError } from '@/services/data'

/** Navigation state the admin pages pass along after saving or deleting. */
export interface FlashState {
  flash?: string
  /** A move or merge that can still be reversed: the message offers Undo. */
  undo?: Undo
}

/** The innermost error: undo wraps saveMoves' error, which wraps the request's. */
const rootCause = (error: unknown): unknown => (error instanceof Error && error.cause !== undefined ? rootCause(error.cause) : error)

const buttonClass = 'min-h-10 rounded-full px-3 text-sm font-semibold hover:bg-surface/60'

/** Shows a one-time message passed in navigation state, e.g. "Added Japchae.", with Undo when there's something to undo. */
export function FlashMessage() {
  const location = useLocation()
  const navigate = useNavigate()
  const undoChange = useUndoChange()
  const dismissRef = useRef<HTMLButtonElement>(null)
  const state = location.state as FlashState | null
  const message = state?.flash
  if (!message) return null
  const undo = state.undo

  // Replacing the state (not pushing) so the message doesn't come back on refresh or back-navigation.
  // The undo's own error belongs to this message: a new one starts clean.
  const replace = (next: FlashState | null) => {
    undoChange.reset()
    navigate(location.pathname + location.search, { replace: true, state: next })
  }

  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl bg-accent-soft px-4 py-3 text-accent-ink">
      <p className="text-sm font-semibold">{message}</p>
      {undoChange.isError && (
        <p className="w-full text-sm text-danger">
          {/* The server's reason, under the "Moved n of m" wrapper a failed recipe save adds. */}
          {undoChange.error.message} ({describeError(rootCause(undoChange.error))})
        </p>
      )}
      <div className="flex gap-1">
        {undo && (
          <button
            type="button"
            aria-disabled={undoChange.isPending || undefined}
            onClick={() => {
              if (undoChange.isPending) return
              // Checked on press (event handlers may read the clock; rendering may not). A message reached
              // again with Back long after could otherwise overwrite changes made since.
              if (!canUndo(undo, Date.now())) {
                replace({ flash: `${message} It's too late to undo: change it back by hand.` })
                requestAnimationFrame(() => dismissRef.current?.focus())
                return
              }
              undoChange.mutate(undo, {
                onSuccess: () => {
                  replace({ flash: undoneMessage(undo) })
                  // The Undo button goes away; focus stays in the message, on what's left.
                  requestAnimationFrame(() => dismissRef.current?.focus())
                },
              })
            }}
            className={`${buttonClass} underline underline-offset-4 aria-disabled:cursor-wait aria-disabled:opacity-80`}
          >
            {undoChange.isPending ? 'Undoing…' : 'Undo'}
          </button>
        )}
        <button ref={dismissRef} type="button" onClick={() => replace(null)} className={buttonClass}>
          Dismiss
        </button>
      </div>
    </div>
  )
}
