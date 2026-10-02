const SIZES = {
  // Small sizes sit on a tinted tile so list rows keep an even rhythm.
  sm: 'size-11 rounded-xl bg-tint-soft text-2xl',
  md: 'text-7xl drop-shadow-[0_10px_12px_var(--plate-shadow)]',
  lg: 'text-8xl drop-shadow-[0_14px_16px_var(--plate-shadow)] sm:text-9xl',
} as const

interface FoodEmojiProps {
  emoji: string
  size?: keyof typeof SIZES
  className?: string
}

/** The stand-in picture for a recipe without a photo. Decorative, so hidden from screen readers. */
export function FoodEmoji({ emoji, size = 'md', className = '' }: FoodEmojiProps) {
  return (
    <span aria-hidden className={`food-emoji ${SIZES[size]} ${className}`}>
      {emoji}
    </span>
  )
}
