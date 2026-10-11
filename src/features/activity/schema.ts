import { z } from 'zod'
import { undoSchema } from '@/features/recipes/move'

/** What a change was about: the dashboard shows an icon-free label for each. */
export const ACTIVITY_KINDS = ['recipe', 'cuisine', 'dish', 'region', 'review', 'move', 'merge', 'undo'] as const

/**
 * One entry in the admin's change history: what changed, in words, and
 * where to see it. Moves and merges also keep what it takes to undo them.
 * Written by the app after a change succeeds (see `activityMeta`), never by
 * a visitor; the server lets only the admin read or write the history.
 */
export const activityInputSchema = z.object({
  kind: z.enum(ACTIVITY_KINDS),
  summary: z.string().trim().min(1).max(300),
  /** A page inside the app where the change can be seen ("/recipes/8"). */
  link: z.string().startsWith('/').optional(),
  undo: undoSchema.optional(),
})

export const activitySchema = activityInputSchema.extend({
  id: z.string(),
  /** When it happened (ISO date). */
  at: z.string(),
  /** Set once the change was undone, so it isn't offered again. */
  undoneAt: z.string().optional(),
})

export type ActivityKind = (typeof ACTIVITY_KINDS)[number]
export type ActivityInput = z.infer<typeof activityInputSchema>
export type Activity = z.infer<typeof activitySchema>
