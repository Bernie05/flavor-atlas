import { describe, expect, it } from 'vitest'
import { cuisineTint, formatCoordinates } from './utils'

describe('formatCoordinates', () => {
  it('formats north/east coordinates with two decimals', () => {
    expect(formatCoordinates({ latitude: 14.6, longitude: 120.98 })).toBe('14.60°N 120.98°E')
  })

  it('uses S and W for negative values', () => {
    expect(formatCoordinates({ latitude: -33.87, longitude: -70.65 })).toBe('33.87°S 70.65°W')
  })
})

describe('cuisineTint', () => {
  it('points tint tokens at the cuisine palette with an accent fallback', () => {
    expect(cuisineTint('korean')).toMatchObject({ '--tint': 'var(--c-korean, var(--accent))' })
  })
})
