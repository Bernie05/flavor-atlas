import { describe, expect, it } from 'vitest'
import type { RecipeWithRatings } from './schema'
import {
  coverRecipe,
  photoSrc,
  applyRecipeFilters,
  DEFAULT_FILTERS,
  filterRecipes,
  findStepTimers,
  formatCountdown,
  ingredientsInStep,
  filtersFromParams,
  filtersToParams,
  formatAmount,
  formatDuration,
  formatIngredient,
  formatQuantity,
  hasActiveFilters,
  highlightIngredients,
  mainIngredients,
  quickRecipes,
  scaleQuantity,
  sortRecipes,
} from './utils'

const makeRecipe = (overrides: Partial<RecipeWithRatings>): RecipeWithRatings => ({
  id: '1',
  title: 'Recipe',
  emoji: '',
  dishId: 'dish',
  variant: '',
  mainIngredient: '',
  regionId: '',
  variantNote: '',
  cuisineId: 'korean',
  description: '',
  imageUrl: '',
  imageCredit: '',
  imageSourceUrl: '',
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

  it('combines search, cuisine, time and sort', () => {
    expect(ids(applyRecipeFilters(all, { ...DEFAULT_FILTERS, cuisineId: 'korean' }))).toEqual(['kimchi', 'bibimbap'])
    expect(ids(applyRecipeFilters(all, { ...DEFAULT_FILTERS, maxMinutes: 30 }))).toEqual(['kimchi'])
    expect(ids(applyRecipeFilters(all, { ...DEFAULT_FILTERS, maxMinutes: 60 }))).toEqual(['adobo', 'kimchi', 'bibimbap'])
    expect(ids(applyRecipeFilters(all, { ...DEFAULT_FILTERS, query: 'adobo' }))).toEqual(['adobo'])
    expect(ids(applyRecipeFilters(all, { ...DEFAULT_FILTERS, sort: 'quickest' }))).toEqual(['kimchi', 'bibimbap', 'adobo'])
  })

  it('filters by difficulty and main ingredient, ignoring case', () => {
    const pork = makeRecipe({ id: 'pork', mainIngredient: 'Pork', difficulty: 'medium' })
    const list = [...all, pork]
    expect(ids(applyRecipeFilters(list, { ...DEFAULT_FILTERS, difficulty: 'medium' }))).toEqual(['pork'])
    expect(ids(applyRecipeFilters(list, { ...DEFAULT_FILTERS, ingredient: 'pork' }))).toEqual(['pork'])
    expect(applyRecipeFilters(list, { ...DEFAULT_FILTERS, ingredient: 'pork', difficulty: 'hard' })).toEqual([])
  })
})

describe('filtersFromParams / filtersToParams', () => {
  it('round-trips every filter through the URL', () => {
    const filters = {
      ...DEFAULT_FILTERS,
      query: 'garlic',
      cuisineId: 'filipino',
      maxMinutes: 60,
      difficulty: 'easy' as const,
      ingredient: 'pork',
      sort: 'quickest' as const,
    }
    const params = filtersToParams(filters)
    expect(params.toString()).toBe('q=garlic&cuisine=filipino&time=60&level=easy&ingredient=pork&sort=quickest')
    expect(filtersFromParams(params)).toEqual(filters)
  })

  it('keeps default links empty and falls back on unknown values', () => {
    expect(filtersToParams(DEFAULT_FILTERS).toString()).toBe('')
    expect(filtersFromParams(new URLSearchParams('time=45&level=expert&sort=random'))).toEqual(DEFAULT_FILTERS)
  })

  it('still reads the older quick=1 link as under 30 minutes', () => {
    expect(filtersFromParams(new URLSearchParams('quick=1')).maxMinutes).toBe(30)
  })

  it('leaves a locked cuisine out of the URL', () => {
    const params = filtersToParams({ ...DEFAULT_FILTERS, cuisineId: 'korean' }, 'korean')
    expect(params.toString()).toBe('')
    expect(filtersFromParams(params, 'korean').cuisineId).toBe('korean')
  })
})

describe('hasActiveFilters', () => {
  it('ignores sort and a locked cuisine', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, sort: 'quickest' })).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, cuisineId: 'korean' }, 'korean')).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, difficulty: 'hard' })).toBe(true)
  })
})

