import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router'
import { useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Field } from '@/components/ui/form'
import { describedBy, inputClass } from '@/components/ui/formStyles'
import { FoodEmoji } from '@/components/ui/FoodEmoji'
import { LocationPicker } from '@/features/atlas/components/LocationPicker'
import { countFieldErrors } from '@/features/recipes/form'
import { describeError } from '@/services/data'
import { countryName, MAP_COUNTRIES } from '../flags'
import { cuisinePaletteCss } from '../palette'
import { cuisineInputSchema, cuisineUpdateSchema, type Cuisine, type CuisineUpdate } from '../schema'
import { cuisineIdFor, cuisineTint, formatCoordinates, hueName } from '../utils'
import { CuisineFlag } from './CuisineFlag'

interface CuisineFormProps {
  cuisines: Cuisine[]
  /** The cuisine being edited; without one, the form adds a new cuisine. */
  cuisine?: Cuisine
  isSubmitting: boolean
  submitError: unknown
  /** A new cuisine always has a hue; an edited seed cuisine may keep its own colors (no hue). */
  onSubmit: (input: CuisineUpdate) => void
}

/** The id the preview's colors are published under. A real cuisine named just "X" would share its colors here, harmlessly. */
const PREVIEW_ID = 'x'

const COUNTRIES = MAP_COUNTRIES.map((code) => ({ code, name: countryName(code) })).toSorted((a, b) =>
  a.name.localeCompare(b.name),
)

/**
 * Add or edit a cuisine: name, country, capital (click the map or type the
 * coordinates) and a color. The pin, flag and palette all come from these,
 * so nothing else has to change for the cuisine to appear on the atlas.
 * Editing keeps the id: it's the page address and names the CSS colors.
 */
