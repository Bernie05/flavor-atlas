import { describe, expect, it } from 'vitest'
import { createWithSlug } from './slugCreate'

describe('createWithSlug', () => {
  it('keeps the id the app sent', () => {
    const data: Record<string, unknown> = { cuisines: [{ id: 'filipino' }] }
    expect(createWithSlug(data, 'cuisines', { id: 'thai', name: 'Thai' })).toEqual({ status: 201, item: { id: 'thai', name: 'Thai' } })
    expect(data.cuisines).toEqual([{ id: 'filipino' }, { id: 'thai', name: 'Thai' }])
  })

  it('refuses a duplicate, a missing or malformed id, and a body that is not an object', () => {
    const data: Record<string, unknown> = { cuisines: [{ id: 'filipino' }] }
    expect(createWithSlug(data, 'cuisines', { id: 'filipino' }).status).toBe(409)
    expect(createWithSlug(data, 'cuisines', { name: 'No id' }).status).toBe(400)
    expect(createWithSlug(data, 'cuisines', { id: 'Thai Food' }).status).toBe(400)
    expect(createWithSlug(data, 'cuisines', { id: 'x;}body{' }).status).toBe(400)
    expect(createWithSlug(data, 'cuisines', [1, 2]).status).toBe(400)
    expect(data.cuisines).toEqual([{ id: 'filipino' }])
  })
})
