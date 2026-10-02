import { describe, expect, it } from 'vitest'
import type { RecipeWithRatings } from '@/features/recipes/schema'
import { computeStats, listReviews } from './stats'

const rating = (id: string, score: number, createdAt: string) => ({ id, recipeId: 'x', score, comment: '', createdAt })
const recipe = (id: string, title: string, ratings: RecipeWithRatings['ratings']) =>
  ({ id, title, ratings }) as RecipeWithRatings

describe('computeStats', () => {
  it('counts recipes, reviews, unrated recipes and the overall average', () => {
    const recipes = [
      recipe('1', 'Adobo', [rating('a', 5, '2026-01-01T00:00:00.000Z'), rating('b', 4, '2026-01-02T00:00:00.000Z')]),
      recipe('2', 'Miso', []),
    ]
    expect(computeStats(recipes, 4)).toEqual({ recipes: 2, cuisines: 4, reviews: 2, averageScore: 4.5, unrated: 1 })
  })
})

describe('listReviews', () => {
  it('flattens reviews with their recipe titles, newest first', () => {
    const recipes = [
      recipe('1', 'Adobo', [rating('a', 5, '2026-01-01T00:00:00.000Z')]),
      recipe('2', 'Miso', [rating('b', 3, '2026-03-01T00:00:00.000Z')]),
    ]
    expect(listReviews(recipes).map((r) => [r.id, r.recipeTitle])).toEqual([
      ['b', 'Miso'],
      ['a', 'Adobo'],
    ])
  })
})
