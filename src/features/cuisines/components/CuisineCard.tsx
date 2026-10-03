import { Link } from 'react-router'
import type { Recipe } from '@/features/recipes/schema'
import { usePhoto } from '@/features/recipes/usePhoto'
import type { Cuisine } from '../schema'
import { cuisineTint, formatCoordinates } from '../utils'
import { CuisineFlag } from './CuisineFlag'

interface CuisineCardProps {
  cuisine: Cuisine
  recipeCount: number
  /** A recipe whose photo stands for the cuisine; see coverRecipe(). */
  cover?: Pick<Recipe, 'imageUrl'>
}

/**
 * A cuisine as a cover: one of its dishes fills the card, with the name set
 * over a dark gradient, like the recipe heroes. Without a photo it falls back
 * to the cuisine's color. The flag marks the country either way.
 */
export function CuisineCard({ cuisine, recipeCount, cover }: CuisineCardProps) {
  const photo = usePhoto(cover?.imageUrl ?? '')
  const count = `${recipeCount} ${recipeCount === 1 ? 'recipe' : 'recipes'}`

  return (
    <Link
      to={`/cuisines/${cuisine.id}`}
      // Over a photo, .on-photo sets light tokens; an inline tint on the same element would override them.
      style={photo.visible ? undefined : cuisineTint(cuisine.id)}
      aria-label={`${cuisine.name}, ${count}`}
      className={`group relative isolate flex min-h-52 flex-col justify-between gap-4 overflow-hidden rounded-2xl p-4 ring-1 transition sm:min-h-64 sm:p-5 ${
        photo.visible ? 'on-photo ring-transparent hover:ring-ink/40' : 'bg-tint-soft ring-transparent hover:ring-tint'
      }`}
    >
      {photo.visible && (
        <>
          <img
            src={photo.src}
            alt=""
            loading="lazy"
            onError={photo.onError}
            className="absolute inset-0 -z-10 size-full bg-surface-sunken object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
          <div aria-hidden className="photo-scrim absolute inset-0 -z-10" />
        </>
      )}

      <span className="flex items-start justify-between gap-2">
        <CuisineFlag countryCode={cuisine.countryCode} size="lg" />
        <span
          className={`label-mono rounded-full px-2.5 py-1 whitespace-nowrap tabular-nums ${
            photo.visible ? 'bg-black/45 text-white backdrop-blur-sm' : 'text-tint-ink'
          }`}
        >
          {count}
        </span>
      </span>

      <span className="min-w-0">
        <span className="block font-display text-3xl leading-none text-tint-ink sm:text-4xl">{cuisine.name}</span>
        <span className="label-mono mt-2 block text-ink-muted tabular-nums">
          {cuisine.origin}
          <span className="hidden sm:inline"> · {formatCoordinates(cuisine)}</span>
        </span>
        <span className="mt-2 hidden text-sm text-ink-muted sm:line-clamp-2">{cuisine.description}</span>
      </span>
    </Link>
  )
}
