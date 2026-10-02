import { z } from 'zod'

// Zod schemas are the single source of truth for a recipe's shape.
// From them we derive TypeScript types (z.infer), validate forms,
// and later validate AI output before it reaches the form.

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const

export const ingredientSchema = z.object({
  name: z.string().trim().min(1, 'Ingredient name is required'),
  quantity: z.number().positive().optional(),
  unit: z.string().trim(),
})

/** What a user submits when creating or editing a recipe. */
export const recipeInputSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(80),
  cuisineId: z.string().min(1, 'Choose a cuisine'),
  description: z.string().trim().max(500),
  imageUrl: z.union([z.url(), z.literal('')]),
  prepMinutes: z.number().int().min(0),
  cookMinutes: z.number().int().min(0),
  servings: z.number().int().min(1),
  difficulty: z.enum(DIFFICULTIES),
  ingredients: z.array(ingredientSchema).min(1, 'Add at least one ingredient'),
  steps: z.array(z.string().trim().min(1)).min(1, 'Add at least one step'),
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
