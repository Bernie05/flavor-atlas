import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { Plate } from '@/components/ui/Plate'
import { Field, FieldMessage } from '@/components/ui/form'
import { describedBy, inputClass } from '@/components/ui/formStyles'
import { AiAssist } from '@/features/ai/components/AiAssist'
import { toAiDraft } from '@/features/ai/draft'
import type { Cuisine } from '@/features/cuisines/schema'
import type { Dish, Region } from '@/features/dishes/schema'
import { cuisineTint } from '@/features/cuisines/utils'
import { describeError } from '@/services/data'
import {
  emptyIngredient,
  emptyStep,
  countFieldErrors,
  fromFormValues,
  NEW_DISH,
  reuseExistingDish,
  type RecipeSubmission,
  recipeFormSchema,
  type RecipeFormValues,
} from '../form'
import { DIFFICULTIES } from '../schema'
import { DIFFICULTY_LABELS, formatQuantity } from '../utils'

interface RecipeFormProps {
  defaultValues: RecipeFormValues
  cuisines: Cuisine[]
  dishes: Dish[]
  regions: Region[]
  submitLabel: string
  pendingLabel: string
  isSubmitting: boolean
  submitError: unknown
  cancelTo: string
  /** Receives the recipe, plus a new dish name when the cook chose "New dish". */
  onSubmit: (submission: RecipeSubmission) => void
}

const smallButton =
  'min-h-10 min-w-10 rounded-full px-3 text-sm font-semibold text-ink-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent'

/**
 * Create and edit share this form. It knows nothing about the API: it
 * validates with Zod, converts to a RecipeSubmission, and hands it to onSubmit.
 * The page decides whether that means create or update.
 */
