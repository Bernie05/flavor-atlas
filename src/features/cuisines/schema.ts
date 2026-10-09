import { z } from 'zod'
import { isOnMap, projectPoint } from '@/features/atlas/utils'
import { MAP_COUNTRIES } from './flags'
import { CUISINE_ID } from './palette'
import { cuisineIdFor } from './utils'

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

/**
 * What the admin fills in to add a cuisine. The id comes from the name
 * (cuisineIdFor), and a new cuisine always has a hue, so it never needs CSS.
 */
export const cuisineInputSchema = z
  .object({
    name: z.string().trim().min(2, 'Name the cuisine, e.g. Vietnamese').max(40),
    countryCode: z.enum(MAP_COUNTRIES, { error: 'Choose a country on the map' }),
    emoji: z.string().trim().min(1, 'Add an emoji for recipes without a photo').max(8, 'Use a single emoji'),
    description: z.string().trim().min(10, 'Describe the cuisine in a sentence').max(300),
    origin: z.string().trim().min(2, 'Name the capital or city the pin marks').max(60),
    latitude: z.number({ error: 'Enter a latitude' }).min(-90).max(90),
    longitude: z.number({ error: 'Enter a longitude' }).min(-180).max(180),
    hue: z.number({ error: 'Pick a color' }).int().min(0).max(359),
  })
  // The name becomes the cuisine's id and web address (/cuisines/vietnamese).
  .refine((input) => cuisineIdFor(input.name) !== '', {
    message: 'Use Latin letters in the name: it becomes the page address, like /cuisines/vietnamese',
    path: ['name'],
  })
  // A pin outside the drawn map would never show, so it can't be saved.
  .refine((input) => isOnMap(projectPoint(input)), {
    message: 'Pick a place on the map: the atlas draws from Pakistan to the Pacific',
    path: ['latitude'],
  })

export type Cuisine = z.infer<typeof cuisineSchema>
export type CuisineInput = z.infer<typeof cuisineInputSchema>
