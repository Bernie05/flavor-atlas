import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ErrorState } from '@/components/feedback/ErrorState'
import { FormSkeleton } from '@/components/feedback/FormSkeleton'
import { Field } from '@/components/ui/form'
import { describedBy, inputClass } from '@/components/ui/formStyles'
import { cuisineQueries } from '@/features/cuisines/queries'
import { dishQueries, useCreateDish, useUpdateDish } from '@/features/dishes/queries'
import { dishInputSchema, type Dish, type DishInput } from '@/features/dishes/schema'
import { countFieldErrors } from '@/features/recipes/form'
import { describeError } from '@/services/data'
import { NotFoundPage } from '@/pages/NotFoundPage'

/** Add a dish (/admin/dishes/new?cuisine=…) or edit one (/admin/dishes/:dishId/edit). */
export function AdminDishFormPage() {
  const { dishId } = useParams()
  const [searchParams] = useSearchParams()
  const cuisines = useQuery(cuisineQueries.list())
  const dishes = useQuery(dishQueries.list())
  const dish = dishes.data?.find((d) => d.id === dishId)

  if (dishId && dishes.data && !dish) {
    return <NotFoundPage message="That dish isn't in the atlas." backTo="/admin/dishes" backLabel="Back to dishes" />
  }
  const editing = Boolean(dishId)

  return (
    <div className="space-y-6">
      <title>{`${editing ? `Edit ${dish?.name ?? 'dish'}` : 'New dish'} · Flavor Atlas admin`}</title>
      <header>
        <Link to="/admin/dishes" className="label-mono inline-flex min-h-10 items-center text-accent-ink hover:underline">
          Dishes & regions
        </Link>
        <h1 className="mt-1 text-5xl">
          {editing ? 'Edit' : 'New'} <em>{editing ? (dish?.name ?? 'dish') : 'dish'}</em>
        </h1>
      </header>
      {cuisines.isPending || dishes.isPending ? (
        <FormSkeleton />
      ) : cuisines.isError || dishes.isError ? (
        <ErrorState
          error={cuisines.error ?? dishes.error}
          onRetry={() => {
            void cuisines.refetch()
            void dishes.refetch()
          }}
        />
      ) : (
        <DishForm
          key={dish?.id ?? 'new'}
          dish={dish}
          cuisines={cuisines.data}
          defaultCuisine={searchParams.get('cuisine') ?? ''}
        />
      )}
    </div>
  )
}

function DishForm({ dish, cuisines, defaultCuisine }: { dish?: Dish; cuisines: { id: string; name: string }[]; defaultCuisine: string }) {
  const navigate = useNavigate()
  const create = useCreateDish()
  const update = useUpdateDish(dish?.id ?? '')
  const save = dish ? update : create
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DishInput>({
    resolver: zodResolver(dishInputSchema),
    defaultValues: dish ?? { cuisineId: defaultCuisine, name: '', description: '' },
    mode: 'onTouched',
  })
  const errorCount = countFieldErrors(errors)
  const cuisineName = cuisines.find((c) => c.id === (dish?.cuisineId ?? defaultCuisine))?.name

  const onSubmit = (input: DishInput) => {
    if (save.isPending) return
    const done = (saved: Dish) => navigate('/admin/dishes', { replace: true, state: { flash: `Saved ${saved.name}.` } })
    if (dish) update.mutate({ name: input.name, description: input.description }, { onSuccess: done })
    else create.mutate(input, { onSuccess: done })
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-5">
      {dish ? (
        // A dish's recipes share its cuisine, so it stays; moving recipes is how a dish changes cuisine.
        <p className="text-sm text-ink-muted">
          Cuisine: <span className="font-semibold text-ink">{cuisineName}</span>. To change it, move its recipes to a dish of another cuisine.
        </p>
      ) : (
        <Field label="Cuisine" htmlFor="cuisineId" error={errors.cuisineId?.message}>
          <select id="cuisineId" {...register('cuisineId')} {...describedBy('cuisineId', errors.cuisineId?.message)} className={inputClass}>
            <option value="">Choose…</option>
            {cuisines.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Name" htmlFor="name" error={errors.name?.message} hint="The dish all its versions share, e.g. Adobo.">
        <input id="name" maxLength={60} {...register('name')} {...describedBy('name', errors.name?.message, true)} className={`${inputClass} font-display text-xl`} />
      </Field>
      <Field label="Description (optional)" htmlFor="description" error={errors.description?.message}>
        <textarea id="description" rows={3} {...register('description')} {...describedBy('description', errors.description?.message)} className={inputClass} />
      </Field>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-6">
        <p role="alert" className="w-full text-sm text-danger empty:hidden">
          {save.error ? describeError(save.error) : errorCount > 0 ? `Fix ${errorCount} ${errorCount === 1 ? 'field' : 'fields'} to save.` : ''}
        </p>
        <Link to="/admin/dishes" className="inline-flex min-h-10 items-center rounded-full px-4 font-semibold text-ink-muted hover:bg-surface-sunken">
          Cancel
        </Link>
        <button
          type="submit"
          aria-disabled={save.isPending}
          className="min-h-10 rounded-full bg-ink px-5 font-semibold text-canvas hover:bg-accent aria-disabled:opacity-60"
        >
          {save.isPending ? 'Saving…' : dish ? 'Save changes' : 'Add dish'}
        </button>
      </div>
    </form>
  )
}
