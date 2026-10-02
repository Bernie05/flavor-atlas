import type { CSSProperties } from 'react'
import type { Cuisine } from './schema'

/** 14.6, 120.98 → "14.60°N 120.98°E" */
export function formatCoordinates({ latitude, longitude }: Pick<Cuisine, 'latitude' | 'longitude'>) {
  const lat = `${Math.abs(latitude).toFixed(2)}°${latitude >= 0 ? 'N' : 'S'}`
  const lng = `${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? 'E' : 'W'}`
  return `${lat} ${lng}`
}

/**
 * Point the --tint tokens at a cuisine's colors. Children then use
 * bg-tint, bg-tint-soft and text-tint-ink without knowing which cuisine
 * they belong to. A cuisine with no palette in index.css falls back to
 * the app accent through the var() fallback, so new cuisines still look right.
 */
export function cuisineTint(cuisineId: string | undefined): CSSProperties {
  if (!cuisineId) return {}
  return {
    '--tint': `var(--c-${cuisineId}, var(--accent))`,
    '--tint-soft': `var(--c-${cuisineId}-soft, var(--accent-soft))`,
    '--tint-ink': `var(--c-${cuisineId}-ink, var(--accent-ink))`,
  } as CSSProperties
}