export function RecipeForm({
  defaultValues,
  cuisines,
  dishes,
  regions,
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
    getValues,
    setValue,
    setFocus,
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
  const dishId = useWatch({ control, name: 'dishId' })
  // Dishes and regions belong to a cuisine: only offer the chosen cuisine's.
  const cuisineDishes = dishes.filter((d) => d.cuisineId === cuisineId).toSorted((a, b) => a.name.localeCompare(b.name))
  const cuisineRegions = regions.filter((r) => r.cuisineId === cuisineId)

  const numberField = { valueAsNumber: true } as const
  // The AI reads the form at click time, so it sees what the cook just typed.
  const getDraft = () => toAiDraft(getValues(), { cuisines, dishes, regions })
  const errorCount = countFieldErrors(errors)

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(reuseExistingDish(fromFormValues(values), dishes)))}
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
                {...register('cuisineId', {
                  // A dish or region from the previous cuisine no longer fits.
                  onChange: () => {
                    setValue('dishId', '')
                    setValue('regionId', '')
                  },
                })}
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

      {/* Dish and version */}
      <fieldset aria-describedby="dish-version-help" className="grid gap-4">
        <legend className="mb-3 font-display text-2xl">Dish &amp; version</legend>
        <p id="dish-version-help" className="text-sm text-ink-subtle">
          Group this recipe with other versions of the same dish, like Adobong Dilaw under Adobo.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Dish"
            htmlFor="dishId"
            error={errors.dishId?.message}
            hint={cuisine ? undefined : 'Choose a cuisine first.'}
          >
            <select
              id="dishId"
              disabled={!cuisine}
              {...register('dishId', {
                // The new-dish field appears after this render; move focus to it once it exists.
                onChange: (event: { target: { value: string } }) => {
                  if (event.target.value === NEW_DISH) requestAnimationFrame(() => setFocus('newDishName'))
                },
              })}
              {...describedBy('dishId', errors.dishId?.message, !cuisine)}
              className={inputClass}
            >
              <option value="">Choose…</option>
              {cuisineDishes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
              <option value={NEW_DISH}>+ New dish…</option>
            </select>
          </Field>
          {dishId === NEW_DISH && (
            <Field label="New dish name" htmlFor="newDishName" error={errors.newDishName?.message}>
              <input
                id="newDishName"
                {...register('newDishName')}
                {...describedBy('newDishName', errors.newDishName?.message)}
                placeholder="Pancit"
                className={inputClass}
              />
            </Field>
          )}
          <Field label="Version (optional)" htmlFor="variant" error={errors.variant?.message} hint="e.g. “na Hipon” or “Batangas style”">
            <input
              id="variant"
              {...register('variant')}
              {...describedBy('variant', errors.variant?.message, true)}
              className={inputClass}
            />
          </Field>
          <Field label="Main ingredient (optional)" htmlFor="mainIngredient" error={errors.mainIngredient?.message}>
            <input
              id="mainIngredient"
              {...register('mainIngredient')}
              {...describedBy('mainIngredient', errors.mainIngredient?.message)}
              placeholder="pork, shrimp, tofu"
              className={inputClass}
            />
          </Field>
          <Field
            label="Region"
            htmlFor="regionId"
            error={errors.regionId?.message}
            hint={cuisine ? undefined : 'Choose a cuisine first.'}
          >
            <select
              id="regionId"
              disabled={!cuisine}
              {...register('regionId')}
              {...describedBy('regionId', errors.regionId?.message, !cuisine)}
              className={inputClass}
            >
              <option value="">Classic, cooked everywhere</option>
              {cuisineRegions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          label="What makes this version different (optional)"
          htmlFor="variantNote"
          error={errors.variantNote?.message}
          hint="One line, shown on the recipe and dish pages. e.g. “Fresh turmeric instead of soy sauce turns it golden.”"
        >
          <input
            id="variantNote"
            {...register('variantNote')}
            {...describedBy('variantNote', errors.variantNote?.message, true)}
            className={inputClass}
          />
        </Field>
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
        <AiAssist
          task="description"
          label="Write a description"
          getDraft={getDraft}
          renderSuggestion={({ description }) => <p>{description}</p>}
          onApply={({ description }) =>
            setValue('description', description, { shouldDirty: true, shouldValidate: true })
          }
        />
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
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Photo credit (optional)"
            htmlFor="imageCredit"
            error={errors.imageCredit?.message}
            hint="Free photos usually require it, e.g. “Photo: Jane Doe, CC BY 4.0”."
          >
            <input
              id="imageCredit"
              {...register('imageCredit')}
              {...describedBy('imageCredit', errors.imageCredit?.message, true)}
              className={inputClass}
            />
          </Field>
          <Field label="Photo source page (optional)" htmlFor="imageSourceUrl" error={errors.imageSourceUrl?.message}>
            <input
              id="imageSourceUrl"
              type="url"
              inputMode="url"
              {...register('imageSourceUrl')}
              {...describedBy('imageSourceUrl', errors.imageSourceUrl?.message)}
              placeholder="https://"
              className={inputClass}
            />
          </Field>
        </div>
      </fieldset>

      {/* Ingredients */}
      <fieldset>
        <legend className="font-display text-2xl">Ingredients</legend>
        <p className="mt-1 text-sm text-ink-subtle">Quantity and unit are optional, as in "2 eggs" or "salt".</p>
        <div className="mt-3">
          <AiAssist
            task="ingredients"
            label="Suggest ingredients"
            applyLabel="Replace ingredient list"
            getDraft={getDraft}
            renderSuggestion={({ ingredients: list }) => (
              <ul className="space-y-1">
                {list.map((ingredient, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="w-24 shrink-0 font-mono font-semibold tabular-nums">
                      {ingredient.quantity !== undefined && formatQuantity(ingredient.quantity)} {ingredient.unit}
                    </span>
                    <span className="min-w-0">{ingredient.name}</span>
                  </li>
                ))}
              </ul>
            )}
            onApply={({ ingredients: list }) => ingredients.replace(list)}
          />
        </div>
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
        <div className="mt-3">
          <AiAssist
            task="steps"
            label="Write or tidy up the steps"
            applyLabel="Replace steps"
            getDraft={getDraft}
            renderSuggestion={({ steps: list }) => (
              <ol className="list-decimal space-y-1 pl-5">
                {list.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            )}
            onApply={({ steps: list }) => steps.replace(list.map((text) => ({ text })))}
          />
        </div>
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
