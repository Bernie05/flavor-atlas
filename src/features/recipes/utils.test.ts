import { describe, expect, it } from 'vitest'
import type { RecipeWithRatings } from './schema'
import {
  applyRecipeFilters,
  DEFAULT_FILTERS,
  filterRecipes,
  formatDuration,
  formatQuantity,
  highlightIngredients,
  quickRecipes,
  scaleQuantity,
  sortRecipes,
} from './utils'

const makeRecipe = (overrides: Partial<RecipeWithRatings>): RecipeWithRatings => ({
  id: '1',
  title: 'Recipe',
  emoji: '',
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

  it('breaks top-rated ties by number of ratings', () => {
    const rating = (id: string) => ({ id, recipeId: 'x', score: 5, comment: '', createdAt: '2026-02-02T00:00:00.000Z' })
    const once = makeRecipe({ id: 'once', ratings: [rating('a')] })
    const twice = makeRecipe({ id: 'twice', ratings: [rating('b'), rating('c')] })
    expect(ids(sortRecipes([once, twice], 'top-rated'))).toEqual(['twice', 'once'])
  })

  it('does not mutate the input array', () => {
    const input = [old, quick]
    sortRecipes(input, 'newest')
    expect(ids(input)).toEqual(['old', 'quick'])
  })
})

describe('scaleQuantity', () => {
  it('rescales for a different number of servings', () => {
    expect(scaleQuantity(1, 4, 2)).toBe(0.5)
    expect(formatQuantity(scaleQuantity(0.5, 4, 6))).toBe('¾')
  })
})

describe('highlightIngredients', () => {
  const ingredients = [{ name: 'soy sauce' }, { name: 'garlic, crushed' }, { name: 'sauce' }, { name: 'egg' }]

  it('marks ingredient names in a step, longest match first, ignoring case', () => {
    expect(highlightIngredients('Add the Soy Sauce and garlic.', ingredients)).toEqual([
      { text: 'Add the ', ingredient: false },
      { text: 'Soy Sauce', ingredient: true },
      { text: ' and ', ingredient: false },
      { text: 'garlic', ingredient: true },
      { text: '.', ingredient: false },
    ])
  })

  it('matches whole words only', () => {
    expect(highlightIngredients('Stir eggplant gently.', ingredients)).toEqual([
      { text: 'Stir eggplant gently.', ingredient: false },
    ])
  })

  it('returns the step unchanged when nothing matches', () => {
    expect(highlightIngredients('Serve hot.', [])).toEqual([{ text: 'Serve hot.', ingredient: false }])
  })
})

describe('quickRecipes', () => {
  it('keeps recipes within the time limit, quickest first', () => {
    const fast = makeRecipe({ id: 'fast', prepMinutes: 5, cookMinutes: 5 })
    const slow = makeRecipe({ id: 'slow', prepMinutes: 30, cookMinutes: 60 })
    const mid = makeRecipe({ id: 'mid', prepMinutes: 10, cookMinutes: 15 })
    expect(quickRecipes([slow, mid, fast]).map((r) => r.id)).toEqual(['fast', 'mid'])
  })
})

describe('applyRecipeFilters', () => {
  const adobo = makeRecipe({ id: 'adobo', title: 'Chicken Adobo', cuisineId: 'filipino', cookMinutes: 45 })
  const kimchi = makeRecipe({ id: 'kimchi', title: 'Kimchi Rice', cuisineId: 'korean', cookMinutes: 10 })
  const bibimbap = makeRecipe({ id: 'bibimbap', title: 'Bibimbap', cuisineId: 'korean', cookMinutes: 40 })
  const all = [adobo, kimchi, bibimbap]
  const ids = (list: RecipeWithRatings[]) => list.map((r) => r.id)

  it('combines search, cuisine, quick and sort', () => {
    expect(ids(applyRecipeFilters(all, { ...DEFAULT_FILTERS, cuisineId: 'korean' }))).toEqual(['kimchi', 'bibimbap'])
    expect(ids(applyRecipeFilters(all, { ...DEFAULT_FILTERS, quick: true }))).toEqual(['kimchi'])
    expect(ids(applyRecipeFilters(all, { ...DEFAULT_FILTERS, query: 'adobo' }))).toEqual(['adobo'])
    expect(ids(applyRecipeFilters(all, { ...DEFAULT_FILTERS, sort: 'quickest' }))).toEqual(['kimchi', 'bibimbap', 'adobo'])
  })
})
