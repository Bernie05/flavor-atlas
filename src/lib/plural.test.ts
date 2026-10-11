import { describe, expect, it } from 'vitest'
import { countOf } from './plural'

describe('countOf', () => {
  it('uses the singular for one and the plural for every other count, zero included', () => {
    expect([0, 1, 2].map((n) => countOf(n, 'recipe'))).toEqual(['0 recipes', '1 recipe', '2 recipes'])
  })

  it('takes an irregular plural', () => {
    expect(countOf(2, 'dish', 'dishes')).toBe('2 dishes')
  })
})
