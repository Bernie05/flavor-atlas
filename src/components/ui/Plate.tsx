const SIZES = {
  sm: 'size-11 text-xl',
  md: 'size-24 text-5xl',
  lg: 'size-36 text-7xl',
} as const

interface PlateProps {
  /** The food shown on the plate (an emoji for now, a photo later). */
  emoji: string
  size?: keyof typeof SIZES
  className?: string
}

/** A drawn plate with food on it. Decorative, so hidden from screen readers. */
export function Plate({ emoji, size = 'md', className = '' }: PlateProps) {
  return (
    <span aria-hidden className={`plate ${SIZES[size]} ${className}`}>
      <span className="plate-food">{emoji}</span>
    </span>
  )
}
