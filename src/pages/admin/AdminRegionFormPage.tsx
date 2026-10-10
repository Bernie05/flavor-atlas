import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ErrorState } from '@/components/feedback/ErrorState'
import { FormSkeleton } from '@/components/feedback/FormSkeleton'
import { Field } from '@/components/ui/form'
import { describedBy, inputClass } from '@/components/ui/formStyles'
import { LocationPicker } from '@/features/atlas/components/LocationPicker'
import { cuisineQueries } from '@/features/cuisines/queries'
import type { Cuisine } from '@/features/cuisines/schema'
import { cuisineTint } from '@/features/cuisines/utils'
import { regionQueries, useCreateRegion, useUpdateRegion } from '@/features/dishes/queries'
import { regionInputSchema, type Region, type RegionInput } from '@/features/dishes/schema'
import { countFieldErrors } from '@/features/recipes/form'
import { describeError } from '@/services/data'
import { NotFoundPage } from '@/pages/NotFoundPage'

/** Add a regional kitchen (/admin/regions/new?cuisine=…) or edit one (/admin/regions/:regionId/edit). */
export function AdminRegionFormPage() {
  const { regionId } = useParams()
  const [searchParams] = useSearchParams()
  const cuisines = useQuery(cuisineQueries.list())
  const regions = useQuery(regionQueries.list())
  const region = regions.data?.find((r) => r.id === regionId)

  if (regionId && regions.data && !region) {
    return <NotFoundPage message="That regional kitchen isn't in the atlas." backTo="/admin/dishes" backLabel="Back to dishes & regions" />
  }
  const editing = Boolean(regionId)

  return (
    <div className="space-y-6">
      <title>{`${editing ? `Edit ${region?.name ?? 'region'}` : 'New region'} · Flavor Atlas admin`}</title>
      <header>
        <Link to="/admin/dishes" className="label-mono inline-flex min-h-10 items-center text-accent-ink hover:underline">
          Dishes & regions
        </Link>
        <h1 className="mt-1 text-5xl">
          {editing ? 'Edit' : 'New'} <em>{editing ? (region?.name ?? 'region') : 'regional kitchen'}</em>
        </h1>
      </header>
      {cuisines.isPending || regions.isPending ? (
        <FormSkeleton />
      ) : cuisines.isError || regions.isError ? (
        <ErrorState
          error={cuisines.error ?? regions.error}
          onRetry={() => {
            void cuisines.refetch()
            void regions.refetch()
          }}
        />
      ) : (
        <RegionForm key={region?.id ?? 'new'} region={region} cuisines={cuisines.data} defaultCuisine={searchParams.get('cuisine') ?? ''} />
      )}
    </div>
  )
}

function RegionForm({ region, cuisines, defaultCuisine }: { region?: Region; cuisines: Cuisine[]; defaultCuisine: string }) {
  const navigate = useNavigate()
  const create = useCreateRegion()
  const update = useUpdateRegion(region?.id ?? '')
  const save = region ? update : create
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegionInput>({
    resolver: zodResolver(regionInputSchema),
    defaultValues: region ?? { cuisineId: defaultCuisine, name: '' },
    mode: 'onTouched',
  })
  const [cuisineId, latitude, longitude] = useWatch({ control, name: ['cuisineId', 'latitude', 'longitude'] })
  const place = Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : undefined
  const errorCount = countFieldErrors(errors)
  const numberField = { valueAsNumber: true } as const
  const cuisineName = cuisines.find((c) => c.id === cuisineId)?.name

  const onSubmit = ({ cuisineId: _cuisine, ...rest }: RegionInput) => {
    if (save.isPending) return
    const done = (saved: Region) => navigate('/admin/dishes', { replace: true, state: { flash: `Saved ${saved.name}.` } })
    if (region) update.mutate(rest, { onSuccess: done })
    else create.mutate({ cuisineId: _cuisine, ...rest }, { onSuccess: done })
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} style={cuisineTint(cuisineId)} className="space-y-6">
      <div className="grid max-w-xl gap-5">
        {region ? (
          <p className="text-sm text-ink-muted">
            Cuisine: <span className="font-semibold text-ink">{cuisineName}</span>. Its recipes are versions of that cuisine's dishes, so it stays.
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
        <Field label="Name" htmlFor="name" error={errors.name?.message} hint="The town or province, e.g. Batangas.">
          <input id="name" {...register('name')} {...describedBy('name', errors.name?.message, true)} className={`${inputClass} font-display text-xl`} />
        </Field>
      </div>
      <fieldset className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <legend className="mb-4 font-display text-4xl">On the map</legend>
        <div className="space-y-2">
          <LocationPicker
            cuisines={cuisines}
            value={place}
            onPick={(picked) => {
              setValue('latitude', picked.latitude, { shouldValidate: true, shouldDirty: true })
              setValue('longitude', picked.longitude, { shouldValidate: true, shouldDirty: true })
            }}
          />
          <p className="text-sm text-ink-muted">Tap or click the map at the place, then fine-tune the coordinates.</p>
        </div>
        <div className="grid content-start grid-cols-2 gap-3">
          <Field label="Latitude" htmlFor="latitude" error={errors.latitude?.message} hint="North is positive.">
            <input id="latitude" type="number" step="0.01" inputMode="decimal" {...register('latitude', numberField)} {...describedBy('latitude', errors.latitude?.message, true)} className={`${inputClass} font-mono tabular-nums`} />
          </Field>
          <Field label="Longitude" htmlFor="longitude" error={errors.longitude?.message} hint="East is positive.">
            <input id="longitude" type="number" step="0.01" inputMode="decimal" {...register('longitude', numberField)} {...describedBy('longitude', errors.longitude?.message, true)} className={`${inputClass} font-mono tabular-nums`} />
          </Field>
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-6">
        <p role="alert" className="w-full text-sm text-danger empty:hidden">
          {save.error ? describeError(save.error) : errorCount > 0 ? `Fix ${errorCount} ${errorCount === 1 ? 'field' : 'fields'} to save.` : ''}
        </p>
        <Link to="/admin/dishes" className="inline-flex min-h-10 items-center rounded-full px-4 font-semibold text-ink-muted hover:bg-surface-sunken">
          Cancel
        </Link>
        <button type="submit" aria-disabled={save.isPending} className="min-h-10 rounded-full bg-ink px-5 font-semibold text-canvas hover:bg-accent aria-disabled:opacity-60">
          {save.isPending ? 'Saving…' : region ? 'Save changes' : 'Add region'}
        </button>
      </div>
    </form>
  )
}
