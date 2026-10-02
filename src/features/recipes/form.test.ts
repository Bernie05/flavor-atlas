import { describe, expect, it } from 'vitest'
import { countFieldErrors, fromFormValues, NEW_DISH, recipeFormSchema, reuseExistingDish, toFormValues } from './form'
import type { RecipeWithRatings } from './schema'

const adobo: RecipeWithRatings = {
  id: '1',
  title: 'Chicken Adobo',
  emoji: '🥘',
  cuisineId: 'filipino',
  dishId: 'adobo',
  variant: '',
  mainIngredient: 'chicken',
  regionId: '',
  variantNote: '',
  description: 'Braised chicken.',
  imageUrl: '',
  imageCredit: '',
  imageSourceUrl: '',
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
    const { input, newDishName } = fromFormValues(toFormValues(adobo))
    expect({ ...input, id: adobo.id, createdAt: adobo.createdAt, ratings: adobo.ratings }).toEqual(adobo)
    expect(newDishName).toBeNull()
  })

  it('hands over a new dish name instead of a dish id when "New dish" is chosen', () => {
    const values = { ...toFormValues(adobo), dishId: NEW_DISH, newDishName: 'Pancit' }
    const { input, newDishName } = fromFormValues(values)
    expect(input.dishId).toBe('')
    expect(newDishName).toBe('Pancit')
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
    expect(messages).toContain('Choose a dish')
  })

  it('requires a name only when creating a new dish', () => {
    const base = toFormValues(adobo)
    const missing = recipeFormSchema.safeParse({ ...base, dishId: NEW_DISH, newDishName: '' })
    expect(missing.error?.issues.map((i) => i.message)).toEqual(['Name the new dish'])
    expect(recipeFormSchema.safeParse({ ...base, dishId: NEW_DISH, newDishName: 'Pancit' }).success).toBe(true)
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

describe('reuseExistingDish', () => {
  const dishes = [
    { id: 'adobo', cuisineId: 'filipino', name: 'Adobo', description: '' },
    { id: 'ramen', cuisineId: 'japanese', name: 'Ramen', description: '' },
  ]
  const submission = (cuisineId: string, newDishName: string | null) => ({
    input: { ...fromFormValues(toFormValues(undefined, { cuisineId })).input, dishId: '' },
    newDishName,
  })

  it('files a "new" dish that already exists under it, ignoring case', () => {
    const result = reuseExistingDish(submission('filipino', 'adobo'), dishes)
    expect(result.newDishName).toBeNull()
    expect(result.input.dishId).toBe('adobo')
  })

  it('only matches dishes in the same cuisine', () => {
    expect(reuseExistingDish(submission('filipino', 'Ramen'), dishes).newDishName).toBe('Ramen')
  })
})

describe('photo fields', () => {
  const withPhoto = (imageUrl: string, imageSourceUrl = '') =>
    recipeFormSchema.safeParse({
      ...toFormValues(undefined, { cuisineId: 'filipino', dishId: 'adobo' }),
      title: 'Adobo',
      ingredients: [{ name: 'chicken', quantity: 1, unit: 'kg' }],
      steps: [{ text: 'Braise the chicken.' }],
      imageUrl,
      imageSourceUrl,
    })

  it('accepts https links and bundled photos', () => {
    expect(withPhoto('https://example.com/adobo.jpg').success).toBe(true)
    expect(withPhoto('/photos/chicken-adobo.webp').success).toBe(true)
  })

  it('rejects other schemes and paths, since these end up in src and href', () => {
    expect(withPhoto('http://example.com/adobo.jpg').success).toBe(false)
    expect(withPhoto('/photos/../secret.webp').success).toBe(false)
    expect(withPhoto('', 'javascript:alert(1)').success).toBe(false)
  })
})
