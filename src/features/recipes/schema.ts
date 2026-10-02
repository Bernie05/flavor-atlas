import { z } from 'zod'
import { ratingSchema } from '@/features/ratings/schema'

// Zod schemas are the single source of truth for a recipe's shape.
// From them we derive TypeScript types (z.infer), validate forms,
// and later validate AI output before it reaches the form.

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const

export const ingredientSchema = z.object({
  name: z.string().trim().min(1, 'Ingredient name is required'),
  quantity: z.number({ error: 'Enter a number' }).positive('Must be more than 0').optional(),
  unit: z.string().trim(),
})

/** What a user submits when creating or editing a recipe. */
export const recipeInputSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(80),
  /** The dish shown on its plate. Empty falls back to the cuisine's emoji. */
  emoji: z.string().trim().max(8, 'Use a single emoji'),
  cuisineId: z.string().min(1, 'Choose a cuisine'),
  description: z.string().trim().max(500, 'Keep the description under 500 characters'),
  imageUrl: z.union([z.url('Enter a full link starting with https://'), z.literal('')]),
  prepMinutes: z.number({ error: 'Enter minutes' }).int('Use whole minutes').min(0, 'Cannot be negative'),
  cookMinutes: z.number({ error: 'Enter minutes' }).int('Use whole minutes').min(0, 'Cannot be negative'),
  servings: z.number({ error: 'Enter servings' }).int('Use a whole number').min(1, 'Serves at least 1'),
  difficulty: z.enum(DIFFICULTIES, { error: 'Choose a difficulty' }),
  ingredients: z.array(ingredientSchema).min(1, 'Add at least one ingredient'),
  steps: z.array(z.string().trim().min(1, 'Describe this step')).min(1, 'Add at least one step'),
})

/** A recipe as stored by the API: the input plus server-assigned fields. */
export const recipeSchema = recipeInputSchema.extend({
  id: z.string(),
  createdAt: z.iso.datetime(),
})

export type Difficulty = (typeof DIFFICULTIES)[number]
export type Ingredient = z.infer<typeof ingredientSchema>
export type RecipeInput = z.infer<typeof recipeInputSchema>
export type Recipe = z.infer<typeof recipeSchema>

/** A recipe together with all of its ratings, as returned by `?_embed=ratings`. */
export const recipeWithRatingsSchema = recipeSchema.extend({
  ratings: z.array(ratingSchema),
})

export type RecipeWithRatings = z.infer<typeof recipeWithRatingsSchema>
