import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router'
import { ErrorState } from '@/components/feedback/ErrorState'
import { FormSkeleton } from '@/components/feedback/FormSkeleton'
import { cuisineQueries } from '@/features/cuisines/queries'
import { toFormValues } from '@/features/recipes/form'
import { RecipeForm } from '@/features/recipes/components/RecipeForm'
import { useCreateRecipe } from '@/features/recipes/mutations'

export function NewRecipePage() {
  const navigate = useNavigate()
  const cuisines = useQuery(cuisineQueries.list())
  const createRecipe = useCreateRecipe()
  // /recipes/new?cuisine=korean pre-selects the cuisine you came from.
  const [searchParams] = useSearchParams()
  const cuisineId = searchParams.get('cuisine') ?? undefined

  return (
    <div className="space-y-6">
      <title>New recipe · Flavor Atlas</title>
      <header>
        <p className="label-mono text-accent-ink">Add to the atlas</p>
        <h1 className="mt-1 text-4xl">New recipe</h1>
      </header>

      {cuisines.isPending ? (
        <FormSkeleton />
      ) : cuisines.isError ? (
        <ErrorState error={cuisines.error} onRetry={() => cuisines.refetch()} />
      ) : (
        <RecipeForm
          defaultValues={toFormValues(undefined, { cuisineId })}
          cuisines={cuisines.data}
          submitLabel="Add recipe"
          pendingLabel="Adding…"
          isSubmitting={createRecipe.isPending}
          submitError={createRecipe.error}
          cancelTo={cuisineId ? `/cuisines/${cuisineId}` : '/'}
          onSubmit={(input) =>
            createRecipe.mutate(input, {
              onSuccess: (recipe) => navigate(`/recipes/${recipe.id}`, { replace: true }),
            })
          }
        />
      )}
    </div>
  )
}
