import { z } from 'zod'
import { ingredientSchema, recipeInputSchema } from '@/features/recipes/schema'

// The contract between the app and the AI, shared by the browser and the
// server. Both sides validate with these schemas: the server checks what
// the browser sends, and the browser checks what comes back.

export const AI_TASKS = ['description', 'steps', 'ingredients'] as const
export type AiTask = (typeof AI_TASKS)[number]

/** The parts of the recipe being written that the AI gets to see. */
export const aiDraftSchema = z.object({
  title: z.string().trim().min(2, 'Give the recipe a name first').max(80),
  cuisineName: z.string().max(40),
  servings: z.number().int().min(1).max(100),
  description: z.string().max(500),
  ingredients: z.array(ingredientSchema).max(50),
  steps: z.array(z.string().max(1000)).max(40),
})
export type AiDraft = z.infer<typeof aiDraftSchema>

export const aiRequestSchema = z.object({
  task: z.enum(AI_TASKS),
  draft: aiDraftSchema,
})
export type AiRequest = z.infer<typeof aiRequestSchema>

/**
 * What the model is asked to return, per task. Kept loose and simple
 * (no transforms, null instead of optional) because these become the JSON
 * Schema for Claude's structured outputs.
 */
export const aiOutputSchemas = {
  description: z.object({ description: z.string() }),
  steps: z.object({ steps: z.array(z.string()) }),
  ingredients: z.object({
    ingredients: z.array(
      z.object({ name: z.string(), quantity: z.number().nullable(), unit: z.string() }),
    ),
  }),
} as const satisfies Record<AiTask, z.ZodType>

/**
 * What the app accepts, per task: the output above, normalized and held to
 * the same rules as a recipe the user types in. AI output is untrusted input.
 */
export const aiSuggestionSchemas = {
  description: z.object({ description: recipeInputSchema.shape.description.pipe(z.string().min(1)) }),
  steps: z.object({ steps: z.array(z.string().trim().min(1)).min(1).max(20) }),
  ingredients: z.object({
    ingredients: z
      .array(
        z
          .object({ name: z.string(), quantity: z.number().nullable(), unit: z.string() })
          // Structured outputs use null for "no quantity"; the app leaves the key out.
          .transform(({ quantity, ...rest }) => (quantity === null ? rest : { ...rest, quantity }))
          .pipe(ingredientSchema),
      )
      .min(1)
      .max(40),
  }),
} as const satisfies Record<AiTask, z.ZodType>

export type AiSuggestion<T extends AiTask> = z.infer<(typeof aiSuggestionSchemas)[T]>
