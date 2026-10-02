import { z } from 'zod'

export const cuisineSchema = z.object({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
  description: z.string(),
  /** City the coordinates point to, usually the capital. */
  origin: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

export type Cuisine = z.infer<typeof cuisineSchema>
