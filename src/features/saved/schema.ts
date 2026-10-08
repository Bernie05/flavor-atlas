import { z } from 'zod'

/** How many recipes one browser keeps. A cap keeps a tampered value from growing without limit. */
export const MAX_SAVED = 100

/**
 * The saved list as stored in the visitor's browser: recipe ids, newest first.
 * localStorage is untrusted input (any script or person can write it), so it is
 * validated like any other data entering the app.
 */
export const savedRecipeIdsSchema = z.array(z.string().trim().min(1).max(100)).max(MAX_SAVED)

export type SavedRecipeIds = z.infer<typeof savedRecipeIdsSchema>
