import { z } from 'zod'
import { isOnMap, projectPoint } from '@/features/atlas/utils'

/**
 * A dish is a family of recipes: "Adobo" groups Chicken Adobo, Adobong Dilaw,
 * Adobo sa Gata… Each version stays a full recipe with its own ratings.
 * See docs/plans/dish-variants.md.
 */
export const dishInputSchema = z.object({
  cuisineId: z.string().min(1, 'Choose a cuisine'),
  name: z.string().trim().min(2, 'Name the dish').max(60, 'Keep the name under 60 characters'),
  description: z.string().trim().max(300, 'Keep the description under 300 characters'),
})

/** A dish merged into another one: its old id keeps working as a link (it redirects). */
export const mergedDishSchema = z.object({ id: z.string(), name: z.string() })

export const dishSchema = dishInputSchema.extend({
  id: z.string(),
  /** Dishes merged into this one, so their old links still lead somewhere. Absent on most dishes. */
  mergedFrom: z.array(mergedDishSchema).optional(),
})

/** What the admin can change on a dish. Its cuisine stays: its recipes share it (move them instead). */
export const dishUpdateSchema = dishInputSchema.omit({ cuisineId: true }).extend({ mergedFrom: z.array(mergedDishSchema).optional() })

/** A place a regional version comes from, marked on the map like a cuisine's capital. */
export const regionSchema = z.object({
  id: z.string(),
  cuisineId: z.string(),
  name: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

/** A new regional kitchen. Its place must be on the drawn map, like a cuisine's capital. */
export const regionInputSchema = z
  .object({
    cuisineId: z.string().min(1, 'Choose a cuisine'),
    name: z.string().trim().min(2, 'Name the place, e.g. Batangas').max(60, 'Keep the name under 60 characters'),
    latitude: z.number({ error: 'Enter a latitude' }).min(-90).max(90),
    longitude: z.number({ error: 'Enter a longitude' }).min(-180).max(180),
  })
  .refine((input) => isOnMap(projectPoint(input)), {
    message: 'Pick a place on the map: the atlas draws from Pakistan to the Pacific',
    path: ['latitude'],
  })

export type DishInput = z.infer<typeof dishInputSchema>
export type DishUpdate = z.infer<typeof dishUpdateSchema>
export type RegionInput = z.infer<typeof regionInputSchema>
export type Dish = z.infer<typeof dishSchema>
export type Region = z.infer<typeof regionSchema>
export type MergedDish = z.infer<typeof mergedDishSchema>
