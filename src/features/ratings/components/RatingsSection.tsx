import { lazy, Suspense } from 'react'
import { StarRating } from '@/components/ui/StarRating'
import type { Rating } from '../schema'
import { summarizeRatings } from '../summary'
import { formatRelativeDate, sortNewestFirst } from '../utils'

// The form brings in React Hook Form. It sits below the recipe, so load it
// lazily and keep the form library out of the bundle every visitor downloads.
const RatingForm = lazy(() => import('./RatingForm').then((m) => ({ default: m.RatingForm })))

interface RatingsSectionProps {
  recipeId: string
  ratings: Rating[]
}

export function RatingsSection({ recipeId, ratings }: RatingsSectionProps) {
  const summary = summarizeRatings(ratings)
  const reviews = sortNewestFirst(ratings)

  return (
    <section aria-labelledby="ratings-heading" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="ratings-heading" className="text-2xl">
            Ratings & reviews
          </h2>
          <p className="label-mono mt-1 text-ink-subtle tabular-nums">
            {summary.count === 0
              ? 'No ratings yet'
              : `${summary.count} ${summary.count === 1 ? 'rating' : 'ratings'}`}
          </p>
        </div>
        {summary.count > 0 && (
          <p className="flex items-center gap-3">
            <span className="font-display text-5xl leading-none tabular-nums">{summary.average.toFixed(1)}</span>
            <StarRating value={summary.average} size="lg" />
          </p>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="min-w-0">
          <h3 className="sr-only">Rate this recipe</h3>
          <Suspense
            fallback={<div aria-hidden className="h-64 animate-pulse rounded-2xl bg-surface-sunken motion-reduce:animate-none" />}
          >
            <RatingForm recipeId={recipeId} />
          </Suspense>
        </div>

        <div className="min-w-0">
          <h3 className="sr-only">Reviews</h3>
          {reviews.length === 0 ? (
            <p className="text-ink-muted">Cooked it? Be the first to rate it.</p>
          ) : (
            <ul className="divide-y divide-line">
              {reviews.map((rating) => (
                <li key={rating.id} className="space-y-1.5 py-4 first:pt-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StarRating value={rating.score} />
                    <time dateTime={rating.createdAt} className="label-mono text-ink-subtle">
                      {formatRelativeDate(rating.createdAt)}
                    </time>
                  </div>
                  {rating.comment ? (
                    <p className="max-w-prose">{rating.comment}</p>
                  ) : (
                    <p className="text-sm text-ink-subtle">Rated without a review.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
