import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ErrorState } from '@/components/feedback/ErrorState'
import { FormSkeleton } from '@/components/feedback/FormSkeleton'
import { cuisineQueries } from '@/features/cuisines/queries'
import { toFormValues } from '@/features/recipes/form'
import { RecipeForm } from '@/features/recipes/components/RecipeForm'
import { useCreateRecipe } from '@/features/recipes/mutations'

export function AdminNewRecipePage() {
  const navigate = useNavigate()
  const cuisines = useQuery(cuisineQueries.list())
  const createRecipe = useCreateRecipe()
  // /recipes/new?cuisine=korean pre-selects the cuisine you came from.
  const [searchParams] = useSearchParams()
  const cuisineId = searchParams.get('cuisine') ?? undefined

  return (
    <div className="space-y-6">
      <title>New recipe · Flavor Atlas admin</title>
      <header>
        <Link to="/admin/recipes" className="label-mono inline-block py-1 text-accent-ink hover:underline">
          Recipes
        </Link>
        <h1 className="mt-1 text-5xl">
          New <em>recipe</em>
        </h1>
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
          cancelTo="/admin/recipes"
          onSubmit={(input) =>
            createRecipe.mutate(input, {
              onSuccess: (recipe) =>
                navigate('/admin/recipes', { replace: true, state: { flash: `Added “${recipe.title}”.` } }),
            })
          }
        />
      )}
    </div>
  )
}
