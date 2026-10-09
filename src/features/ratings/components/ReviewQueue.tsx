import { useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { ErrorState } from '@/components/feedback/ErrorState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StarRating } from '@/components/ui/StarRating'
import type { RecipeWithRatings } from '@/features/recipes/schema'
import { describeError } from '@/services/data'
import { useModerateSubmission } from '../mutations'
import { submissionQueries } from '../queries'
import type { Submission } from '../schema'
import { formatRelativeDate } from '../utils'

/**
 * Visitor reviews waiting for the admin. Approve publishes one on its
 * recipe (with the date it was written); Reject drops it. Nothing here is
 * visible to visitors.
 */
export function ReviewQueue({ recipes }: { recipes: RecipeWithRatings[] }) {
  const queue = useQuery(submissionQueries.list())
  const { approve, reject } = useModerateSubmission()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const title = new Map(recipes.map((recipe) => [recipe.id, recipe.title]))
  const busy = approve.isPending || reject.isPending
  const [toReject, setToReject] = useState<Submission | null>(null)
  // What the last action did, for screen readers (focus alone says nothing about it).
  const [outcome, setOutcome] = useState('')
  const describe = (review: Submission) =>
    `the ${review.score}-star review of ${title.get(review.recipeId) ?? 'a deleted recipe'}`

  // The handled review leaves the list, taking the focused button with it: start from the heading.
  const done = (message: string) => ({
    onSuccess: () => {
      setOutcome(message)
      requestAnimationFrame(() => headingRef.current?.focus())
    },
  })

  return (
    <section aria-labelledby="queue-heading" className="space-y-4">
      <ConfirmDialog
        open={toReject !== null}
        title="Reject this review?"
        description={toReject ? `${describe(toReject)[0]!.toUpperCase()}${describe(toReject).slice(1)} won't be published, and can't be brought back.` : ''}
        confirmLabel="Reject review"
        pendingLabel="Rejecting…"
        isPending={reject.isPending}
        error={reject.isError ? describeError(reject.error) : undefined}
        onCancel={() => {
          setToReject(null)
          reject.reset()
        }}
        onConfirm={() => {
          if (!toReject) return
          const message = `Rejected ${describe(toReject)}.`
          reject.mutate(toReject.id, {
            onSuccess: () => {
              setToReject(null)
              done(message).onSuccess()
            },
          })
        }}
      />
      <div className="flex items-baseline gap-3">
        <h2 id="queue-heading" ref={headingRef} tabIndex={-1} className="text-3xl">
          Waiting for approval
        </h2>
        {queue.data && queue.data.length > 0 && (
          <span className="rounded-full bg-accent-soft px-2 font-mono text-sm leading-6 text-accent-ink tabular-nums">
            {queue.data.length}
            <span className="sr-only"> {queue.data.length === 1 ? 'review' : 'reviews'}</span>
          </span>
        )}
      </div>
      <p className="text-sm text-ink-muted">Reviews visitors send. They appear on the recipe once you approve them.</p>

      {queue.isPending ? (
        <div role="status" className="h-24 animate-pulse rounded-2xl bg-surface-sunken motion-reduce:animate-none">
          <span className="sr-only">Loading the queue…</span>
        </div>
      ) : queue.isError ? (
        <ErrorState title="Couldn't load the review queue" error={queue.error} onRetry={() => void queue.refetch()} />
      ) : queue.data.length === 0 ? (
        <p className="rounded-2xl bg-surface px-4 py-5 text-ink-muted ring-1 ring-line">No reviews waiting.</p>
      ) : (
        <ul className="divide-y divide-line rounded-2xl bg-surface ring-1 ring-line">
          {queue.data.map((review) => {
            const recipeTitle = title.get(review.recipeId) ?? 'A deleted recipe'
            // Unique per review, even with several reviews of one recipe.
            const opening = review.comment.length > 30 ? `${review.comment.slice(0, 30)}…` : review.comment
            const which = ` ${describe(review)} from ${formatRelativeDate(review.createdAt)}${opening ? `: “${opening}”` : ''}`
            return (
              <li key={review.id} className="space-y-2 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link to={`/recipes/${review.recipeId}`} className="inline-flex min-h-10 items-center font-semibold hover:underline">
                    {recipeTitle}
                  </Link>
                  <time dateTime={review.createdAt} className="label-mono text-ink-subtle">
                    {formatRelativeDate(review.createdAt)}
                  </time>
                </div>
                <StarRating value={review.score} />
                {review.comment ? (
                  <p className="font-display text-xl leading-snug break-words">“{review.comment}”</p>
                ) : (
                  <p className="text-sm text-ink-subtle">Stars only, no comment.</p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {/* aria-disabled while busy, not disabled: a disabled button drops focus to the page. */}
                  <button
                    type="button"
                    aria-disabled={busy}
                    onClick={() => !busy && approve.mutate(review.id, done(`Approved ${describe(review)}. It's on the recipe now.`))}
                    className="min-h-10 rounded-full bg-ink px-4 text-sm font-semibold text-canvas hover:bg-accent aria-disabled:opacity-60"
                  >
                    Approve<span className="sr-only">{which}</span>
                  </button>
                  <button
                    type="button"
                    aria-disabled={busy}
                    onClick={() => !busy && setToReject(review)}
                    className="min-h-10 rounded-full px-4 text-sm font-semibold text-danger hover:bg-surface-sunken aria-disabled:opacity-60"
                  >
                    Reject<span className="sr-only">{which}</span>
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {/* Always present, so each new message is announced. Reject's own errors show in its dialog. */}
      <p role="status" className="min-h-5 text-sm">
        {approve.isError ? <span className="text-danger">{describeError(approve.error)}</span> : outcome}
      </p>
    </section>
  )
}
