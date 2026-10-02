import { Link } from 'react-router'
import { Plate } from '@/components/ui/Plate'
import type { Cuisine } from '../schema'
import { cuisineTint, formatCoordinates } from '../utils'

interface CuisineCardProps {
  cuisine: Cuisine
  recipeCount: number
}

/** A cuisine as a colored region of the atlas. */
export function CuisineCard({ cuisine, recipeCount }: CuisineCardProps) {
  return (
    <Link
      to={`/cuisines/${cuisine.id}`}
      style={cuisineTint(cuisine.id)}
      aria-label={`${cuisine.name}, ${recipeCount} ${recipeCount === 1 ? 'recipe' : 'recipes'}`}
      className="group flex flex-col gap-4 rounded-2xl bg-tint-soft p-4 ring-1 ring-transparent transition hover:ring-tint sm:p-5"
    >
      <span className="flex items-start justify-between gap-2">
        <Plate emoji={cuisine.emoji} size="sm" />
        <span className="label-mono whitespace-nowrap text-tint-ink tabular-nums">
          {recipeCount} {recipeCount === 1 ? 'recipe' : 'recipes'}
        </span>
      </span>
      <span className="min-w-0">
        <span className="block font-display text-2xl text-tint-ink">{cuisine.name}</span>
        <span className="label-mono mt-1 block text-ink-muted tabular-nums">
          {cuisine.origin}
          <span className="hidden sm:inline"> · {formatCoordinates(cuisine)}</span>
        </span>
        <span className="mt-2 hidden text-sm text-ink-muted sm:block">{cuisine.description}</span>
      </span>
    </Link>
  )
}
