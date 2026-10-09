import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { ErrorState } from '@/components/feedback/ErrorState'
import { FormSkeleton } from '@/components/feedback/FormSkeleton'
import { CuisineForm } from '@/features/cuisines/components/CuisineForm'
import { cuisineQueries, useCreateCuisine } from '@/features/cuisines/queries'
import { cuisineInputSchema } from '@/features/cuisines/schema'

export function AdminNewCuisinePage() {
  const navigate = useNavigate()
  const cuisines = useQuery(cuisineQueries.list())
  const createCuisine = useCreateCuisine()

  return (
    <div className="space-y-6">
      <title>New cuisine · Flavor Atlas admin</title>
      <header>
        <Link to="/admin/cuisines" className="label-mono inline-flex min-h-10 items-center text-accent-ink hover:underline">
          Cuisines
        </Link>
        <h1 className="mt-1 text-5xl">
          New <em>cuisine</em>
        </h1>
      </header>

      {cuisines.isPending ? (
        <FormSkeleton />
      ) : cuisines.isError ? (
        <ErrorState error={cuisines.error} onRetry={() => void cuisines.refetch()} />
      ) : (
        <CuisineForm
          cuisines={cuisines.data}
          isSubmitting={createCuisine.isPending}
          submitError={createCuisine.error}
          onSubmit={(input) =>
            // The form ran the create rules already; parsing again gives TypeScript the stricter shape (a hue is required).
            createCuisine.mutate(cuisineInputSchema.parse(input), {
              onSuccess: (cuisine) =>
                navigate('/admin/cuisines', {
                  replace: true,
                  state: { flash: `Added ${cuisine.name}. It's on the map; add its first recipe next.` },
                }),
            })
          }
        />
      )}
    </div>
  )
}
