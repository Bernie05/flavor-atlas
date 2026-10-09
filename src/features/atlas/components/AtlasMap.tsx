import { Link } from 'react-router'
import type { Cuisine } from '@/features/cuisines/schema'
import { cuisineTint } from '@/features/cuisines/utils'
import type { Region } from '@/features/dishes/schema'
import { LAND_PATH } from '../landPath'
import { AtlasCaption } from './AtlasCaption'
import { useMapViewport } from '../useMapViewport'
import { isOnMap, labelSide, mapView, PIN, pinScale, projectPoint } from '../utils'

interface AtlasMapProps {
  cuisines: Cuisine[]
  regions: Region[]
  /** Recipes per cuisine id, for each pin's accessible name. */
  recipeCounts: Map<string, number>
}

/**
 * The atlas itself: the coastlines around the atlas's cuisines, with a pin on
 * each cuisine's capital (a link to the cuisine) and a small dot for each
 * regional kitchen. The view starts fitted to them (mapView), so a new cuisine
 * appears without code changes, and visitors can zoom and drag from there
 * (useMapViewport). The dots are texture, not targets: several sit a few
 * pixels from Manila on a phone, too close to tap apart.
 */
export function AtlasMap({ cuisines, regions, recipeCounts }: AtlasMapProps) {
  const pins = cuisines.map((cuisine) => ({ cuisine, point: projectPoint(cuisine) })).filter(({ point }) => isOnMap(point))
  const dots = regions.map((region) => ({ region, point: projectPoint(region) })).filter(({ point }) => isOnMap(point))
  const home = mapView([...pins, ...dots].map(({ point }) => point))
  const { svgRef, handlers, ...viewport } = useMapViewport(home)
  const { view } = viewport
  // Sizes are set for a 360-unit view; a wider view scales them up so they stay the same on screen.
  const k = pinScale(view)
  const placed = pins.map((pin) => ({
    ...pin,
    side: labelSide(pin.point, pin.cuisine.name, view, pins.filter((other) => other !== pin).map((other) => other.point)),
  }))

  return (
    <figure className="space-y-2">
      <div className="relative overflow-hidden rounded-3xl bg-accent-soft ring-1 ring-line">
        {/* Before the map in the tab order, so keyboard users find them first. */}
        <MapControls viewport={viewport} />
        {/* aria-label rather than <title>: a <title> pops up as a tooltip anywhere on the map. */}
        <svg
          ref={svgRef}
          viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
          role="group"
          aria-label="Map of Asia with the atlas's cuisines"
          {...handlers}
          // Zoomed in, one finger drags the map; otherwise it scrolls the page.
          style={{ touchAction: viewport.zoomedIn ? 'none' : 'pan-y' }}
          className="block h-auto w-full cursor-grab select-none active:cursor-grabbing"
        >
          <path d={LAND_PATH} aria-hidden fill="var(--surface)" stroke="var(--line-strong)" strokeWidth={0.6 * k} strokeLinejoin="round" />

          {dots.map(({ region, point }) => (
            <circle key={region.id} aria-hidden cx={point.x} cy={point.y} r={2.5 * k} style={cuisineTint(region.cuisineId)} fill="var(--tint)" />
          ))}

          {/* Pass 1: the pins, each a link with an invisible tap circle. */}
          {placed.map(({ cuisine, point }) => {
            const count = recipeCounts.get(cuisine.id) ?? 0
            return (
              <Link
                key={cuisine.id}
                to={`/cuisines/${cuisine.id}`}
                aria-label={`${cuisine.name}: ${count} ${count === 1 ? 'recipe' : 'recipes'}, from ${cuisine.origin}`}
                style={cuisineTint(cuisine.id)}
                className="group outline-none"
                // Where the pin is, so Tab can bring it into a zoomed-in view.
                data-pin-x={point.x}
                data-pin-y={point.y}
              >
                <circle cx={point.x} cy={point.y} r={PIN.hitRadius * k} fill="transparent" />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={14 * k}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={2 * k}
                  className="opacity-0 group-focus-visible:opacity-100"
                />
                <circle cx={point.x} cy={point.y} r={PIN.radius * k} fill="var(--tint-soft)" stroke="var(--tint)" strokeWidth={1.5 * k} />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={3.5 * k}
                  fill="var(--tint)"
                  className="origin-center transition-transform [transform-box:fill-box] group-hover:scale-150 motion-reduce:transition-none"
                />
              </Link>
            )
          })}

          {/* Pass 2: the labels, drawn last so they sit above every pin's tap circle and a tap
              on "Chinese" can't land on Korean. Each repeats its pin's link for the mouse and
              touch only: the pin above is the one link keyboards and screen readers get. */}
          {placed.map(({ cuisine, point, side }) => (
            <Link key={cuisine.id} to={`/cuisines/${cuisine.id}`} tabIndex={-1} aria-hidden style={cuisineTint(cuisine.id)} className="group">
              <text
                x={side === 'right' ? point.x + PIN.labelGap * k : point.x}
                y={side === 'right' ? point.y + 4 * k : point.y + 24 * k}
                textAnchor={side === 'right' ? 'start' : 'middle'}
                // Inline, because .label-mono's CSS font-size would override a fontSize attribute.
                style={{ fontSize: PIN.labelSize * k }}
                // A halo in the sea's color keeps the label readable over coastlines.
                stroke="var(--accent-soft)"
                strokeWidth={4 * k}
                paintOrder="stroke"
                fill="var(--tint-ink)"
                className="label-mono group-hover:underline"
              >
                {cuisine.name}
              </text>
            </Link>
          ))}
        </svg>
      </div>
      <AtlasCaption regionalKitchens={dots.length} />
    </figure>
  )
}

const controlClass =
  'grid size-10 place-items-center rounded-full text-ink hover:bg-surface-sunken aria-disabled:cursor-default aria-disabled:text-ink-subtle aria-disabled:hover:bg-transparent'

/**
 * Zoom in, zoom out and reset: the way to zoom that works for everyone,
 * whatever their pointer. aria-disabled (not disabled) at the limits keeps
 * focus on the button, as on the shopping list's steppers.
 */
function MapControls({ viewport }: { viewport: Omit<ReturnType<typeof useMapViewport>, 'svgRef' | 'handlers'> }) {
  const { canZoomIn, canZoomOut, isHome, zoomIn, zoomOut, reset } = viewport
  return (
    <div role="group" aria-label="Map zoom" className="absolute top-2 right-2 z-10 flex flex-col gap-1">
      <div className="flex flex-col rounded-full bg-surface/90 shadow-sm ring-1 ring-line backdrop-blur">
        <button type="button" aria-label="Zoom in" aria-disabled={!canZoomIn} onClick={() => canZoomIn && zoomIn()} className={controlClass}>
          <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M12 6v12M6 12h12" />
          </svg>
        </button>
        <button type="button" aria-label="Zoom out" aria-disabled={!canZoomOut} onClick={() => canZoomOut && zoomOut()} className={controlClass}>
          <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M6 12h12" />
          </svg>
        </button>
      </div>
      {/* Always rendered, so focus never lands on a button that vanishes. */}
      <button
        type="button"
        aria-label="Reset map"
        aria-disabled={isHome}
        onClick={() => !isHome && reset()}
        className={`${controlClass} bg-surface/90 shadow-sm ring-1 ring-line backdrop-blur`}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4" />
        </svg>
      </button>
    </div>
  )
}
