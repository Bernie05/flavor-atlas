import { StarRating } from '@/components/ui/StarRating'
import type { Rating } from '../schema'
import { summarizeRatings } from '../summary'
import { formatRelativeDate, sortNewestFirst } from '../utils'

/** Read-only reviews for the public recipe page. Reviews are added in /admin. */
export function RatingsSection({ ratings }: { ratings: Rating[] }) {
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
