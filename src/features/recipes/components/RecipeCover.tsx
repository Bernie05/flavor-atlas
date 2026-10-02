import { Plate } from '@/components/ui/Plate'
import type { Recipe } from '../schema'

interface RecipeCoverProps {
  recipe: Pick<Recipe, 'title' | 'imageUrl'>
  /** Food shown on the plate when the recipe has no photo. */
  emoji?: string
  plateSize?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * The picture area of a recipe: its photo, or a plate on the cuisine's
 * dotted map color. Expects a parent with cuisineTint() applied.
 */
export function RecipeCover({ recipe, emoji = '🍽️', plateSize = 'md', className = '' }: RecipeCoverProps) {
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
    <div className={`atlas-dots grid max-w-full place-items-center ${className}`}>
      <Plate emoji={emoji} size={plateSize} />
    </div>
  )
}
