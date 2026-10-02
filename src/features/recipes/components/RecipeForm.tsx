import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { Plate } from '@/components/ui/Plate'
import { Field, FieldMessage } from '@/components/ui/form'
import { describedBy, inputClass } from '@/components/ui/formStyles'
import type { Cuisine } from '@/features/cuisines/schema'
import { cuisineTint } from '@/features/cuisines/utils'
import { describeError } from '@/services/data'
import {
  emptyIngredient,
  emptyStep,
  countFieldErrors,
  fromFormValues,
  recipeFormSchema,
  type RecipeFormValues,
} from '../form'
import { DIFFICULTIES, type RecipeInput } from '../schema'
import { DIFFICULTY_LABELS } from '../utils'

interface RecipeFormProps {
  defaultValues: RecipeFormValues
  cuisines: Cuisine[]
  submitLabel: string
  pendingLabel: string
  isSubmitting: boolean
  submitError: unknown
  cancelTo: string
  onSubmit: (input: RecipeInput) => void
}

const smallButton =
  'min-h-10 min-w-10 rounded-full px-3 text-sm font-semibold text-ink-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent'

/**
 * Create and edit share this form. It knows nothing about the API: it
 * validates with Zod, converts to RecipeInput, and hands it to onSubmit.
 * The page decides whether that means create or update.
 */
