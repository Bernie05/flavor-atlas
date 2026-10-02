import type { Rating } from './schema'

/** What each score means, in a cook's words. Index = score. */
export const SCORE_LABELS = ['', 'Not for me', 'Okay', 'Good', 'Great', 'Make it again'] as const

const UNITS: [unit: Intl.RelativeTimeFormatUnit, seconds: number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** "just now", "5 minutes ago", "yesterday", "3 weeks ago" */
export function formatRelativeDate(iso: string, now: Date = new Date()): string {
  const seconds = (new Date(iso).getTime() - now.getTime()) / 1000
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relativeTime.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

/** Newest first; returns a new array. */
export const sortNewestFirst = (ratings: Rating[]) =>
  ratings.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
