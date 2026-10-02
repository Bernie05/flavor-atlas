import { z } from 'zod'

export const cuisineSchema = z.object({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
  description: z.string(),
})

export type Cuisine = z.infer<typeof cuisineSchema>
