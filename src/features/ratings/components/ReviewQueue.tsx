import { useQuery } from '@tanstack/react-query'
import { useRef } from 'react'
import { Link } from 'react-router'
import { ErrorState } from '@/components/feedback/ErrorState'
import { StarRating } from '@/components/ui/StarRating'
import type { RecipeWithRatings } from '@/features/recipes/schema'
import { describeError } from '@/services/data'
import { useModerateSubmission } from '../mutations'
import { submissionQueries } from '../queries'
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
  const failure = approve.error ?? reject.error

  // The handled review leaves the list, taking the focused button with it: start from the heading.
  const done = { onSuccess: () => requestAnimationFrame(() => headingRef.current?.focus()) }

  return (
    <section aria-labelledby="queue-heading" className="space-y-4">
      <div className="flex items-baseline gap-3">
        <h2 id="queue-heading" ref={headingRef} tabIndex={-1} className="text-3xl outline-none">
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
        <ErrorState error={queue.error} onRetry={() => void queue.refetch()} />
      ) : queue.data.length === 0 ? (
        <p className="rounded-2xl bg-surface px-4 py-5 text-ink-muted ring-1 ring-line">No reviews waiting.</p>
      ) : (
        <ul className="divide-y divide-line rounded-2xl bg-surface ring-1 ring-line">
          {queue.data.map((review) => {
            const recipeTitle = title.get(review.recipeId) ?? 'A deleted recipe'
            return (
              <li key={review.id} className="space-y-2 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link to={`/recipes/${review.recipeId}`} className="font-semibold hover:underline">
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
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => approve.mutate(review.id, done)}
                    className="min-h-10 rounded-full bg-ink px-4 text-sm font-semibold text-canvas hover:bg-accent disabled:opacity-60"
                  >
                    Approve<span className="sr-only"> the review of {recipeTitle}</span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => reject.mutate(review.id, done)}
                    className="min-h-10 rounded-full px-4 text-sm font-semibold text-danger hover:bg-surface-sunken disabled:opacity-60"
                  >
                    Reject<span className="sr-only"> the review of {recipeTitle}</span>
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <p role="alert" className="text-sm text-danger empty:hidden">
        {failure ? describeError(failure) : ''}
      </p>
    </section>
  )
}
