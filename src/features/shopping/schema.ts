import { z } from 'zod'

/**
 * The shopping list's settings, kept in the visitor's browser: servings per
 * recipe, recipes left off the list, and lines already ticked off. Validated
 * on the way in, like any other data entering the app.
 */
export const shoppingStateSchema = z.object({
  servings: z.record(z.string().max(100), z.number().int().min(1).max(24)),
  excluded: z.array(z.string().max(100)).max(100),
  checked: z.array(z.string().max(200)).max(500),
})

export type ShoppingState = z.infer<typeof shoppingStateSchema>

export const EMPTY_SHOPPING_STATE: ShoppingState = { servings: {}, excluded: [], checked: [] }
