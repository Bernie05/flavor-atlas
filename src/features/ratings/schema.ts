import { z } from 'zod'

// Ratings are stored as separate records (normalized), not as a single
// number on the recipe. The average is computed from them when displayed.

export const ratingInputSchema = z.object({
  recipeId: z.string(),
  score: z.number().int().min(1).max(5),
  comment: z.string().trim().max(300),
})

export const ratingSchema = ratingInputSchema.extend({
  id: z.string(),
  createdAt: z.iso.datetime(),
})

export type RatingInput = z.infer<typeof ratingInputSchema>
export type Rating = z.infer<typeof ratingSchema>