export function RecipeForm({
  defaultValues,
  cuisines,
  submitLabel,
  pendingLabel,
  isSubmitting,
  submitError,
  cancelTo,
  onSubmit,
}: RecipeFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues,
    // Validate a field once the user leaves it, then live while they fix it.
    mode: 'onTouched',
  })

  const ingredients = useFieldArray({ control, name: 'ingredients' })
  const steps = useFieldArray({ control, name: 'steps' })

  // Live preview: the plate and colors follow the chosen cuisine and emoji.
  const [cuisineId, emoji] = useWatch({ control, name: ['cuisineId', 'emoji'] })
  const cuisine = cuisines.find((c) => c.id === cuisineId)

  const numberField = { valueAsNumber: true } as const
  const errorCount = countFieldErrors(errors)

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(fromFormValues(values)))}
      style={cuisineTint(cuisineId)}
      className="space-y-10"
    >
      {/* Basics, with a live plate preview */}
      <fieldset className="atlas-dots grid gap-5 rounded-3xl p-5 sm:grid-cols-[1fr_auto] sm:p-8">
        <legend className="sr-only">Basics</legend>
        <div className="grid min-w-0 gap-4">
          <Field label="Recipe name" htmlFor="title" error={errors.title?.message}>
            <input
              id="title"
              {...register('title')}
              {...describedBy('title', errors.title?.message)}
              placeholder="Chicken Adobo"
              className={`${inputClass} border-tint font-display text-xl`}
            />
          </Field>
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <Field label="Cuisine" htmlFor="cuisineId" error={errors.cuisineId?.message}>
              <select
                id="cuisineId"
                {...register('cuisineId')}
                {...describedBy('cuisineId', errors.cuisineId?.message)}
                className={`${inputClass} border-tint`}
              >
                <option value="">Choose…</option>
                {cuisines.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Dish emoji" htmlFor="emoji" error={errors.emoji?.message}>
              <input
                id="emoji"
                {...register('emoji')}
                {...describedBy('emoji', errors.emoji?.message)}
                placeholder={cuisine?.emoji ?? '🍽️'}
                className={`${inputClass} border-tint text-center text-xl`}
              />
            </Field>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-2">
          <Plate emoji={emoji || cuisine?.emoji || '🍽️'} size="lg" />
          <p className="label-mono text-tint-ink">{cuisine ? cuisine.name : 'Preview'}</p>
        </div>
      </fieldset>

      {/* Details */}
      <fieldset className="grid gap-4">
        <legend className="mb-3 font-display text-2xl">Details</legend>
        <Field
          label="Description"
          htmlFor="description"
          error={errors.description?.message}
          hint="One or two sentences: what it tastes like and when you'd make it."
        >
          <textarea
            id="description"
            rows={3}
            {...register('description')}
            {...describedBy('description', errors.description?.message, true)}
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Prep (min)" htmlFor="prepMinutes" error={errors.prepMinutes?.message}>
            <input
              id="prepMinutes"
              type="number"
              inputMode="numeric"
              min={0}
              {...register('prepMinutes', numberField)}
              {...describedBy('prepMinutes', errors.prepMinutes?.message)}
              className={`${inputClass} font-mono tabular-nums`}
            />
          </Field>
          <Field label="Cook (min)" htmlFor="cookMinutes" error={errors.cookMinutes?.message}>
            <input
              id="cookMinutes"
              type="number"
              inputMode="numeric"
              min={0}
              {...register('cookMinutes', numberField)}
              {...describedBy('cookMinutes', errors.cookMinutes?.message)}
              className={`${inputClass} font-mono tabular-nums`}
            />
          </Field>
          <Field label="Serves" htmlFor="servings" error={errors.servings?.message}>
            <input
              id="servings"
              type="number"
              inputMode="numeric"
              min={1}
              {...register('servings', numberField)}
              {...describedBy('servings', errors.servings?.message)}
              className={`${inputClass} font-mono tabular-nums`}
            />
          </Field>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold">Difficulty</legend>
          <div className="mt-1.5 flex gap-2">
            {DIFFICULTIES.map((level) => (
              <label key={level} className="flex-1">
                <input type="radio" value={level} {...register('difficulty')} className="peer sr-only" />
                <span className="flex min-h-10 cursor-pointer items-center justify-center rounded-full border border-line-strong px-3 text-sm font-semibold text-ink-muted peer-checked:border-tint peer-checked:bg-tint-soft peer-checked:text-tint-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
                  {DIFFICULTY_LABELS[level]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field
          label="Photo link (optional)"
          htmlFor="imageUrl"
          error={errors.imageUrl?.message}
          hint="Leave empty to show the dish on a plate."
        >
          <input
            id="imageUrl"
            type="url"
            inputMode="url"
            {...register('imageUrl')}
            {...describedBy('imageUrl', errors.imageUrl?.message, true)}
            placeholder="https://"
            className={inputClass}
          />
        </Field>
      </fieldset>

      {/* Ingredients */}
      <fieldset>
        <legend className="font-display text-2xl">Ingredients</legend>
        <p className="mt-1 text-sm text-ink-subtle">Quantity and unit are optional, as in "2 eggs" or "salt".</p>
        <ul className="mt-4 space-y-3 sm:space-y-2">
          {ingredients.fields.map((field, index) => {
            const error = errors.ingredients?.[index]
            const number = index + 1
            const messageId = `ingredient-${index}-message`
            return (
              <li
                key={field.id}
                className="grid grid-cols-[5rem_1fr_auto] gap-2 border-b border-line pb-3 sm:border-0 sm:pb-0 [grid-template-areas:'name_name_remove'_'qty_unit_unit'] sm:grid-cols-[5rem_7rem_1fr_auto] sm:[grid-template-areas:'qty_unit_name_remove']"
              >
                <input
                  aria-label={`Ingredient ${number} name`}
                  {...register(`ingredients.${index}.name`)}
                  aria-invalid={error?.name ? true : undefined}
                  aria-describedby={error?.name ? messageId : undefined}
                  placeholder="garlic, crushed"
                  className={`${inputClass} [grid-area:name]`}
                />
                <input
                  aria-label={`Ingredient ${number} quantity`}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={0}
                  {...register(`ingredients.${index}.quantity`, {
                    // An empty box means "no quantity" (salt to taste), not zero.
                    setValueAs: (value: string) => (value === '' ? undefined : Number(value)),
                  })}
                  aria-invalid={error?.quantity ? true : undefined}
                  aria-describedby={error?.quantity ? messageId : undefined}
                  placeholder="Qty"
                  className={`${inputClass} font-mono tabular-nums [grid-area:qty]`}
                />
                <input
                  aria-label={`Ingredient ${number} unit`}
                  {...register(`ingredients.${index}.unit`)}
                  placeholder="cup, tbsp, g"
                  className={`${inputClass} [grid-area:unit]`}
                />
                <button
                  type="button"
                  onClick={() => ingredients.remove(index)}
                  disabled={ingredients.fields.length === 1}
                  aria-label={`Remove ingredient ${number}`}
                  className={`${smallButton} [grid-area:remove]`}
                >
                  Remove
                </button>
                {(error?.name || error?.quantity) && (
                  <p id={messageId} className="col-span-full text-sm text-danger">
                    {error.name?.message ?? error.quantity?.message}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
        <FieldMessage error={errors.ingredients?.root?.message ?? errors.ingredients?.message} />
        <button
          type="button"
          onClick={() => ingredients.append(emptyIngredient())}
          className="mt-3 min-h-10 rounded-full border border-dashed border-line-strong px-4 text-sm font-semibold text-accent hover:bg-accent-soft"
        >
          + Add ingredient
        </button>
      </fieldset>

      {/* Steps */}
      <fieldset>
        <legend className="font-display text-2xl">Steps</legend>
        <ol className="mt-4 space-y-3">
          {steps.fields.map((field, index) => {
            const error = errors.steps?.[index]?.text?.message
            const number = index + 1
            const messageId = `step-${index}-message`
            return (
              <li key={field.id} className="grid grid-cols-[2.5rem_1fr] gap-x-3 gap-y-1">
                <span aria-hidden className="pt-1 font-display text-3xl leading-none text-tint tabular-nums">
                  {number}
                </span>
                <textarea
                  aria-label={`Step ${number}`}
                  rows={2}
                  {...register(`steps.${index}.text`)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? messageId : undefined}
                  placeholder={index === 0 ? 'Combine the chicken, soy sauce and garlic…' : undefined}
                  className={inputClass}
                />
                <div className="col-start-2 flex flex-wrap items-center gap-1">
                  {error && (
                    <p id={messageId} className="mr-auto text-sm text-danger">
                      {error}
                    </p>
                  )}
                  <span className="ml-auto flex gap-1">
                    <button
                      type="button"
                      onClick={() => steps.move(index, index - 1)}
                      disabled={index === 0}
                      aria-label={`Move step ${number} up`}
                      className={smallButton}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => steps.move(index, index + 1)}
                      disabled={index === steps.fields.length - 1}
                      aria-label={`Move step ${number} down`}
                      className={smallButton}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => steps.remove(index)}
                      disabled={steps.fields.length === 1}
                      aria-label={`Remove step ${number}`}
                      className={smallButton}
                    >
                      Remove
                    </button>
                  </span>
                </div>
              </li>
            )
          })}
        </ol>
        <FieldMessage error={errors.steps?.root?.message ?? errors.steps?.message} />
        <button
          type="button"
          onClick={() => steps.append(emptyStep())}
          className="mt-3 min-h-10 rounded-full border border-dashed border-line-strong px-4 text-sm font-semibold text-accent hover:bg-accent-soft"
        >
          + Add step
        </button>
      </fieldset>

      {/* Actions */}
      <div className="sticky bottom-[env(safe-area-inset-bottom,0px)] -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-canvas/90 px-4 py-3 backdrop-blur-md">
        {/* The only live region: one announcement per failed save, not one per field. */}
        <p role="alert" className="w-full text-sm text-danger empty:hidden">
          {submitError != null
            ? describeError(submitError)
            : errorCount > 0
              ? `Fix ${errorCount} ${errorCount === 1 ? 'field' : 'fields'} to save.`
              : ''}
        </p>
        <Link to={cancelTo} className="inline-flex min-h-10 items-center rounded-full px-4 font-semibold text-ink-muted hover:bg-surface-sunken">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-10 rounded-full bg-ink px-5 font-semibold text-canvas hover:bg-accent disabled:opacity-60"
        >
          {isSubmitting ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  )
}
