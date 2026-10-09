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

/**
 * A new cuisine's id from its name: "Vietnamese" → "vietnamese", "Lào Food" → "lao-food".
 * Empty when the name has no Latin letters or digits, which the form reports.
 */
export const cuisineIdFor = (name: string) =>
  name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** OKLCH hue bands, each named for its upper bound (red sits around 25°, blue around 260°). */
const HUE_NAMES: [upTo: number, name: string][] = [
  [10, 'pink'], [45, 'red'], [75, 'orange'], [110, 'yellow'], [160, 'green'],
  [215, 'teal'], [285, 'blue'], [330, 'purple'], [360, 'pink'],
]

/** A color word for a hue, so a screen reader can say "Green, 150°" instead of a bare number. */
export const hueName = (hue: number) => {
  const name = HUE_NAMES.find(([upTo]) => ((hue % 360) + 360) % 360 < upTo)?.[1] ?? 'pink'
  return name[0]!.toUpperCase() + name.slice(1)
}
