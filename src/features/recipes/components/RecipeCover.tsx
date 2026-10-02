import { FoodEmoji } from '@/components/ui/FoodEmoji'
import { CuisineCloth } from '@/features/cuisines/components/CuisineCloth'
import type { Recipe } from '../schema'
import { usePhoto } from '../usePhoto'

interface RecipeCoverProps {
  recipe: Pick<Recipe, 'title' | 'imageUrl' | 'cuisineId'>
  /** Shown on the cuisine's cloth when the recipe has no photo. */
  emoji?: string
  emojiSize?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * The picture area of a recipe: its photo filling the whole area, or its
 * emoji set on the cuisine's patterned cloth. Expects a parent with
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
    <CuisineCloth cuisineId={recipe.cuisineId} className={className}>
      <FoodEmoji emoji={emoji} size={emojiSize} />
    </CuisineCloth>
  )
}
