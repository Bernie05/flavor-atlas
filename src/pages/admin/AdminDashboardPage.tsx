import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { CardGridSkeleton } from '@/components/feedback/CardGridSkeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { FoodEmoji } from '@/components/ui/FoodEmoji'
import { StarRating } from '@/components/ui/StarRating'
import { StatTile } from '@/features/admin/components/StatTile'
import { computeStats, listReviews } from '@/features/admin/stats'
import { cuisineQueries } from '@/features/cuisines/queries'
import { formatRelativeDate } from '@/features/ratings/utils'
import { recipeQueries } from '@/features/recipes/queries'

export function AdminDashboardPage() {
  const recipes = useQuery(recipeQueries.list())
  const cuisines = useQuery(cuisineQueries.list())

  if (recipes.isPending || cuisines.isPending) return <CardGridSkeleton count={4} />
  if (recipes.isError || cuisines.isError) {
    return <ErrorState error={recipes.error ?? cuisines.error} onRetry={() => void recipes.refetch()} />
  }

  const stats = computeStats(recipes.data, cuisines.data.length)
  const unrated = recipes.data.filter((recipe) => recipe.ratings.length === 0)
  const latestReviews = listReviews(recipes.data).slice(0, 5)
  const cuisineEmoji = new Map(cuisines.data.map((c) => [c.id, c.emoji]))

  return (
    <div className="space-y-10">
      <title>Dashboard · Flavor Atlas admin</title>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono text-accent-ink">Admin</p>
          <h1 className="mt-1 text-5xl">
            Your <em>kitchen</em>
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/reviews"
            className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 font-semibold hover:bg-surface-sunken"
          >
            Add a review
          </Link>
          <Link
            to="/admin/recipes/new"
            className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 font-semibold text-canvas hover:bg-accent"
          >
            + New recipe
          </Link>
        </div>
      </header>

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Recipes" value={String(stats.recipes)} hint={`Across ${stats.cuisines} cuisines`} />
        <StatTile label="Reviews" value={String(stats.reviews)} />
        <StatTile
          label="Average rating"
          value={stats.reviews ? `${stats.averageScore.toFixed(1)} / 5` : 'None yet'}
        />
        <StatTile
          label="Without reviews"
          value={String(stats.unrated)}
          hint={stats.unrated ? 'Recipes waiting for a first review' : 'Every recipe has a review'}
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="unrated-heading" className="space-y-4">
          <h2 id="unrated-heading" className="text-3xl">
            Needs a review
          </h2>
          {unrated.length === 0 ? (
            <p className="text-ink-muted">Every recipe has at least one review.</p>
          ) : (
            <ul className="divide-y divide-line rounded-2xl bg-surface ring-1 ring-line">
              {unrated.map((recipe) => (
                <li key={recipe.id} className="flex items-center gap-3 px-4 py-3">
                  <FoodEmoji emoji={recipe.emoji || cuisineEmoji.get(recipe.cuisineId) || '🍽️'} size="sm" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{recipe.title}</span>
                  <Link
                    to={`/admin/reviews?recipe=${recipe.id}`}
                    className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold text-accent hover:bg-accent-soft"
                  >
                    Add review
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="latest-heading" className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 id="latest-heading" className="text-3xl">
              Latest reviews
            </h2>
            <Link to="/admin/reviews" className="label-mono inline-flex min-h-10 items-center text-accent-ink hover:underline">
              All reviews
            </Link>
          </div>
          {latestReviews.length === 0 ? (
            <p className="text-ink-muted">No reviews yet.</p>
          ) : (
            <ul className="divide-y divide-line rounded-2xl bg-surface ring-1 ring-line">
              {latestReviews.map((review) => (
                <li key={review.id} className="space-y-1 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{review.recipeTitle}</span>
                    <time dateTime={review.createdAt} className="label-mono text-ink-subtle">
                      {formatRelativeDate(review.createdAt)}
                    </time>
                  </div>
                  <StarRating value={review.score} />
                  {review.comment && <p className="text-sm text-ink-muted">{review.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
