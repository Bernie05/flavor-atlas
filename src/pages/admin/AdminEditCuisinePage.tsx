import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { ErrorState } from '@/components/feedback/ErrorState'
import { FormSkeleton } from '@/components/feedback/FormSkeleton'
import { CuisineForm } from '@/features/cuisines/components/CuisineForm'
import { cuisineQueries, useUpdateCuisine } from '@/features/cuisines/queries'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function AdminEditCuisinePage() {
  const { cuisineId = '' } = useParams()
  const navigate = useNavigate()
  const cuisines = useQuery(cuisineQueries.list())
  const updateCuisine = useUpdateCuisine(cuisineId)
  const cuisine = cuisines.data?.find((c) => c.id === cuisineId)

  if (cuisines.data && !cuisine) return (
      <NotFoundPage message="That cuisine isn't in the atlas." backTo="/admin/cuisines" backLabel="Back to cuisines" />
    )

  return (
    <div className="space-y-6">
      <title>{`Edit ${cuisine?.name ?? 'cuisine'} · Flavor Atlas admin`}</title>
      <header>
        <Link to="/admin/cuisines" className="label-mono inline-flex min-h-10 items-center text-accent-ink hover:underline">
          Cuisines
        </Link>
        <h1 className="mt-1 text-5xl">
          Edit <em>{cuisine?.name ?? 'cuisine'}</em>
        </h1>
      </header>

      {cuisines.isPending ? (
        <FormSkeleton />
      ) : cuisines.isError ? (
        <ErrorState error={cuisines.error} onRetry={() => void cuisines.refetch()} />
      ) : (
        cuisine && (
          <CuisineForm
            // A fresh form per cuisine, so its default values are this cuisine's.
            key={cuisine.id}
            cuisine={cuisine}
            cuisines={cuisines.data}
            isSubmitting={updateCuisine.isPending}
            submitError={updateCuisine.error}
            onSubmit={(input) =>
              updateCuisine.mutate(input, {
                onSuccess: (saved) => navigate('/admin/cuisines', { replace: true, state: { flash: `Saved ${saved.name}.` } }),
              })
            }
          />
        )
      )}
    </div>
  )
}
