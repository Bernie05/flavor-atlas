import { useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { undoneMessage } from '@/features/recipes/move'
import { useUndoChange } from '@/features/recipes/mutations'
import { useNow } from '@/lib/useNow'
import { describeError } from '@/services/data'
import { activityQueries } from '../queries'
import type { Activity, ActivityKind } from '../schema'
import { timeAgo, undoAvailable } from '../utils'

/** Entries shown before "Show all", so the dashboard stays a glance. */
const PREVIEW = 8

const KIND_LABELS: Record<ActivityKind, string> = {
  recipe: 'Recipe',
  cuisine: 'Cuisine',
  dish: 'Dish',
  region: 'Region',
  review: 'Review',
  move: 'Move',
  merge: 'Merge',
  undo: 'Undo',
}

/**
 * The admin's recent changes, newest first, with Undo for a move or merge
 * still inside its window. The history is written after each change (see
 * activityMeta); this only reads it. A history that can't load leaves the
 * rest of the dashboard alone.
 */
export function RecentChanges() {
  const activity = useQuery(activityQueries.list())
  const undoChange = useUndoChange()
  const now = useNow()
  const [showAll, setShowAll] = useState(false)
  // The entry the last Undo was for: its row shows the progress, then any error.
  const [undoneId, setUndoneId] = useState<string | null>(null)
  // What the last Undo did, read out (the row's button goes away, focus moves to the heading).
  const [outcome, setOutcome] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)

  const undo = (entry: Activity) => {
    if (!entry.undo || undoChange.isPending) return
    setUndoneId(entry.id)
    setOutcome('')
    undoChange.mutate(entry.undo, {
      onSuccess: () => {
        setOutcome(undoneMessage(entry.undo!))
        requestAnimationFrame(() => headingRef.current?.focus())
      },
    })
  }

  const entries = activity.data ?? []
  const shown = showAll ? entries : entries.slice(0, PREVIEW)

  return (
    <section aria-labelledby="changes-heading" className="min-w-0 space-y-4">
      <div className="flex min-h-10 items-end justify-between gap-3">
        <h2 id="changes-heading" ref={headingRef} tabIndex={-1} className="text-3xl">
          Recent changes
        </h2>
      </div>
      <p role="status" className="text-sm font-semibold text-accent-ink empty:hidden">
        {outcome}
      </p>

      {activity.isPending ? (
        <div aria-hidden className="h-40 animate-pulse rounded-2xl bg-surface-sunken" />
      ) : activity.isError ? (
        <p role="alert" className="rounded-2xl bg-surface px-4 py-4 text-sm text-ink-muted ring-1 ring-line">
          The change history couldn't load ({describeError(activity.error)}).{' '}
          <button type="button" onClick={() => void activity.refetch()} className="min-h-10 font-semibold text-accent hover:underline">
            Try again
          </button>
        </p>
      ) : entries.length === 0 ? (
        <p className="rounded-2xl bg-surface px-4 py-6 text-ink-muted ring-1 ring-line">
          Nothing yet. Edits, moves, merges and reviews you handle will show up here.
        </p>
      ) : (
        <>
          <ol className="divide-y divide-line rounded-2xl bg-surface ring-1 ring-line">
            {shown.map((entry) => {
              const canUndo = undoAvailable(entry, now)
              const mine = undoneId === entry.id
              return (
                <li key={entry.id} className="grid gap-x-3 gap-y-1 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className={`break-words ${entry.undoneAt ? 'text-ink-muted line-through decoration-1' : 'font-semibold'}`}>
                      {entry.link && !entry.undoneAt ? (
                        <Link to={entry.link} className="hover:underline">
                          {entry.summary}
                        </Link>
                      ) : (
                        entry.summary
                      )}
                      {entry.undoneAt && <span className="sr-only"> (undone)</span>}
                    </p>
                    <p className="label-mono text-ink-subtle">
                      {KIND_LABELS[entry.kind]} · <time dateTime={entry.at}>{timeAgo(entry.at, now)}</time>
                      {entry.undoneAt && ' · undone'}
                    </p>
                    {mine && undoChange.isError && (
                      <p className="mt-1 text-sm text-danger">{undoChange.error.message}</p>
                    )}
                  </div>
                  {canUndo && (
                    <button
                      type="button"
                      onClick={() => undo(entry)}
                      aria-disabled={undoChange.isPending || undefined}
                      className="-ml-3 min-h-10 justify-self-start rounded-full px-3 text-sm font-semibold text-accent hover:bg-surface-sunken aria-disabled:cursor-wait aria-disabled:opacity-80 sm:ml-0"
                    >
                      {mine && undoChange.isPending ? 'Undoing…' : 'Undo'}
                      <span className="sr-only">: {entry.summary}</span>
                    </button>
                  )}
                </li>
              )
            })}
          </ol>
          {entries.length > PREVIEW && (
            <button
              type="button"
              onClick={() => setShowAll((all) => !all)}
              aria-expanded={showAll}
              className="label-mono min-h-10 text-accent-ink hover:underline"
            >
              {showAll ? 'Show fewer' : `Show all ${entries.length}`}
            </button>
          )}
        </>
      )}
    </section>
  )
}
