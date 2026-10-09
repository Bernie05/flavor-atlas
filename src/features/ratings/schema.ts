import { z } from 'zod'

// Ratings are stored as separate records (normalized), not as a single
// number on the recipe. The average is computed from them when displayed.

export const ratingInputSchema = z.object({
  recipeId: z.string(),
  score: z
    .number({ error: 'Choose a star rating' })
    .int()
    .min(1, 'Choose a star rating')
    .max(5, 'Ratings go up to 5 stars'),
  comment: z.string().trim().max(300, 'Keep your review under 300 characters'),
})

export const ratingSchema = ratingInputSchema.extend({
  id: z.string(),
  createdAt: z.iso.datetime(),
})

/**
 * A visitor's review waiting for the admin. Same shape as a rating, kept
 * apart (only the admin can read the queue) until approved.
 */
export const submissionSchema = ratingSchema

/** The rating form doesn't ask for recipeId: the page already knows it. */
export const ratingFormSchema = ratingInputSchema.omit({ recipeId: true })

export type RatingInput = z.infer<typeof ratingInputSchema>
export type RatingFormValues = z.infer<typeof ratingFormSchema>
export type Rating = z.infer<typeof ratingSchema>
export type Submission = z.infer<typeof submissionSchema>
