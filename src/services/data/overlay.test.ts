import { describe, expect, it } from 'vitest'
import { getSeed } from './mockDataService'
import { applyChanges, toChangeBody } from './overlay'

describe('applyChanges', () => {
  const seed = getSeed()
  const adobo = seed.recipes.find((r) => r.id === '1')!

  it('returns the seed untouched when nothing changed', () => {
    expect(applyChanges(seed, {})).toEqual(seed)
  })

  it('applies edits in place, new records at the end, and deletions', () => {
    const edited = { ...adobo, title: 'Chicken Adobo (my way)' }
    const created = { ...adobo, id: 'new-1', title: 'Pork Adobo' }
    const result = applyChanges(seed, {
      recipes: [
        { id: '1', body: toChangeBody(edited) },
        { id: 'new-1', body: toChangeBody(created) },
        { id: '2', body: toChangeBody(null) },
      ],
    })
    expect(result.recipes[0]!.title).toBe('Chicken Adobo (my way)')
    expect(result.recipes.at(-1)!.title).toBe('Pork Adobo')
    expect(result.recipes.some((r) => r.id === '2')).toBe(false)
    expect(result.recipes).toHaveLength(seed.recipes.length)
  })

  it('skips untrusted bodies that are not a valid record or a deletion', () => {
    const result = applyChanges(seed, {
      recipes: [
        { id: '1', body: { record: { ...adobo, title: '' } } }, // fails the schema
        { id: '3', body: toChangeBody({ ...adobo, id: '999' }) }, // id doesn't match its document
        { id: '4', body: { deleted: 'yes' } },
        { id: '5', body: null },
      ],
    })
    expect(result).toEqual(seed)
  })

  it('leaves cuisines and regions alone', () => {
    const result = applyChanges(seed, { dishes: [{ id: 'adobo', body: toChangeBody(null) }] })
    expect(result.cuisines).toEqual(seed.cuisines)
    expect(result.dishes.some((d) => d.id === 'adobo')).toBe(false)
  })
})
