import { describe, expect, it } from 'vitest'
import { createSubmission, MAX_COMMENT } from './submissions'

const fresh = () => ({ recipes: [{ id: '1' }], submissions: [] as unknown[] }) as Record<string, unknown>
const now = new Date('2026-10-09T12:00:00.000Z')

describe('createSubmission', () => {
  it('keeps only known fields, trimmed, with the id and date set by the server', () => {
    const data = fresh()
    const result = createSubmission(
      data,
      { recipeId: '1', score: 4, comment: '  Lovely.  ', id: 'mine', createdAt: '1999-01-01T00:00:00.000Z', approved: true },
      { now, id: 'server-id' },
    )
    expect(result).toEqual({ status: 201, item: { id: 'server-id', recipeId: '1', score: 4, comment: 'Lovely.', createdAt: now.toISOString() } })
    expect(data.submissions).toHaveLength(1)
  })

  it('accepts a review without a comment', () => {
    expect(createSubmission(fresh(), { recipeId: '1', score: 5 }, { now, id: 'x' })).toMatchObject({ status: 201, item: { comment: '' } })
  })

  it('refuses anything a person could not have sent from the form', () => {
    const bad = [
      null,
      [1],
      'text',
      { recipeId: 'nope', score: 3 },
      { recipeId: '1', score: 0 },
      { recipeId: '1', score: 6 },
      { recipeId: '1', score: 4.5 },
      { recipeId: '1', score: '5' },
      { recipeId: '1', score: 3, comment: 42 },
      { recipeId: '1', score: 3, comment: 'x'.repeat(MAX_COMMENT + 1) },
    ]
    for (const body of bad) {
      const data = fresh()
      expect(createSubmission(data, body, { now }).status, JSON.stringify(body)?.slice(0, 40)).toBe(400)
      expect(data.submissions).toEqual([])
    }
  })

  it('thanks a bot that filled the hidden field, and keeps nothing', () => {
    const data = fresh()
    expect(createSubmission(data, { recipeId: '1', score: 5, hp_field: 'http://spam.example' }, { now })).toEqual({ status: 201, item: null })
    expect(data.submissions).toEqual([])
  })

  it('starts the queue when the database has none yet', () => {
    const data = { recipes: [{ id: '1' }] } as Record<string, unknown>
    createSubmission(data, { recipeId: '1', score: 3 }, { now, id: 'a' })
    expect(data.submissions).toHaveLength(1)
  })
})
