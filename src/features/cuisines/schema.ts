import { z } from 'zod'

export const cuisineSchema = z.object({
  id: z.string(),
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
})

export type Cuisine = z.infer<typeof cuisineSchema>
