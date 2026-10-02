import { describe, expect, it } from 'vitest'
import { summarizeRatings } from './summary'

describe('summarizeRatings', () => {
  it('returns zero for a recipe with no ratings', () => {
    expect(summarizeRatings([])).toEqual({ average: 0, count: 0 })
  })

  it('averages scores and rounds to one decimal', () => {
    expect(summarizeRatings([{ score: 5 }, { score: 4 }, { score: 4 }])).toEqual({
      average: 4.3,
      count: 3,
    })
  })
})
