import { Link } from 'react-router'
import type { Cuisine } from '@/features/cuisines/schema'
import { cuisineTint } from '@/features/cuisines/utils'
import type { Region } from '@/features/dishes/schema'
import { LAND_PATH, MAP_HEIGHT, MAP_WIDTH } from '../landPath'
import { isOnMap, labelSide, projectPoint } from '../utils'

interface AtlasMapProps {
  cuisines: Cuisine[]
  regions: Region[]
  /** Recipes per cuisine id, for each pin's accessible name. */
  recipeCounts: Map<string, number>
}

/** Roughly how wide a label is in map units, to keep it on the map. */
const labelWidth = (text: string) => text.length * 7.5

/**
 * The atlas itself: the coastlines of East and Southeast Asia with a pin on
 * each cuisine's capital (a link to the cuisine) and a small dot for each
 * regional kitchen. The dots are texture, not targets: several sit a few
 * pixels from Manila on a phone, too close to tap apart.
 */
export function AtlasMap({ cuisines, regions, recipeCounts }: AtlasMapProps) {
  const pins = cuisines.map((cuisine) => ({ cuisine, point: projectPoint(cuisine) })).filter(({ point }) => isOnMap(point))
  const dots = regions.map((region) => ({ region, point: projectPoint(region) })).filter(({ point }) => isOnMap(point))

  return (
    <figure className="space-y-2">
      <div className="overflow-hidden rounded-3xl bg-accent-soft ring-1 ring-line">
        <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} role="group" aria-labelledby="atlas-map-title" className="block h-auto w-full">
          <title id="atlas-map-title">Map of East and Southeast Asia with the atlas's cuisines</title>
          <path d={LAND_PATH} aria-hidden fill="var(--surface)" stroke="var(--line-strong)" strokeWidth={0.6} strokeLinejoin="round" />

          {dots.map(({ region, point }) => (
            <circle key={region.id} aria-hidden cx={point.x} cy={point.y} r={2.5} style={cuisineTint(region.cuisineId)} fill="var(--tint)" />
          ))}

          {pins.map(({ cuisine, point }) => {
            const side = labelSide(point, labelWidth(cuisine.name))
            const count = recipeCounts.get(cuisine.id) ?? 0
            return (
              <Link
                key={cuisine.id}
                to={`/cuisines/${cuisine.id}`}
                aria-label={`${cuisine.name}: ${count} ${count === 1 ? 'recipe' : 'recipes'}, from ${cuisine.origin}`}
                style={cuisineTint(cuisine.id)}
                className="group outline-none"
              >
                {/* An invisible 44-unit target: the dot itself is too small to tap. */}
                <circle cx={point.x} cy={point.y} r={22} fill="transparent" />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={14}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  className="opacity-0 group-focus-visible:opacity-100"
                />
                <circle cx={point.x} cy={point.y} r={8} fill="var(--tint-soft)" stroke="var(--tint)" strokeWidth={1.5} />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={3.5}
                  fill="var(--tint)"
                  className="origin-center transition-transform [transform-box:fill-box] group-hover:scale-150 motion-reduce:transition-none"
                />
                <text
                  x={side === 'right' ? point.x + 13 : point.x - 13}
                  y={point.y + 4}
                  textAnchor={side === 'right' ? 'start' : 'end'}
                  // A halo in the sea's color keeps the label readable over coastlines.
                  stroke="var(--accent-soft)"
                  strokeWidth={4}
                  paintOrder="stroke"
                  fill="var(--tint-ink)"
                  className="label-mono group-hover:underline"
                >
                  {cuisine.name}
                </text>
              </Link>
            )
          })}
        </svg>
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 text-sm text-ink-muted">
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-full border-[1.5px] border-ink-muted bg-surface" />
            Capital: tap for its recipes
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-1.5 rounded-full bg-ink-muted" />
            {dots.length} regional kitchens
          </span>
        </span>
        <span className="text-xs text-ink-subtle">Map: Natural Earth</span>
      </figcaption>
    </figure>
  )
}
