import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type BaseSyntheticEvent } from 'react'
import { useForm } from 'react-hook-form'
import { inputClass } from '@/components/ui/formStyles'
import { describeError } from '@/services/data'
import { useAddRating, useSubmitReview } from '../mutations'
import { ratingFormSchema, type RatingFormValues } from '../schema'
import { StarInput } from './StarInput'

const EMPTY: Partial<RatingFormValues> = { score: undefined, comment: '' }

interface RatingFormProps {
  recipeId: string
  /**
   * A visitor's review on the public page: it goes to the admin's queue
   * instead of straight onto the recipe. Without it, the admin adds a rating.
   */
  moderated?: boolean
}

export function RatingForm({ recipeId, moderated = false }: RatingFormProps) {
  const addRating = useAddRating(recipeId)
  const submitReview = useSubmitReview()
  const save = moderated ? submitReview : addRating
  const [thanked, setThanked] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RatingFormValues>({
    resolver: zodResolver(ratingFormSchema),
    defaultValues: EMPTY,
  })

  const onSubmit = (values: RatingFormValues, event?: BaseSyntheticEvent) => {
    setThanked(false)
    // The honeypot: a field people never see (hidden from screen readers too). Bots fill every field.
    const form = event?.target instanceof HTMLFormElement ? event.target : null
    if (moderated && form && new FormData(form).get('website')) {
      // Looks like a bot: thank it like anyone else, send nothing.
      reset(EMPTY)
      setThanked(true)
      return
    }
    save.mutate(
      { ...values, recipeId },
      {
        onSuccess: () => {
          reset(EMPTY)
          setThanked(true)
        },
      },
    )
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="relative space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-line">
      <StarInput control={control} />

      {moderated && (
        // The honeypot: off screen, out of the tab order and hidden from assistive tech.
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="rating-website">Leave this empty</label>
          <input id="rating-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rating-comment" className="text-sm font-semibold">
          Review <span className="font-normal text-ink-subtle">(optional)</span>
        </label>
        <textarea
          id="rating-comment"
          rows={3}
          {...register('comment')}
          aria-invalid={errors.comment ? true : undefined}
          aria-describedby={errors.comment ? 'rating-comment-message' : undefined}
          placeholder="What worked, what you'd change, who loved it…"
          className={inputClass}
        />
        {errors.comment && (
          <p id="rating-comment-message" className="text-sm text-danger">
            {errors.comment.message}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={save.isPending}
          className="min-h-10 rounded-full bg-ink px-5 font-semibold text-canvas hover:bg-accent disabled:opacity-60"
        >
          {save.isPending ? (moderated ? 'Sending…' : 'Posting…') : moderated ? 'Send review' : 'Post rating'}
        </button>
        {/* One live region for the outcome of posting. */}
        <p role="status" className="text-sm empty:hidden">
          {save.isError ? (
            <span className="text-danger">{describeError(save.error)}</span>
          ) : thanked ? (
            <span className="text-accent-ink">
              {moderated ? 'Thanks! Your review will appear once it’s approved.' : 'Thanks! Your rating was added.'}
            </span>
          ) : null}
        </p>
      </div>
    </form>
  )
}
