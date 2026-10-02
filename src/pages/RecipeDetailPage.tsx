import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ErrorState } from '@/components/feedback/ErrorState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Plate } from '@/components/ui/Plate'
import { StarRating } from '@/components/ui/StarRating'
import { cuisineQueries } from '@/features/cuisines/queries'
import { cuisineTint } from '@/features/cuisines/utils'
import { summarizeRatings } from '@/features/ratings/summary'
import { IngredientChecklist } from '@/features/recipes/components/IngredientChecklist'
import { useDeleteRecipe } from '@/features/recipes/mutations'
import { recipeQueries } from '@/features/recipes/queries'
import { DIFFICULTY_LABELS, formatDuration, totalMinutes } from '@/features/recipes/utils'
import { NotFoundError, describeError } from '@/services/data'
import { NotFoundPage } from './NotFoundPage'

export function RecipeDetailPage() {
  const { recipeId = '' } = useParams()
  const recipeQuery = useQuery(recipeQueries.detail(recipeId))
  // Usually already cached from the home page, so this costs no extra request.
  const cuisines = useQuery(cuisineQueries.list())
  const navigate = useNavigate()
  const deleteRecipe = useDeleteRecipe()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // A deleted recipe's query is removed; don't flash "not found" while leaving.
  if (deleteRecipe.isSuccess) return null

  if (recipeQuery.error instanceof NotFoundError) {
    return <NotFoundPage message="This recipe may have been deleted." />
  }
  if (recipeQuery.isError) {
    return <ErrorState error={recipeQuery.error} onRetry={() => recipeQuery.refetch()} />
  }
  if (recipeQuery.isPending) {
    return <RecipeDetailSkeleton />
  }

  const recipe = recipeQuery.data
  const cuisine = cuisines.data?.find((c) => c.id === recipe.cuisineId)
  const rating = summarizeRatings(recipe.ratings)

  const facts = [
    { label: 'Prep', value: formatDuration(recipe.prepMinutes) },
    { label: 'Cook', value: formatDuration(recipe.cookMinutes) },
    { label: 'Total', value: formatDuration(totalMinutes(recipe)) },
    { label: 'Serves', value: String(recipe.servings) },
    { label: 'Difficulty', value: DIFFICULTY_LABELS[recipe.difficulty] },
  ]

  return (
    <article className="space-y-8" style={cuisineTint(recipe.cuisineId)}>
      <title>{`${recipe.title} · Flavor Atlas`}</title>

      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete ${recipe.title}?`}
        description="The recipe and its ratings will be removed. This can't be undone."
        confirmLabel="Delete recipe"
        pendingLabel="Deleting…"
        isPending={deleteRecipe.isPending}
        error={deleteRecipe.isError ? describeError(deleteRecipe.error) : undefined}
        onCancel={() => {
          setConfirmingDelete(false)
          deleteRecipe.reset()
        }}
        onConfirm={() =>
          deleteRecipe.mutate(recipe.id, {
            onSuccess: () => navigate(`/cuisines/${recipe.cuisineId}`, { replace: true }),
          })
        }
      />

      <header className="atlas-dots grid items-center gap-6 rounded-3xl p-5 sm:grid-cols-[1fr_auto] sm:p-8">
        <div className="min-w-0 space-y-3">
          <nav aria-label="Breadcrumb" className="label-mono text-tint-ink">
            <Link to="/" className="inline-block py-2 hover:underline">
              Cuisines
            </Link>
            {cuisine && (
              <>
                <span aria-hidden> / </span>
                <Link to={`/cuisines/${cuisine.id}`} className="inline-block py-2 hover:underline">
                  {cuisine.name}
                </Link>
              </>
            )}
          </nav>
          <h1 className="text-4xl sm:text-5xl">{recipe.title}</h1>
          <StarRating value={rating.average} count={rating.count} size="lg" />
          {recipe.description && <p className="max-w-prose text-ink-muted">{recipe.description}</p>}
        </div>
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="size-40 max-w-full justify-self-center rounded-full object-cover ring-8 ring-[var(--plate)] sm:size-48"
          />
        ) : (
          <Plate
            emoji={recipe.emoji || cuisine?.emoji || '🍽️'}
            size="lg"
            className="justify-self-center sm:size-48 sm:text-8xl"
          />
        )}
      </header>

      <div className="flex flex-wrap justify-end gap-2">
        <Link
          to={`/recipes/${recipe.id}/edit`}
          className="inline-flex min-h-10 items-center rounded-full border border-line-strong px-4 text-sm font-semibold hover:bg-surface-sunken"
        >
          Edit recipe
        </Link>
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="min-h-10 rounded-full px-4 text-sm font-semibold text-danger hover:bg-surface-sunken"
        >
          Delete
        </button>
      </div>

      {/* 6-column grid on phones: 3 facts on the first row, 2 wider ones on the second. */}
      <dl className="grid grid-cols-6 gap-px overflow-hidden rounded-2xl bg-line ring-1 ring-line sm:grid-cols-5">
        {facts.map((fact, index) => (
          <div
            key={fact.label}
            className={`bg-surface px-4 py-3 sm:col-span-1 ${index < 3 ? 'col-span-2' : 'col-span-3'}`}
          >
            <dt className="label-mono text-ink-subtle">{fact.label}</dt>
            <dd className="mt-1 font-mono text-lg font-semibold tabular-nums">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-10 md:grid-cols-[minmax(0,20rem)_1fr]">
        <IngredientChecklist key={recipe.id} ingredients={recipe.ingredients} />

        <section aria-labelledby="steps-heading" className="min-w-0">
          <h2 id="steps-heading" className="text-2xl">
            Steps
          </h2>
          <ol className="mt-4 space-y-5">
            {recipe.steps.map((step, index) => (
              <li key={index} className="grid grid-cols-[2.5rem_1fr] gap-3">
                <span aria-hidden className="font-display text-3xl leading-none text-tint tabular-nums">
                  {index + 1}
                </span>
                <p className="min-w-0 pt-1">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  )
}

function RecipeDetailSkeleton() {
  const bar = 'animate-pulse rounded bg-surface-sunken motion-reduce:animate-none'
  return (
    <div aria-busy="true" aria-label="Loading recipe" className="space-y-4">
      <div className={`h-56 w-full rounded-3xl ${bar}`} />
      <div className={`h-20 w-full ${bar}`} />
    </div>
  )
}
