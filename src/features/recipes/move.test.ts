import { describe, expect, it } from 'vitest'
import type { Dish, Region } from '@/features/dishes/schema'
import { planMove } from './move'
import type { RecipeWithRatings } from './schema'

const recipe = (id: string, title: string, dishId: string, cuisineId: string, regionId = '') =>
  ({
    id,
    title,
    dishId,
    cuisineId,
    regionId,
    variantNote: regionId ? 'With turmeric' : '',
    createdAt: '2026-01-01T00:00:00.000Z',
    ratings: [{ id: 'r', recipeId: id, score: 5, comment: '', createdAt: '2026-01-02T00:00:00.000Z' }],
    servings: 4,
  }) as unknown as RecipeWithRatings

const regions: Region[] = [{ id: 'batangas', cuisineId: 'filipino', name: 'Batangas', latitude: 13.76, longitude: 121.06 }]
const adobo: Dish = { id: 'adobo', cuisineId: 'filipino', name: 'Adobo', description: '' }
const humba: Dish = { id: 'humba', cuisineId: 'filipino', name: 'Humba', description: '' }
const ramen: Dish = { id: 'ramen', cuisineId: 'japanese', name: 'Ramen', description: '' }

describe('planMove', () => {
  it('gives each recipe the dish and its cuisine, keeping everything else', () => {
    const plan = planMove([recipe('1', 'Chicken Adobo', 'adobo', 'filipino')], humba, regions)
    expect(plan.updates).toHaveLength(1)
    const { input } = plan.updates[0]!
    expect(input).toMatchObject({ title: 'Chicken Adobo', dishId: 'humba', cuisineId: 'filipino', servings: 4 })
    // A recipe input, not a stored record: no id, date or ratings.
    expect(input).not.toHaveProperty('id')
    expect(input).not.toHaveProperty('createdAt')
    expect(input).not.toHaveProperty('ratings')
  })

  it('keeps a region of the same cuisine, and clears one that no longer fits, saying so', () => {
    const regional = recipe('2', 'Adobong Dilaw', 'adobo', 'filipino', 'batangas')
    expect(planMove([regional], humba, regions).updates[0]!.input.regionId).toBe('batangas')
    const plan = planMove([regional], ramen, regions)
    expect(plan.updates[0]!.input).toMatchObject({ regionId: '', cuisineId: 'japanese', variantNote: 'With turmeric' })
    expect(plan.losesRegion).toEqual([{ title: 'Adobong Dilaw', region: 'Batangas' }])
  })

  it('leaves recipes already in the target dish alone', () => {
    const plan = planMove([recipe('1', 'Chicken Adobo', 'adobo', 'filipino')], adobo, regions)
    expect(plan).toEqual({ updates: [], losesRegion: [], unchanged: ['Chicken Adobo'] })
  })
})
