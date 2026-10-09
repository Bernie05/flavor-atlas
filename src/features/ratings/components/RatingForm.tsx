import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState, type BaseSyntheticEvent } from 'react'
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
    setFocus,
    formState: { errors },
  } = useForm<RatingFormValues>({
    resolver: zodResolver(ratingFormSchema),
    defaultValues: EMPTY,
  })

  // Opened from "Write a review": the form replaced that button, so focus starts on the stars.
  useEffect(() => {
    if (moderated) setFocus('score')
  }, [moderated, setFocus])

  const onSubmit = (values: RatingFormValues, event?: BaseSyntheticEvent) => {
    // aria-disabled, not disabled: a disabled button drops keyboard focus to the page.
    if (save.isPending) return
    setThanked(false)
    // The honeypot: a field people never see (hidden from screen readers too). Bots fill every field.
    const form = event?.target instanceof HTMLFormElement ? event.target : null
    if (moderated && form && new FormData(form).get('hp_field')) {
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
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      aria-describedby={moderated ? 'review-moderation-note' : undefined} className="relative space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-line">
      {moderated && (
        <p id="review-moderation-note" className="text-sm text-ink-muted">
          Reviews are read before they appear, usually within a day.
        </p>
      )}
      <StarInput control={control} />

      {moderated && (
        // The honeypot: off screen, out of the tab order and hidden from assistive tech.
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="rating-hp">Leave this empty</label>
          {/* A name autofill doesn't recognize, so a real person's browser never fills it. */}
          <input id="rating-hp" name="hp_field" type="text" tabIndex={-1} autoComplete="off" />
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
          aria-disabled={save.isPending}
          className="min-h-10 rounded-full bg-ink px-5 font-semibold text-canvas hover:bg-accent aria-disabled:opacity-60"
        >
          {save.isPending ? (moderated ? 'Sending…' : 'Posting…') : moderated ? 'Send review' : 'Post rating'}
        </button>
        {/* One live region for the outcome of posting. */}
        <p role="status" className="min-h-5 text-sm">
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
