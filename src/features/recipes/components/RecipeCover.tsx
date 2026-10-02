import type { Recipe } from '../schema'

interface RecipeCoverProps {
  recipe: Pick<Recipe, 'title' | 'imageUrl'>
  /** Shown large when the recipe has no photo. */
  fallbackEmoji?: string
  className?: string
}

export function RecipeCover({ recipe, fallbackEmoji = '🍽️', className = '' }: RecipeCoverProps) {
  if (recipe.imageUrl) {
    return (
      <img
        src={recipe.imageUrl}
        alt={recipe.title}
        loading="lazy"
        className={`max-w-full object-cover ${className}`}
      />
    )
  }

  return (
    <div aria-hidden className={`grid max-w-full place-items-center bg-accent-soft ${className}`}>
      <span className="text-5xl">{fallbackEmoji}</span>
    </div>
  )
}
