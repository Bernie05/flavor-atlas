import { describe, expect, it } from 'vitest'
import { countFieldErrors, fromFormValues, recipeFormSchema, toFormValues } from './form'
import type { RecipeWithRatings } from './schema'

const adobo: RecipeWithRatings = {
  id: '1',
  title: 'Chicken Adobo',
  emoji: '🥘',
  cuisineId: 'filipino',
  description: 'Braised chicken.',
  imageUrl: '',
  prepMinutes: 10,
  cookMinutes: 45,
  servings: 4,
  difficulty: 'easy',
  ingredients: [{ name: 'chicken', quantity: 1, unit: 'kg' }],
  steps: ['Marinate.', 'Simmer.'],
  createdAt: '2026-09-20T08:00:00.000Z',
  ratings: [{ id: 'r1', recipeId: '1', score: 5, comment: '', createdAt: '2026-09-21T08:00:00.000Z' }],
}

describe('toFormValues', () => {
  it('starts a new recipe with one blank ingredient and step', () => {
    const values = toFormValues(undefined, { cuisineId: 'korean' })
    expect(values.cuisineId).toBe('korean')
    expect(values.ingredients).toHaveLength(1)
    expect(values.steps).toEqual([{ text: '' }])
  })

  it('wraps steps as objects and leaves out server-only fields', () => {
    const values = toFormValues(adobo)
    expect(values.steps).toEqual([{ text: 'Marinate.' }, { text: 'Simmer.' }])
    expect(values).not.toHaveProperty('id')
    expect(values).not.toHaveProperty('createdAt')
    expect(values).not.toHaveProperty('ratings')
  })
})

describe('fromFormValues', () => {
  it('round-trips a recipe back to API input', () => {
    const input = fromFormValues(toFormValues(adobo))
    expect({ ...input, id: adobo.id, createdAt: adobo.createdAt, ratings: adobo.ratings }).toEqual(adobo)
  })
})

describe('recipeFormSchema', () => {
  it('rejects a blank new recipe with readable messages', () => {
    const result = recipeFormSchema.safeParse(toFormValues())
    expect(result.success).toBe(false)
    const messages = result.error?.issues.map((issue) => issue.message)
    expect(messages).toContain('Title must be at least 2 characters')
    expect(messages).toContain('Choose a cuisine')
    expect(messages).toContain('Describe this step')
  })

  it('reports an empty number field as missing, not as NaN', () => {
    const result = recipeFormSchema.safeParse({ ...toFormValues(adobo), servings: Number.NaN })
    expect(result.error?.issues[0]?.message).toBe('Enter servings')
  })
})

describe('countFieldErrors', () => {
  it('counts top-level and nested field array errors', () => {
    const errors = {
      title: { type: 'too_small', message: 'Title must be at least 2 characters' },
      ingredients: [undefined, { name: { type: 'too_small', message: 'Ingredient name is required' } }],
      steps: { root: { type: 'too_small', message: 'Add at least one step' } },
    }
    expect(countFieldErrors(errors)).toBe(3)
  })

  it('returns 0 when there are no errors', () => {
    expect(countFieldErrors({})).toBe(0)
  })
})
