import { z } from 'zod'

/**
 * A dish is a family of recipes: "Adobo" groups Chicken Adobo, Adobong Dilaw,
 * Adobo sa Gata… Each version stays a full recipe with its own ratings.
 * See docs/plans/dish-variants.md.
 */
export const dishInputSchema = z.object({
  cuisineId: z.string().min(1, 'Choose a cuisine'),
  name: z.string().trim().min(2, 'Name the dish').max(60),
  description: z.string().trim().max(300),
})

export const dishSchema = dishInputSchema.extend({ id: z.string() })

/** A place a regional version comes from, marked on the map like a cuisine's capital. */
export const regionSchema = z.object({
  id: z.string(),
  cuisineId: z.string(),
  name: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

export type DishInput = z.infer<typeof dishInputSchema>
export type Dish = z.infer<typeof dishSchema>
export type Region = z.infer<typeof regionSchema>