describe('mainIngredients', () => {
  it('lists each main ingredient once, most common first', () => {
    const list = ['beef', 'Pork', 'pork ', '', 'chicken', 'beef', 'pork'].map((mainIngredient) => ({ mainIngredient }))
    expect(mainIngredients(list)).toEqual(['pork', 'beef', 'chicken'])
  })
})

describe('photoSrc', () => {
  it('resolves bundled photos against the asset base', () => {
    expect(photoSrc('/photos/chicken-adobo.webp', '/')).toBe('/photos/chicken-adobo.webp')
    expect(photoSrc('/photos/chicken-adobo.webp', './')).toBe('./photos/chicken-adobo.webp')
  })

  it('leaves full links alone', () => {
    expect(photoSrc('https://example.com/a.jpg', './')).toBe('https://example.com/a.jpg')
  })
})

describe('coverRecipe', () => {
  it("picks the cuisine's best-rated recipe that has a photo", () => {
    const loved = makeRecipe({ id: 'loved', cuisineId: 'korean', ratings: [{ id: 'r', recipeId: 'loved', score: 5, comment: '', createdAt: '2026-02-02T00:00:00.000Z' }] })
    const pictured = makeRecipe({ id: 'pictured', cuisineId: 'korean', imageUrl: '/photos/bibimbap.webp' })
    const other = makeRecipe({ id: 'other', cuisineId: 'japanese', imageUrl: '/photos/miso-soup.webp' })
    expect(coverRecipe([loved, pictured, other], 'korean')?.id).toBe('pictured')
    expect(coverRecipe([loved], 'korean')).toBeUndefined()
  })
})

describe('findStepTimers', () => {
  it('finds minutes, hours and seconds', () => {
    expect(findStepTimers('Simmer for 15 minutes, then rest 30 seconds.')).toEqual([
      { label: '15 minutes', seconds: 900 },
      { label: '30 seconds', seconds: 30 },
    ])
    expect(findStepTimers('Braise for 1 hour.')).toEqual([{ label: '1 hour', seconds: 3600 }])
    expect(findStepTimers('Bake 1.5 hrs')).toEqual([{ label: '1.5 hrs', seconds: 5400 }])
  })

  it('starts a range at its lower bound', () => {
    expect(findStepTimers('Fry 3 to 4 minutes per side.')).toEqual([{ label: '3 to 4 minutes', seconds: 180 }])
    expect(findStepTimers('Cook 5–7 min')).toEqual([{ label: '5–7 min', seconds: 300 }])
  })

  it('skips long waits and steps without a time', () => {
    expect(findStepTimers('Marinate for 10 to 12 hours.')).toEqual([])
    expect(findStepTimers('Season to taste with 2 tablespoons fish sauce.')).toEqual([])
  })
})

describe('formatCountdown', () => {
  it('pads seconds and adds hours when needed', () => {
    expect(formatCountdown(245)).toBe('4:05')
    expect(formatCountdown(3723)).toBe('1:02:03')
    expect(formatCountdown(0.2)).toBe('0:01')
    expect(formatCountdown(-5)).toBe('0:00')
  })
})

describe('ingredientsInStep', () => {
  it('lists the ingredients a step names, in recipe order', () => {
    const ingredients = [
      { name: 'soy sauce', quantity: 1, unit: 'cup' },
      { name: 'garlic, crushed', quantity: 6, unit: 'cloves' },
      { name: 'water', quantity: 1, unit: 'cup' },
    ]
    expect(ingredientsInStep('Add the garlic and soy sauce.', ingredients).map((i) => i.name)).toEqual([
      'soy sauce',
      'garlic, crushed',
    ])
  })
})

