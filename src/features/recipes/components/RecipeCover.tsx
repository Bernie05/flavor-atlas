import { useState, type ReactNode } from 'react'
import { Plate } from '@/components/ui/Plate'
import type { Recipe } from '../schema'
import { photoSrc } from '../utils'

interface RecipeCoverProps {
  recipe: Pick<Recipe, 'title' | 'imageUrl'>
  /** Food shown on the plate when the recipe has no photo. */
  emoji?: string
  plateSize?: 'sm' | 'md' | 'lg'
  className?: string
  /** Replaces the default dotted plate, e.g. a bare plate on an already dotted hero. */
  fallback?: ReactNode
  /** Shown under the photo (a credit). Hidden with the photo when it falls back to the plate. */
  caption?: ReactNode
}

/**
 * The picture area of a recipe: its photo, or a plate on the cuisine's
 * dotted map color. A photo that fails to load (moved, offline, blocked by
 * the host) falls back to the plate instead of a broken image.
 * Expects a parent with cuisineTint() applied.
 */
export function RecipeCover({ recipe, emoji = '🍽️', plateSize = 'md', className = '', fallback, caption }: RecipeCoverProps) {
  // Remember which URL failed, so editing the link in the form tries again.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  if (recipe.imageUrl && recipe.imageUrl !== failedUrl) {
    const photo = (
      <img
        src={photoSrc(recipe.imageUrl)}
        alt={recipe.title}
        loading="lazy"
        decoding="async"
        onError={() => setFailedUrl(recipe.imageUrl)}
        className={`max-w-full bg-surface-sunken object-cover ${className}`}
      />
    )
    if (!caption) return photo
    return (
      <figure className="grid justify-items-center justify-self-center gap-3">
        {photo}
        <figcaption className="max-w-64 text-center text-xs text-ink-muted">{caption}</figcaption>
      </figure>
    )
  }

  return (
    fallback ?? (
      <div className={`atlas-dots grid max-w-full place-items-center ${className}`}>
        <Plate emoji={emoji} size={plateSize} />
      </div>
    )
  )
}
