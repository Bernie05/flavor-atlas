import { lazy, Suspense, useState } from 'react'
import { LoadBoundary } from '@/components/feedback/LoadBoundary'
import { StarRating } from '@/components/ui/StarRating'
import type { Rating } from '../schema'
import { summarizeRatings } from '../summary'
import { formatRelativeDate, sortNewestFirst } from '../utils'

// The form (and React Hook Form with it) loads only when a visitor wants to write.
const RatingForm = lazy(() => import('./RatingForm').then((m) => ({ default: m.RatingForm })))

/**
 * The public recipe page's reviews. Visitors can write one, but it goes to
 * the admin's queue: it appears here only once approved (server/data/submissions.ts).
 */
export function RatingsSection({ ratings, recipeId }: { ratings: Rating[]; recipeId?: string }) {
  const summary = summarizeRatings(ratings)
  const reviews = sortNewestFirst(ratings)

  return (
    <section aria-labelledby="ratings-heading" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="ratings-heading" className="text-4xl">
            Reviews
          </h2>
          <p className="label-mono mt-1 text-ink-subtle tabular-nums">
            {summary.count === 0 ? 'No reviews yet' : `${summary.count} ${summary.count === 1 ? 'review' : 'reviews'}`}
          </p>
        </div>
        {summary.count > 0 && (
          <p className="flex items-center gap-3">
            <span className="text-5xl leading-none font-semibold">{summary.average.toFixed(1)}</span>
            <StarRating value={summary.average} size="lg" />
          </p>
        )}
      </div>

      {recipeId && <WriteReview recipeId={recipeId} />}

      {reviews.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {reviews.map((rating) => (
            <li key={rating.id} className="space-y-2 rounded-2xl bg-surface p-5 ring-1 ring-line">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StarRating value={rating.score} />
                <time dateTime={rating.createdAt} className="label-mono text-ink-subtle">
                  {formatRelativeDate(rating.createdAt)}
                </time>
              </div>
              {rating.comment ? (
                <p className="font-display text-xl leading-snug">“{rating.comment}”</p>
              ) : (
                <p className="text-sm text-ink-subtle">Rated without a review.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function WriteReview({ recipeId }: { recipeId: string }) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-5 font-semibold hover:bg-surface-sunken"
      >
        Write a review
      </button>
    )
  }

  return (
    <div className="max-w-xl">
      {/* If the form can't download (a flaky connection, an old tab after a deploy), say so
          here instead of the error replacing the whole recipe page. */}
      <LoadBoundary>
        <Suspense fallback={<div aria-hidden className="h-56 animate-pulse rounded-2xl bg-surface-sunken motion-reduce:animate-none" />}>
          <RatingForm recipeId={recipeId} moderated />
        </Suspense>
      </LoadBoundary>
    </div>
  )
}
