import { useQuery } from '@tanstack/react-query'
import { NavLink } from 'react-router'
import { cuisineQueries } from '../queries'
import { cuisineTint } from '../utils'

/** A row of cuisine chips under the header: the atlas's quick index. Scrolls sideways on phones. */
export function CuisineStrip() {
  const cuisines = useQuery(cuisineQueries.list()).data
  if (!cuisines?.length) return null

  return (
    <nav aria-label="Browse by cuisine" className="border-b border-line">
      <ul className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none]">
        {cuisines.map((cuisine) => (
          <li key={cuisine.id} style={cuisineTint(cuisine.id)} className="shrink-0">
            <NavLink
              to={`/cuisines/${cuisine.id}`}
              className={({ isActive }) =>
                `inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-tint-soft text-tint-ink' : 'text-ink-muted hover:bg-tint-soft hover:text-tint-ink'
                }`
              }
            >
              <span aria-hidden className="size-2.5 rounded-full bg-tint" />
              {cuisine.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
