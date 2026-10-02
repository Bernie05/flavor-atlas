import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { inputClass } from '@/components/ui/formStyles'
import { describeError } from '@/services/data'
import { useAddRating } from '../mutations'
import { ratingFormSchema, type RatingFormValues } from '../schema'
import { StarInput } from './StarInput'

const EMPTY: Partial<RatingFormValues> = { score: undefined, comment: '' }

export function RatingForm({ recipeId }: { recipeId: string }) {
  const addRating = useAddRating(recipeId)
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

  const onSubmit = (values: RatingFormValues) => {
    setThanked(false)
    addRating.mutate(
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
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-line">
      <StarInput control={control} />

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
          disabled={addRating.isPending}
          className="min-h-10 rounded-full bg-ink px-5 font-semibold text-canvas hover:bg-accent disabled:opacity-60"
        >
          {addRating.isPending ? 'Posting…' : 'Post rating'}
        </button>
        {/* One live region for the outcome of posting. */}
        <p role="status" className="text-sm empty:hidden">
          {addRating.isError ? (
            <span className="text-danger">{describeError(addRating.error)}</span>
          ) : thanked ? (
            <span className="text-accent-ink">Thanks! Your rating was added.</span>
          ) : null}
        </p>
      </div>
    </form>
  )
}
