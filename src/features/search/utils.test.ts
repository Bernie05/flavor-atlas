import { describe, expect, it } from 'vitest'
import type { Cuisine } from '@/features/cuisines/schema'
import type { Dish, Region } from '@/features/dishes/schema'
import type { RecipeWithRatings } from '@/features/recipes/schema'
import { normalize, searchAtlas, searchTerms, suggestedSearches, type SearchSources } from './utils'

const cuisine = (id: string, name: string, origin: string) => ({ id, name, origin, description: '' }) as Cuisine
const dish = (id: string, cuisineId: string, name: string, description = '') => ({ id, cuisineId, name, description }) as Dish
const recipe = (
  id: string,
  title: string,
  dishId: string,
  cuisineId: string,
  ingredients: string[],
  extra: Partial<RecipeWithRatings> = {},
) =>
  ({
    id,
    title,
    dishId,
    cuisineId,
    regionId: '',
    mainIngredient: '',
    description: '',
    ingredients: ingredients.map((name) => ({ name, unit: '' })),
    ...extra,
  }) as RecipeWithRatings

const sources: SearchSources = {
  cuisines: [cuisine('filipino', 'Filipino', 'Manila'), cuisine('vietnamese', 'Vietnamese', 'Hanoi')],
  dishes: [
    dish('adobo', 'filipino', 'Adobo', 'Braised in vinegar and soy sauce'),
    dish('pho', 'vietnamese', 'Phở'),
  ],
  regions: [{ id: 'batangas', cuisineId: 'filipino', name: 'Batangas' } as Region],
  recipes: [
    recipe('1', 'Chicken Adobo', 'adobo', 'filipino', ['Chicken thighs', 'Garlic, crushed', 'Soy sauce']),
    recipe('2', 'Adobong Dilaw', 'adobo', 'filipino', ['Pork belly', 'Turmeric', 'Garlic'], { regionId: 'batangas' }),
    recipe('3', 'Phở Bò', 'pho', 'vietnamese', ['Beef brisket', 'Onions, charred', 'Star anise'], {
      description: 'A clear chicken-free broth.',
    }),
  ],
}

const ids = (query: string) => searchAtlas(query, sources).recipes.map((hit) => hit.recipe.id)

describe('normalize and searchTerms', () => {
  it('drops accents and case, including Vietnamese đ', () => {
    expect(normalize('Phở Bò')).toBe('pho bo')
    expect(normalize('Đậu')).toBe('dau')
  })

  it('splits on spaces and punctuation', () => {
    expect(searchTerms('  Chicken,  garlic! ')).toEqual(['chicken', 'garlic'])
    expect(searchTerms(' , ')).toEqual([])
  })
})

describe('searchAtlas', () => {
  it('finds nothing for an empty query', () => {
    expect(searchAtlas('   ', sources).total).toBe(0)
  })

  it('ignores accents: "pho" finds Phở, its dish and its cuisine stays out', () => {
    const results = searchAtlas('pho', sources)
    expect(results.recipes.map((hit) => hit.recipe.id)).toEqual(['3'])
    expect(results.dishes.map((hit) => hit.dish.id)).toEqual(['pho'])
    expect(results.cuisines).toEqual([])
  })

  it('matches the start of a word, and inside a word from 3 letters', () => {
    expect(ids('chick')).toEqual(['1', '3']) // title first, then the description
    expect(ids('dobo')).toEqual(['2', '1']) // equal scores, so name order
    expect(ids('ob')).toEqual([])
  })

  it('needs every word to match somewhere', () => {
    expect(ids('garlic turmeric')).toEqual(['2'])
    expect(ids('garlic beef')).toEqual([])
  })

  it('ranks a title match above an ingredient match', () => {
    const sourcesWithGarlicTitle = {
      ...sources,
      recipes: [...sources.recipes, recipe('4', 'Garlic Rice', 'adobo', 'filipino', ['Rice'])],
    }
    expect(searchAtlas('garlic', sourcesWithGarlicTitle).recipes.map((hit) => hit.recipe.id)).toEqual(['4', '2', '1'])
  })

  it('says which ingredients matched, but not when the title did', () => {
    const [dilaw] = searchAtlas('turmeric', sources).recipes
    expect(dilaw?.matchedIngredients).toEqual(['turmeric'])
    const [adobo] = searchAtlas('chicken', sources).recipes
    expect(adobo?.matchedIngredients).toEqual([])
  })

  it('forgives a plural: "onions" finds "onion"', () => {
    const plural = { ...sources, recipes: [recipe('5', 'Tortang Talong', 'adobo', 'filipino', ['Onion'])] }
    expect(searchAtlas('onions', plural).recipes).toHaveLength(1)
  })

  it('finds recipes by their region, dish and cuisine', () => {
    expect(ids('batangas')).toEqual(['2'])
    expect(ids('vietnamese')).toEqual(['3'])
    expect(searchAtlas('manila', sources).cuisines.map((c) => c.id)).toEqual(['filipino'])
  })

  it('counts versions on dish hits and skips dishes with no recipes yet', () => {
    const withEmptyDish = { ...sources, dishes: [...sources.dishes, dish('adobo-rice', 'filipino', 'Adobo Rice')] }
    expect(searchAtlas('adobo', withEmptyDish).dishes).toEqual([{ dish: sources.dishes[0], versions: 2 }])
  })
})

describe('suggestedSearches', () => {
  it('offers the dishes with the most versions, then the commonest main ingredients', () => {
    const recipes = [
      { dishId: 'pho', mainIngredient: 'Beef' },
      { dishId: 'adobo', mainIngredient: 'chicken' },
      { dishId: 'adobo', mainIngredient: 'pork' },
      { dishId: 'adobo', mainIngredient: 'Chicken ' },
      { dishId: 'gone', mainIngredient: '' },
    ]
    expect(suggestedSearches(sources.dishes, recipes, { dishCount: 2, ingredientCount: 2 })).toEqual([
      'Adobo',
      'Phở',
      'chicken',
      'beef',
    ])
  })

  it('every suggestion finds something', () => {
    for (const term of suggestedSearches(sources.dishes, sources.recipes)) {
      expect(searchAtlas(term, sources).total).toBeGreaterThan(0)
    }
  })
})
