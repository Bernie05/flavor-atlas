import type { MouseEvent } from 'react'
import type { Cuisine } from '@/features/cuisines/schema'
import { cuisineTint } from '@/features/cuisines/utils'
import { LAND_PATH } from '../landPath'
import { MAP_HEIGHT, MAP_WIDTH } from '../mapBounds'
import { isOnMap, labelWidth, PIN, projectPoint, unprojectPoint } from '../utils'

interface LocationPickerProps {
  /** The place picked so far, if it's a valid one. */
  value?: { latitude: number; longitude: number }
  onPick: (place: { latitude: number; longitude: number }) => void
  /** Cuisines already on the atlas, drawn faintly for orientation. */
  cuisines: Cuisine[]
}

/** Two decimals of a degree is about 1 km: plenty for a capital's pin. */
const round = (degrees: number) => Math.round(degrees * 100) / 100

/**
 * The whole drawn map: click or tap to place the new cuisine's capital. It
 * is a shortcut for pointer users; the latitude and longitude fields next to
 * it are the way in for keyboards and screen readers, so the map itself is
 * hidden from them.
 */
export function LocationPicker({ value, onPick, cuisines }: LocationPickerProps) {
  const picked = value && isOnMap(projectPoint(value)) ? projectPoint(value) : undefined
  // The whole map is 2x the home view, so pins and labels are drawn 2x to look the same.
  const k = MAP_WIDTH / 360

  const pick = (event: MouseEvent<SVGSVGElement>) => {
    const svg = event.currentTarget
    const matrix = svg.getScreenCTM()
    if (!matrix) return
    // Screen pixels to map units, whatever size the map is drawn at.
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    if (!isOnMap(point)) return
    const { latitude, longitude } = unprojectPoint(point)
    onPick({ latitude: round(latitude), longitude: round(longitude) })
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-accent-soft ring-1 ring-line-strong">
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        aria-hidden
        onClick={pick}
        className="block h-auto w-full cursor-crosshair touch-manipulation"
      >
        <path d={LAND_PATH} fill="var(--surface)" stroke="var(--line-strong)" strokeWidth={0.6 * k} strokeLinejoin="round" />

        {cuisines.map((cuisine) => {
          const point = projectPoint(cuisine)
          // Near the east edge the label goes on the left of its dot, so it isn't cut off.
          const left = point.x + labelWidth(cuisine.name) * (11 / PIN.labelSize) * k + 8 * k > MAP_WIDTH
          return (
            <g key={cuisine.id} style={cuisineTint(cuisine.id)} opacity={0.75} className="pointer-events-none">
              <circle cx={point.x} cy={point.y} r={4 * k} fill="var(--tint)" />
              <text
                x={left ? point.x - 8 * k : point.x + 8 * k}
                y={point.y + 4 * k}
                textAnchor={left ? 'end' : 'start'}
                style={{ fontSize: 11 * k }}
                fill="var(--tint-ink)"
                stroke="var(--accent-soft)"
                strokeWidth={3 * k}
                paintOrder="stroke"
                className="label-mono"
              >
                {cuisine.name}
              </text>
            </g>
          )
        })}

        {/* The new cuisine's pin, in the color being picked (the form sets the tint). */}
        {picked && (
          <g className="pointer-events-none">
            <circle cx={picked.x} cy={picked.y} r={14 * k} fill="none" stroke="var(--tint)" strokeWidth={1.5 * k} opacity={0.5} />
            <circle cx={picked.x} cy={picked.y} r={PIN.radius * k} fill="var(--tint-soft)" stroke="var(--tint)" strokeWidth={1.5 * k} />
            <circle cx={picked.x} cy={picked.y} r={3.5 * k} fill="var(--tint)" />
          </g>
        )}
      </svg>
    </div>
  )
}
