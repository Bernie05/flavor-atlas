import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CardGridSkeleton } from '@/components/feedback/CardGridSkeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { inputClass } from '@/components/ui/formStyles'
import { StarRating } from '@/components/ui/StarRating'
import { listReviews, type ReviewRow } from '@/features/admin/stats'
import { RatingForm } from '@/features/ratings/components/RatingForm'
import { useDeleteRating } from '@/features/ratings/mutations'
import { formatRelativeDate } from '@/features/ratings/utils'
import { recipeQueries } from '@/features/recipes/queries'
import { describeError } from '@/services/data'

export function AdminReviewsPage() {
  const recipes = useQuery(recipeQueries.list())
  const deleteRating = useDeleteRating()
  const [searchParams] = useSearchParams()
  // ?recipe=… arrives from the dashboard's "Add review" links.
  const [recipeId, setRecipeId] = useState(searchParams.get('recipe') ?? '')
  const [toDelete, setToDelete] = useState<ReviewRow | null>(null)

  if (recipes.isPending) return <CardGridSkeleton />
  if (recipes.isError) return <ErrorState error={recipes.error} onRetry={() => void recipes.refetch()} />

  const reviews = listReviews(recipes.data)
  const sortedRecipes = recipes.data.toSorted((a, b) => a.title.localeCompare(b.title))

  return (
    <div className="space-y-8">
      <title>Reviews · Flavor Atlas admin</title>
      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this review?"
        description={`The ${toDelete?.score ?? ''}-star review of ${toDelete?.recipeTitle ?? 'this recipe'} will be removed.`}
        confirmLabel="Delete review"
        pendingLabel="Deleting…"
        isPending={deleteRating.isPending}
        error={deleteRating.isError ? describeError(deleteRating.error) : undefined}
        onCancel={() => {
          setToDelete(null)
          deleteRating.reset()
        }}
        onConfirm={() => toDelete && deleteRating.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />

      <header>
        <h1 className="text-5xl">Reviews</h1>
        <p className="label-mono mt-1 text-ink-subtle tabular-nums">{reviews.length} in total</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,24rem)_1fr]">
        <section aria-labelledby="add-review-heading" className="space-y-4 lg:sticky lg:top-32 lg:self-start">
          <h2 id="add-review-heading" className="text-3xl">
            Add a review
          </h2>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="review-recipe" className="text-sm font-semibold">
              Recipe
            </label>
            <select
              id="review-recipe"
              value={recipeId}
              onChange={(event) => setRecipeId(event.target.value)}
              className={inputClass}
            >
              <option value="">Choose a recipe…</option>
              {sortedRecipes.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.title}
                </option>
              ))}
            </select>
          </div>
          {/* Keyed so switching recipes starts a fresh form. */}
          {recipeId && <RatingForm key={recipeId} recipeId={recipeId} />}
        </section>

        <section aria-labelledby="all-reviews-heading" className="min-w-0 space-y-4">
          <h2 id="all-reviews-heading" className="text-3xl">
            All reviews
          </h2>
          {reviews.length === 0 ? (
            <p className="text-ink-muted">No reviews yet.</p>
          ) : (
            <ul className="divide-y divide-line rounded-2xl bg-surface ring-1 ring-line">
              {reviews.map((review) => (
                <li key={review.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Link to={`/recipes/${review.recipeId}`} className="font-semibold hover:underline">
                        {review.recipeTitle}
                      </Link>
                      <time dateTime={review.createdAt} className="label-mono text-ink-subtle">
                        {formatRelativeDate(review.createdAt)}
                      </time>
                    </div>
                    <StarRating value={review.score} />
                    {review.comment && <p className="text-sm text-ink-muted">{review.comment}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setToDelete(review)}
                    className="inline-flex min-h-10 shrink-0 items-center rounded-full px-3 text-sm font-semibold text-danger hover:bg-surface-sunken"
                  >
                    Delete<span className="sr-only"> review of {review.recipeTitle}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
