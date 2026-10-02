import { describe, expect, it } from 'vitest'
import { formatRelativeDate, sortNewestFirst } from './utils'

describe('formatRelativeDate', () => {
  const now = new Date('2026-10-02T12:00:00.000Z')

  it.each([
    ['2026-10-02T11:59:30.000Z', 'just now'],
    ['2026-10-02T11:55:00.000Z', '5 minutes ago'],
    ['2026-10-02T09:00:00.000Z', '3 hours ago'],
    ['2026-10-01T12:00:00.000Z', 'yesterday'],
    ['2026-09-18T12:00:00.000Z', '2 weeks ago'],
  ])('formats %s as "%s"', (iso, expected) => {
    expect(formatRelativeDate(iso, now)).toBe(expected)
  })
})

describe('sortNewestFirst', () => {
  it('puts the latest rating first without mutating the input', () => {
    const older = { id: 'a', recipeId: '1', score: 3, comment: '', createdAt: '2026-01-01T00:00:00.000Z' }
    const newer = { ...older, id: 'b', createdAt: '2026-02-01T00:00:00.000Z' }
    const input = [older, newer]
    expect(sortNewestFirst(input).map((r) => r.id)).toEqual(['b', 'a'])
    expect(input.map((r) => r.id)).toEqual(['a', 'b'])
  })
})
