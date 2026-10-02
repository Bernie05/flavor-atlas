import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ErrorState } from '@/components/feedback/ErrorState'
import { FormSkeleton } from '@/components/feedback/FormSkeleton'
import { cuisineQueries } from '@/features/cuisines/queries'
import { dishQueries, regionQueries } from '@/features/dishes/queries'
import { toFormValues } from '@/features/recipes/form'
import { RecipeForm } from '@/features/recipes/components/RecipeForm'
import { useCreateRecipe, useSubmitRecipe } from '@/features/recipes/mutations'

export function AdminNewRecipePage() {
  const navigate = useNavigate()
  const cuisines = useQuery(cuisineQueries.list())
  const createRecipe = useCreateRecipe()
  const dishes = useQuery(dishQueries.list())
  const regions = useQuery(regionQueries.list())
  const save = useSubmitRecipe(createRecipe)
  // /recipes/new?cuisine=korean pre-selects the cuisine you came from.
  const [searchParams] = useSearchParams()
  const cuisineId = searchParams.get('cuisine') ?? undefined
  // /admin/recipes/new?dish=adobo starts a new version of that dish.
  const dishId = searchParams.get('dish') ?? undefined
  const dish = dishes.data?.find((d) => d.id === dishId)

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

      {cuisines.isPending || dishes.isPending || regions.isPending ? (
        <FormSkeleton />
      ) : cuisines.isError || dishes.isError || regions.isError ? (
        <ErrorState
          error={cuisines.error ?? dishes.error ?? regions.error}
          onRetry={() => {
            void cuisines.refetch()
            void dishes.refetch()
            void regions.refetch()
          }}
        />
      ) : (
        <RecipeForm
          defaultValues={toFormValues(undefined, dish ? { cuisineId: dish.cuisineId, dishId: dish.id } : { cuisineId })}
          cuisines={cuisines.data}
          dishes={dishes.data}
          regions={regions.data}
          submitLabel="Add recipe"
          pendingLabel="Adding…"
          isSubmitting={save.isPending}
          submitError={save.error}
          cancelTo="/admin/recipes"
          onSubmit={(submission) =>
            save.submit(submission, (recipe) =>
              navigate('/admin/recipes', { replace: true, state: { flash: `Added “${recipe.title}”.` } }),
            )
          }
        />
      )}
    </div>
  )
}
