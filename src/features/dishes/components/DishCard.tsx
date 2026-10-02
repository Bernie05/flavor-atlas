import { Link } from 'react-router'
import { FoodEmoji } from '@/components/ui/FoodEmoji'
import { cuisineTint } from '@/features/cuisines/utils'
import type { Dish } from '../schema'

interface DishCardProps {
  dish: Dish
  emoji: string
  versions: number
  regional: number
}

/** A dish as an entry in the cuisine's table of contents: name and how many versions it has. */
export function DishCard({ dish, emoji, versions, regional }: DishCardProps) {
  return (
    <Link
      to={`/dishes/${dish.id}`}
      style={cuisineTint(dish.cuisineId)}
      className="group flex items-center gap-3 rounded-2xl bg-surface p-3 pr-4 ring-1 ring-line transition hover:ring-tint"
    >
      <FoodEmoji emoji={emoji} size="sm" />
      <span className="min-w-0">
        <span className="block truncate font-display text-2xl leading-tight group-hover:underline">{dish.name}</span>
        <span className="label-mono block text-ink-subtle tabular-nums">
          {versions} {versions === 1 ? 'version' : 'versions'}
          {regional > 0 && ` · ${regional} regional`}
        </span>
      </span>
    </Link>
  )
}
