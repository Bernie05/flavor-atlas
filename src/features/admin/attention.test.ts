import { describe, expect, it } from 'vitest'
import type { RecipeWithRatings } from '@/features/recipes/schema'
import { findAttention } from './attention'

const rating = (score: number) => ({ id: `r${score}`, recipeId: 'x', score, comment: '', createdAt: '2026-01-01T00:00:00.000Z' })
const recipe = (id: string, title: string, extra: Partial<RecipeWithRatings> = {}) =>
  ({
    id,
    title,
    cuisineId: 'filipino',
    dishId: 'adobo',
    regionId: '',
    variantNote: '',
    description: 'A good one.',
    imageUrl: '/photos/x.webp',
    imageCredit: 'Photo: A, CC BY 4.0',
    ratings: [rating(5)],
    ...extra,
  }) as RecipeWithRatings

const cuisines = [
  { id: 'filipino', name: 'Filipino' },
  { id: 'thai', name: 'Thai' },
]
const dishes = [
  { id: 'adobo', name: 'Adobo', cuisineId: 'filipino' },
  { id: 'sisig', name: 'Sisig', cuisineId: 'filipino' },
]

describe('findAttention', () => {
  it('finds each kind of problem, with a link to fix it, most important first', () => {
    const recipes = [
      recipe('1', 'Uncredited', { imageCredit: '' }),
      recipe('2', 'Regional', { regionId: 'batangas' }),
      recipe('3', 'Plain', { imageUrl: '', imageCredit: '', description: ' ' }),
      recipe('4', 'Disliked', { ratings: [rating(2), rating(1)] }),
      recipe('5', 'Unrated', { ratings: [] }),
    ]
    const groups = findAttention({ cuisines, dishes, recipes })
    expect(groups.map((g) => [g.kind, g.items.map((i) => i.label)])).toEqual([
      ['photo-credit', ['Uncredited']],
      ['empty-cuisine', ['Thai']],
      ['regional-note', ['Regional']],
      ['no-photo', ['Plain']],
      ['no-description', ['Plain']],
      ['empty-dish', ['Sisig']],
      ['low-rating', ['Disliked']],
      ['unrated', ['Unrated']],
    ])
    const find = (kind: string) => groups.find((g) => g.kind === kind)!.items[0]!
    expect(find('photo-credit')).toMatchObject({ to: '/admin/recipes/1/edit', action: 'Edit', detail: 'Filipino' })
    expect(find('empty-cuisine')).toMatchObject({ to: '/admin/recipes/new?cuisine=thai', action: 'Add recipe' })
    expect(find('empty-dish')).toMatchObject({ to: '/admin/recipes/new?dish=sisig', detail: 'Filipino' })
    expect(find('low-rating')).toMatchObject({ to: '/admin/reviews?recipe=4', action: 'Read reviews', detail: '1.5 stars from 2 reviews' })
    expect(find('unrated')).toMatchObject({ to: '/admin/reviews?recipe=5', action: 'Add review' })
  })

  it('says nothing when all is well', () => {
    expect(findAttention({ cuisines: cuisines.slice(0, 1), dishes: dishes.slice(0, 1), recipes: [recipe('1', 'Fine')] })).toEqual([])
  })

  it('does not count a photo-less recipe as missing a credit', () => {
    const groups = findAttention({ cuisines, dishes, recipes: [recipe('1', 'No photo', { imageUrl: '', imageCredit: '' })] })
    expect(groups.some((g) => g.kind === 'photo-credit')).toBe(false)
  })
})