export function CuisineForm({ cuisines, cuisine, isSubmitting, submitError, onSubmit }: CuisineFormProps) {
  const editing = cuisine !== undefined
  const chooseColorRef = useRef<HTMLButtonElement>(null)
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    setFocus,
    formState: { errors },
  } = useForm({
    // Adding validates the stricter create rules; both produce a CuisineUpdate-shaped value.
    resolver: zodResolver((editing ? cuisineUpdateSchema : cuisineInputSchema) as typeof cuisineUpdateSchema),
    defaultValues: cuisine
      ? { ...cuisine, countryCode: cuisine.countryCode as CuisineUpdate['countryCode'] }
      : { name: '', emoji: '', description: '', origin: '', hue: 200 },
    mode: 'onTouched',
  })
  const [name, countryCode, origin, emoji, hue, latitude, longitude] = useWatch({
    control,
    name: ['name', 'countryCode', 'origin', 'emoji', 'hue', 'latitude', 'longitude'],
  })

  const id = cuisine?.id ?? cuisineIdFor(name ?? '')
  // Another cuisine with this name (or, when adding, this page address). Editing never clashes with itself.
  const others = cuisines.filter((other) => other.id !== cuisine?.id)
  const typedName = (name ?? '').trim().toLowerCase()
  const taken = others.find((other) => (!editing && other.id === id) || (typedName !== '' && other.name.toLowerCase() === typedName))
  const hasHue = typeof hue === 'number' && Number.isFinite(hue)
  // The preview shows the hue being picked, or a seed cuisine's own colors.
  const previewId = hasHue || !cuisine ? PREVIEW_ID : cuisine.id
  const place = Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude: latitude!, longitude: longitude! } : undefined
  const numberField = { valueAsNumber: true } as const
  const errorCount = countFieldErrors(errors)

  return (
    <form
      noValidate
      onSubmit={handleSubmit((input) => {
        // The list already says the name is taken: say it as a field error and stay, instead of a round trip to fail.
        if (taken) {
          setError('name', { message: `Already in the atlas as ${taken.name}. Pick another name.` })
          setFocus('name')
          return
        }
        onSubmit(input)
      })}
      style={cuisineTint(previewId)}
      className="space-y-10"
    >
      {/* The preview's palette, regenerated as the hue slider moves. */}
      {hasHue && <style>{cuisinePaletteCss([{ id: PREVIEW_ID, hue }])}</style>}

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-4 font-display text-4xl">The cuisine</legend>
        <Field
          label="Name"
          htmlFor="name"
          error={errors.name?.message ?? (taken ? `Already in the atlas as ${taken.name}. Pick another name.` : undefined)}
          hint={editing ? `Its page stays /cuisines/${id}` : id ? `Its page: /cuisines/${id}` : 'As a menu would say it: Vietnamese, Thai…'}
        >
          <input
            id="name"
            {...register('name')}
            {...describedBy('name', errors.name?.message ?? (taken ? 'taken' : undefined), true)}
            placeholder="Vietnamese"
            className={`${inputClass} font-display text-xl`}
          />
        </Field>
        <Field label="Country" htmlFor="countryCode" error={errors.countryCode?.message} hint="Its flag marks the cuisine.">
          <select id="countryCode" {...register('countryCode')} {...describedBy('countryCode', errors.countryCode?.message, true)} className={inputClass}>
            <option value="">Choose…</option>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Emoji" htmlFor="emoji" error={errors.emoji?.message} hint="Shown for recipes without a photo.">
          <input id="emoji" {...register('emoji')} {...describedBy('emoji', errors.emoji?.message, true)} placeholder="🍜" className={`${inputClass} text-2xl`} />
        </Field>
        <Field label="Description" htmlFor="description" error={errors.description?.message} className="sm:col-span-2">
          <textarea
            id="description"
            rows={2}
            {...register('description')}
            {...describedBy('description', errors.description?.message)}
            placeholder="Fresh herbs, fish sauce and long-simmered broths."
            className={inputClass}
          />
        </Field>
      </fieldset>

      <fieldset className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <legend className="mb-4 font-display text-4xl">On the map</legend>
        <div className="space-y-2">
          <LocationPicker
            cuisines={others}
            value={place}
            onPick={(picked) => {
              setValue('latitude', picked.latitude, { shouldValidate: true, shouldDirty: true })
              setValue('longitude', picked.longitude, { shouldValidate: true, shouldDirty: true })
            }}
          />
          <p className="text-sm text-ink-muted">Tap or click the map near the capital, then fine-tune the coordinates.</p>
        </div>
        <div className="grid content-start gap-4">
          <Field label="Capital or city" htmlFor="origin" error={errors.origin?.message} hint="The place the pin marks.">
            <input id="origin" {...register('origin')} {...describedBy('origin', errors.origin?.message, true)} placeholder="Hanoi" className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude" htmlFor="latitude" error={errors.latitude?.message} hint="North is positive.">
              <input
                id="latitude"
                type="number"
                step="0.01"
                inputMode="decimal"
                {...register('latitude', numberField)}
                {...describedBy('latitude', errors.latitude?.message, true)}
                placeholder="21.03"
                className={`${inputClass} font-mono tabular-nums`}
              />
            </Field>
            <Field label="Longitude" htmlFor="longitude" error={errors.longitude?.message} hint="East is positive.">
              <input
                id="longitude"
                type="number"
                step="0.01"
                inputMode="decimal"
                {...register('longitude', numberField)}
                {...describedBy('longitude', errors.longitude?.message, true)}
                placeholder="105.85"
                className={`${inputClass} font-mono tabular-nums`}
              />
            </Field>
          </div>
        </div>
      </fieldset>

      <fieldset className="grid items-start gap-5 sm:grid-cols-[1fr_auto]">
        <legend className="mb-4 font-display text-4xl">Its color</legend>
        {hasHue ? (
          <div className="space-y-2">
            <Field label="Hue" htmlFor="hue" error={errors.hue?.message} hint="Every hue is checked for readable text in light and dark mode.">
              <input
                id="hue"
                type="range"
                min={0}
                max={359}
                {...register('hue', numberField)}
                {...describedBy('hue', errors.hue?.message, true)}
                aria-valuetext={`${hueName(hue)}, ${hue}°`}
                className="h-10 w-full cursor-pointer accent-[var(--tint)]"
              />
            </Field>
            {cuisine && cuisine.hue === undefined && (
              <button
                type="button"
                onClick={() => {
                  setValue('hue', undefined, { shouldDirty: true })
                  // This button and the slider go away; focus moves to the one that replaces them.
                  requestAnimationFrame(() => chooseColorRef.current?.focus())
                }}
                className="min-h-10 rounded-full border border-line-strong px-4 text-sm font-semibold hover:bg-surface-sunken"
              >
                Keep its original colors
              </button>
            )}
          </div>
        ) : (
          // A seed cuisine with hand-tuned colors: they stay unless a new hue is chosen.
          <div className="space-y-2">
            <p className="text-sm font-semibold">Original colors</p>
            <p className="text-sm text-ink-muted">This cuisine keeps the colors it was designed with.</p>
            <button
              ref={chooseColorRef}
              type="button"
              onClick={() => {
                setValue('hue', 200, { shouldDirty: true })
                requestAnimationFrame(() => setFocus('hue'))
              }}
              className="min-h-10 rounded-full border border-line-strong px-4 text-sm font-semibold hover:bg-surface-sunken"
            >
              Choose a new color
            </button>
          </div>
        )}
        {/* How the cuisine will look: its header colors, flag and pin. */}
        <div aria-hidden className="atlas-dots flex items-center gap-4 rounded-3xl bg-tint-soft p-5 sm:min-w-72">
          <FoodEmoji emoji={emoji || '🍽️'} size="md" />
          <div className="min-w-0 space-y-1">
            <p className="font-display text-2xl break-words text-tint-ink sm:text-3xl">
              <em>{name || 'New cuisine'}</em>
            </p>
            <p className="label-mono flex items-center gap-2 text-tint-ink tabular-nums">
              {countryCode && <CuisineFlag countryCode={countryCode} size="sm" />}
              {[origin, place && formatCoordinates(place)].filter(Boolean).join(' · ') || 'Capital · coordinates'}
            </p>
          </div>
          <svg viewBox="0 0 24 24" className="ml-auto size-8 shrink-0 max-sm:hidden">
            <circle cx={12} cy={12} r={8} fill="var(--tint-soft)" stroke="var(--tint)" strokeWidth={1.5} />
            <circle cx={12} cy={12} r={3.5} fill="var(--tint)" />
          </svg>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-6">
        <p role="alert" className="w-full text-sm text-danger empty:hidden">
          {submitError != null
            ? describeError(submitError)
            : errorCount > 0
              ? `Fix ${errorCount} ${errorCount === 1 ? 'field' : 'fields'} to save.`
              : ''}
        </p>
        <Link to="/admin/cuisines" className="inline-flex min-h-10 items-center rounded-full px-4 font-semibold text-ink-muted hover:bg-surface-sunken">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-10 rounded-full bg-ink px-5 font-semibold text-canvas hover:bg-accent disabled:opacity-60"
        >
          {isSubmitting ? (editing ? 'Saving…' : 'Adding…') : editing ? 'Save changes' : 'Add cuisine'}
        </button>
      </div>
    </form>
  )
}
