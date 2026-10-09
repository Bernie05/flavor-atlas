import { describe, expect, it } from 'vitest'
import { cuisineInputSchema } from './schema'
import { cuisineIdFor, cuisineTint, formatCoordinates } from './utils'

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

describe('cuisineIdFor', () => {
  it('makes a slug from the name, without accents', () => {
    expect(cuisineIdFor('Vietnamese')).toBe('vietnamese')
    expect(cuisineIdFor('  Lào   Food! ')).toBe('lao-food')
    expect(cuisineIdFor('Đà Nẵng')).toBe('da-nang')
  })

  it('is empty when nothing is left to slug', () => {
    expect(cuisineIdFor('ไทย')).toBe('')
  })
})

describe('cuisineInputSchema', () => {
  const vietnamese = {
    name: 'Vietnamese',
    countryCode: 'vn',
    emoji: '🍜',
    description: 'Fresh herbs and long-simmered broths.',
    origin: 'Hanoi',
    latitude: 21.03,
    longitude: 105.85,
    hue: 150,
  }

  it('accepts a cuisine on the map', () => {
    expect(cuisineInputSchema.safeParse(vietnamese).success).toBe(true)
  })

  it('refuses a capital the map does not draw, or a country without a flag', () => {
    expect(cuisineInputSchema.safeParse({ ...vietnamese, latitude: 41.9, longitude: 12.5 }).error?.issues[0]?.path).toEqual(['latitude'])
    expect(cuisineInputSchema.safeParse({ ...vietnamese, countryCode: 'it' }).success).toBe(false)
  })

  it('refuses a name that makes no web address', () => {
    expect(cuisineInputSchema.safeParse({ ...vietnamese, name: 'ไทย' }).error?.issues[0]?.path).toEqual(['name'])
  })
})
