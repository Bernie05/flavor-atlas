import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { ErrorState } from '@/components/feedback/ErrorState'
import { FormSkeleton } from '@/components/feedback/FormSkeleton'
import { cuisineQueries } from '@/features/cuisines/queries'
import { toFormValues } from '@/features/recipes/form'
import { RecipeForm } from '@/features/recipes/components/RecipeForm'
import { useUpdateRecipe } from '@/features/recipes/mutations'
import { recipeQueries } from '@/features/recipes/queries'
import { NotFoundError } from '@/services/data'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function AdminEditRecipePage() {
  const { recipeId = '' } = useParams()
  const navigate = useNavigate()
  const recipe = useQuery(recipeQueries.detail(recipeId))
  const cuisines = useQuery(cuisineQueries.list())
  const updateRecipe = useUpdateRecipe(recipeId)

  if (recipe.error instanceof NotFoundError) {
    return <NotFoundPage message="This recipe may have been deleted." />
  }


  return (
    <div className="space-y-6">
      <title>{`Edit ${recipe.data?.title ?? 'recipe'} · Flavor Atlas admin`}</title>
      <header>
        <Link to="/admin/recipes" className="label-mono inline-block py-1 text-accent-ink hover:underline">
          Recipes
        </Link>
        <h1 className="mt-1 text-5xl">
          Edit <em>{recipe.data?.title ?? 'recipe'}</em>
        </h1>
      </header>

      {recipe.isPending || cuisines.isPending ? (
        <FormSkeleton />
      ) : recipe.isError || cuisines.isError ? (
        <ErrorState
          error={recipe.error ?? cuisines.error}
          onRetry={() => {
            void recipe.refetch()
            void cuisines.refetch()
          }}
        />
      ) : (
        <RecipeForm
          // Start fresh if you navigate from one recipe's edit page to another's.
          key={recipe.data.id}
          defaultValues={toFormValues(recipe.data)}
          cuisines={cuisines.data}
          submitLabel="Save changes"
          pendingLabel="Saving…"
          isSubmitting={updateRecipe.isPending}
          submitError={updateRecipe.error}
          cancelTo="/admin/recipes"
          onSubmit={(input) =>
            updateRecipe.mutate(input, {
              onSuccess: (saved) =>
                navigate('/admin/recipes', { replace: true, state: { flash: `Saved “${saved.title}”.` } }),
            })
          }
        />
      )}
    </div>
  )
}
