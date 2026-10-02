import { describe, expect, it } from 'vitest'
import type { RecipeWithRatings } from './schema'
import { filterRecipes, formatDuration, formatQuantity, sortRecipes } from './utils'

const makeRecipe = (overrides: Partial<RecipeWithRatings>): RecipeWithRatings => ({
  id: '1',
  title: 'Recipe',
  cuisineId: 'korean',
  description: '',
  imageUrl: '',
  prepMinutes: 10,
  cookMinutes: 10,
  servings: 2,
  difficulty: 'easy',
  ingredients: [{ name: 'rice', quantity: 1, unit: 'cup' }],
  steps: ['Cook it.'],
  createdAt: '2026-09-01T00:00:00.000Z',
  ratings: [],
  ...overrides,
})

describe('formatDuration', () => {
  it.each([
    [45, '45 min'],
    [60, '1 hr'],
    [75, '1 hr 15 min'],
  ])('formats %i minutes as "%s"', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected)
  })
})

describe('formatQuantity', () => {
  it.each([
    [400, '400'],
    [0.5, '½'],
    [1.5, '1½'],
    [0.33, '⅓'],
    [0.25, '¼'],
    [1.2, '1.2'],
  ])('formats %d as "%s"', (quantity, expected) => {
    expect(formatQuantity(quantity)).toBe(expected)
  })
})

describe('filterRecipes', () => {
  const adobo = makeRecipe({ id: '1', title: 'Chicken Adobo' })
  const kimchi = makeRecipe({
    id: '2',
    title: 'Fried Rice',
    ingredients: [{ name: 'Kimchi', quantity: 1, unit: 'cup' }],
  })

  it('returns everything for an empty query', () => {
    expect(filterRecipes([adobo, kimchi], '  ')).toEqual([adobo, kimchi])
  })

  it('matches titles and ingredients, ignoring case', () => {
    expect(filterRecipes([adobo, kimchi], 'ADOBO')).toEqual([adobo])
    expect(filterRecipes([adobo, kimchi], 'kimchi')).toEqual([kimchi])
  })
})

describe('sortRecipes', () => {
  const old = makeRecipe({ id: 'old', createdAt: '2026-01-01T00:00:00.000Z', cookMinutes: 60 })
  const loved = makeRecipe({
    id: 'loved',
    createdAt: '2026-02-01T00:00:00.000Z',
    ratings: [{ id: 'r', recipeId: 'loved', score: 5, comment: '', createdAt: '2026-02-02T00:00:00.000Z' }],
  })
  const quick = makeRecipe({ id: 'quick', createdAt: '2026-03-01T00:00:00.000Z', cookMinutes: 1 })
  const ids = (recipes: RecipeWithRatings[]) => recipes.map((r) => r.id)

  it('sorts by newest, top rated and quickest', () => {
    expect(ids(sortRecipes([old, loved, quick], 'newest'))).toEqual(['quick', 'loved', 'old'])
    expect(ids(sortRecipes([old, loved, quick], 'top-rated'))[0]).toBe('loved')
    expect(ids(sortRecipes([old, loved, quick], 'quickest'))).toEqual(['quick', 'loved', 'old'])
  })

  it('does not mutate the input array', () => {
    const input = [old, quick]
    sortRecipes(input, 'newest')
    expect(ids(input)).toEqual(['old', 'quick'])
  })
})
