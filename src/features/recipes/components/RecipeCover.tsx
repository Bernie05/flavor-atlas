import { FoodEmoji } from '@/components/ui/FoodEmoji'
import type { Recipe } from '../schema'
import { usePhoto } from '../usePhoto'

interface RecipeCoverProps {
  recipe: Pick<Recipe, 'title' | 'imageUrl'>
  /** Shown on the cuisine's dotted color when the recipe has no photo. */
  emoji?: string
  emojiSize?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * The picture area of a recipe: its photo filling the whole area, or its
 * emoji on the cuisine's dotted map color. Expects a parent with
 * cuisineTint() applied.
 */
export function RecipeCover({ recipe, emoji = '🍽️', emojiSize = 'md', className = '' }: RecipeCoverProps) {
  const photo = usePhoto(recipe.imageUrl)

  if (photo.visible) {
    return (
      <img
        src={photo.src}
        alt={recipe.title}
        loading="lazy"
        decoding="async"
        onError={photo.onError}
        className={`max-w-full bg-surface-sunken object-cover ${className}`}
      />
    )
  }

  return (
    <div className={`atlas-dots grid max-w-full place-items-center ${className}`}>
      <FoodEmoji emoji={emoji} size={emojiSize} />
    </div>
  )
}
