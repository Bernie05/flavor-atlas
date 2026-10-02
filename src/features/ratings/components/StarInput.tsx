import { useState } from 'react'
import { useController, type Control } from 'react-hook-form'
import type { RatingFormValues } from '../schema'
import { SCORE_LABELS } from '../utils'

const SCORES = [1, 2, 3, 4, 5] as const

/**
 * Five radio buttons drawn as stars. Native radios give keyboard support
 * (arrow keys) and screen reader semantics for free; we only restyle them.
 *
 * It's a controlled input through useController: register() would hand the
 * form the radio's string value ("5"), because React Hook Form doesn't apply
 * setValueAs/valueAsNumber to radios. Here we report the number ourselves.
 */
export function StarInput({ control }: { control: Control<RatingFormValues> }) {
  const {
    field,
    fieldState: { error },
  } = useController({ name: 'score', control })
  // Hovering previews a score without selecting it.
  const [hovered, setHovered] = useState<number | null>(null)
  const shown = hovered ?? field.value ?? 0
  const message = error?.message

  return (
    <fieldset aria-describedby={message ? 'score-message' : undefined}>
      <legend className="text-sm font-semibold">Your rating</legend>
      <div className="mt-1 flex flex-wrap items-center gap-x-3">
        <div className="flex" onMouseLeave={() => setHovered(null)}>
          {SCORES.map((score) => (
            <label key={score} className="cursor-pointer" onMouseEnter={() => setHovered(score)}>
              <input
                type="radio"
                name={field.name}
                value={score}
                checked={field.value === score}
                onChange={() => field.onChange(score)}
                onBlur={field.onBlur}
                // Lets the form move focus here when the rating is missing.
                ref={score === 1 ? field.ref : undefined}
                aria-label={`${score} ${score === 1 ? 'star' : 'stars'}, ${SCORE_LABELS[score]}`}
                aria-invalid={message ? true : undefined}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={`grid size-11 place-items-center rounded-full text-3xl leading-none transition-transform peer-focus-visible:outline-2 peer-focus-visible:outline-accent hover:scale-110 motion-reduce:transition-none motion-reduce:hover:scale-100 ${
                  score <= shown ? 'text-star' : 'text-star-empty'
                }`}
              >
                ★
              </span>
            </label>
          ))}
        </div>
        <span className="label-mono text-ink-muted" aria-hidden>
          {shown > 0 ? SCORE_LABELS[shown] : 'Tap a star'}
        </span>
      </div>
      {message && (
        <p id="score-message" className="mt-1 text-sm text-danger">
          {message}
        </p>
      )}
    </fieldset>
  )
}
