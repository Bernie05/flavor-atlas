import type { Rating } from './schema'

export interface RatingSummary {
  /** Average score rounded to one decimal, or 0 when there are no ratings. */
  average: number
  count: number
}

export function summarizeRatings(ratings: Pick<Rating, 'score'>[]): RatingSummary {
  if (ratings.length === 0) return { average: 0, count: 0 }

  const total = ratings.reduce((sum, rating) => sum + rating.score, 0)
  return {
    average: Math.round((total / ratings.length) * 10) / 10,
    count: ratings.length,
  }
}
