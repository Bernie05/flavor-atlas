import { z } from 'zod'
import { CUISINE_ID } from './palette'

export const cuisineSchema = z.object({
  /** A slug ("filipino"): it names the cuisine's CSS variables, so nothing else is allowed. */
  id: z.string().regex(CUISINE_ID),
  name: z.string(),
  /** Food emoji: the picture for this cuisine's recipes that have no photo. */
  emoji: z.string(),
  /** ISO 3166-1 alpha-2, lowercase ("ph"), for the cuisine's flag. */
  countryCode: z.string().regex(/^[a-z]{2}$/),
  description: z.string(),
  /** City the coordinates point to, usually the capital. */
  origin: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  /**
   * The cuisine's color as an OKLCH hue (0-360). Its palette is generated from
   * it (palette.ts); without one, a cuisine uses its hand-tuned palette in
   * index.css, or the accent.
   */
  hue: z.number().min(0).max(360).optional(),
})

export type Cuisine = z.infer<typeof cuisineSchema>
