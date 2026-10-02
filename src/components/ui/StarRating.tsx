interface StarRatingProps {
  /** Average score from 0 to 5; fractions fill stars partially. */
  value: number
  /** When given, shows the score and number of ratings next to the stars. */
  count?: number
  size?: 'sm' | 'lg'
}

export function StarRating({ value, count, size = 'sm' }: StarRatingProps) {
  const label =
    count === 0 ? 'No ratings yet' : `Rated ${value.toFixed(1)} out of 5`
  const fillPercent = `${(value / 5) * 100}%`

  return (
    <span className={`inline-flex items-center gap-2 ${size === 'lg' ? 'text-xl' : 'text-sm'}`}>
      {/* Two layers of stars: the filled layer is clipped to the score's width. */}
      <span role="img" aria-label={label} className="relative inline-block leading-none">
        <span aria-hidden className="text-star-empty">★★★★★</span>
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 overflow-hidden whitespace-nowrap text-star"
          style={{ width: fillPercent }}
        >
          ★★★★★
        </span>
      </span>
      {count !== undefined && (
        <span className="text-sm whitespace-nowrap text-ink-muted tabular-nums">
          {count === 0 ? 'No ratings yet' : `${value.toFixed(1)} · ${count} ${count === 1 ? 'rating' : 'ratings'}`}
        </span>
      )}
    </span>
  )
}
