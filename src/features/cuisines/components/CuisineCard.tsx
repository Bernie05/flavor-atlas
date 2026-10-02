import { Link } from 'react-router'
import type { Cuisine } from '../schema'

interface CuisineCardProps {
  cuisine: Cuisine
  recipeCount: number
}

export function CuisineCard({ cuisine, recipeCount }: CuisineCardProps) {
  return (
    <Link
      to={`/cuisines/${cuisine.id}`}
      className="group flex items-start gap-4 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent"
    >
      <span
        aria-hidden
        className="grid size-12 shrink-0 place-items-center rounded-lg bg-accent-soft text-2xl"
      >
        {cuisine.emoji}
      </span>
      <span className="min-w-0">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-display text-lg font-semibold group-hover:text-accent">
            {cuisine.name}
          </span>
          <span className="shrink-0 text-xs text-ink-subtle tabular-nums">
            {recipeCount} {recipeCount === 1 ? 'recipe' : 'recipes'}
          </span>
        </span>
        <span className="mt-0.5 block text-sm text-ink-muted">{cuisine.description}</span>
      </span>
    </Link>
  )
}
