import { canUndo } from '@/features/recipes/move'
import type { Activity } from './schema'

/** The history keeps the latest changes only: older ones are dropped as new ones come in. */
export const ACTIVITY_LIMIT = 50

/** Newest first. */
export const sortActivity = (entries: Activity[]) => entries.toSorted((a, b) => b.at.localeCompare(a.at))

/** The entries beyond the limit (the oldest), to delete after a new one is added. */
export const activityOverflow = (entries: Activity[], limit = ACTIVITY_LIMIT) => sortActivity(entries).slice(limit)

/** True when the dashboard can still offer Undo for this entry. */
export const undoAvailable = (entry: Activity, now: number) => entry.undo !== undefined && !entry.undoneAt && canUndo(entry.undo, now)

/** The history entry an undo belongs to: its `at` stamp is unique per move or merge. */
export const entryForUndo = (entries: Activity[], at: number) => entries.find((entry) => entry.undo?.at === at && !entry.undoneAt)

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago", then the date. */
export function timeAgo(at: string, now: number): string {
  const time = Date.parse(at)
  const elapsed = Math.max(0, now - time)
  if (elapsed < MINUTE) return 'just now'
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min ago`
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} h ago`
  if (elapsed < 2 * DAY) return 'yesterday'
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)} days ago`
  return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