describe('formatAmount', () => {
  it('scales and formats the quantity with its unit', () => {
    expect(formatAmount({ quantity: 0.5, unit: 'cup' }, 4, 4)).toBe('½ cup')
    expect(formatAmount({ quantity: 3, unit: '' }, 4, 4)).toBe('3')
  })

  it('makes the unit agree with the amount', () => {
    expect(formatAmount({ quantity: 0.5, unit: 'cup' }, 4, 12)).toBe('1½ cups')
    expect(formatAmount({ quantity: 2, unit: 'cups' }, 4, 2)).toBe('1 cup')
    expect(formatAmount({ quantity: 1, unit: 'piece' }, 1, 3)).toBe('3 pieces')
    expect(formatAmount({ quantity: 2, unit: 'liters' }, 4, 2)).toBe('1 liter')
  })

  it('rounds to amounts a cook can measure', () => {
    expect(formatAmount({ quantity: 0.33, unit: 'cup' }, 4, 12)).toBe('1 cup') // not 0.99
    expect(formatAmount({ quantity: 2, unit: 'tsp' }, 20, 4.5)).toBe('½ tsp') // not 0.45
    expect(formatAmount({ quantity: 12, unit: 'slices' }, 4, 5)).toBe('15 slices')
    expect(formatAmount({ quantity: 150, unit: 'g' }, 4, 1)).toBe('40 g') // not 37.5
    expect(formatAmount({ quantity: 0.25, unit: 'tsp' }, 4, 1)).toBe('⅛ tsp') // the smallest measure
  })

  it('moves to a bigger unit instead of piling up small ones', () => {
    expect(formatAmount({ quantity: 1, unit: 'tsp' }, 2, 6)).toBe('1 tbsp')
    expect(formatAmount({ quantity: 4, unit: 'tbsp' }, 4, 8)).toBe('½ cup')
    expect(formatAmount({ quantity: 400, unit: 'g' }, 4, 12)).toBe('1.2 kg')
  })

  it('moves to a smaller unit for small amounts', () => {
    expect(formatAmount({ quantity: 0.25, unit: 'cup' }, 4, 1)).toBe('1 tbsp') // not ⅛ cup
    expect(formatAmount({ quantity: 2, unit: 'tbsp' }, 6, 2)).toBe('2 tsp') // not ⅔ tbsp
    expect(formatAmount({ quantity: 1, unit: 'kg' }, 4, 1)).toBe('250 g') // not ¼ kg
    expect(formatAmount({ quantity: 1.5, unit: 'l' }, 4, 1)).toBe('380 ml')
  })

  it('only steps up when the bigger unit reads cleanly', () => {
    expect(formatAmount({ quantity: 1, unit: 'tsp' }, 1, 4)).toBe('4 tsp') // not 1⅓ tbsp
    expect(formatAmount({ quantity: 2, unit: 'tbsp' }, 4, 20)).toBe('10 tbsp') // not ⅝ cup
  })

  it('writes metric amounts as decimals', () => {
    expect(formatAmount({ quantity: 1.5, unit: 'l' }, 4, 12)).toBe('4.5 l')
  })

  it('keeps a unit-only amount and leaves out a missing one', () => {
    expect(formatAmount({ unit: 'to taste' }, 4, 8)).toBe('to taste')
    expect(formatAmount({ unit: '' }, 4, 8)).toBe('')
  })
})

describe('formatIngredient', () => {
  const scaled = (quantity: number, name: string, from: number, to: number) =>
    formatIngredient({ quantity, unit: '', name }, from, to)

  it('makes a counted ingredient agree with its count', () => {
    expect(scaled(1, 'onion, quartered', 4, 24)).toEqual({ amount: '6', name: 'onions, quartered' })
    expect(scaled(2, 'eggs', 4, 2)).toEqual({ amount: '1', name: 'egg' })
    expect(scaled(3, 'bay leaves', 6, 2)).toEqual({ amount: '1', name: 'bay leaf' })
    expect(scaled(4, "bird's eye chilies", 4, 1)).toEqual({ amount: '1', name: "bird's eye chili" })
    expect(scaled(1, 'radish, sliced', 1, 2)).toEqual({ amount: '2', name: 'radishes, sliced' })
  })

  it('counts in halves below two and whole items above', () => {
    expect(scaled(3, 'eggs', 4, 2)).toEqual({ amount: '1½', name: 'eggs' })
    expect(scaled(3, 'eggs', 4, 1)).toEqual({ amount: '1', name: 'egg' }) // 0.75 → 1
    expect(scaled(6, 'eggs', 4, 5)).toEqual({ amount: '8', name: 'eggs' }) // 7.5 → 8
  })

  it('leaves words without a plural, and measured ingredients, alone', () => {
    expect(scaled(6, 'okra', 4, 8)).toEqual({ amount: '12', name: 'okra' })
    expect(scaled(2, 'bok choy, chopped', 2, 1)).toEqual({ amount: '1', name: 'bok choy, chopped' })
    expect(formatIngredient({ quantity: 2, unit: 'cups', name: 'eggs' }, 2, 1)).toEqual({ amount: '1 cup', name: 'eggs' })
  })
})
