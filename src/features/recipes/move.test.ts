import { describe, expect, it } from 'vitest'
import type { Dish, Region } from '@/features/dishes/schema'
import { canUndo, findRestoredDish, mergeTargets, planMerge, planMove, restoreRecipes, UNDO_WINDOW_MS, undoMerge, undoMove, undoneMessage } from './move'
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

describe('mergeTargets', () => {
  it('offers the other dishes of the same cuisine, by name', () => {
    const pancit: Dish = { id: 'pancit', cuisineId: 'filipino', name: 'Pancit', description: '' }
    expect(mergeTargets(humba, [humba, ramen, pancit, adobo]).map((dish) => dish.id)).toEqual(['adobo', 'pancit'])
  })
})

describe('planMerge', () => {
  it("moves only the source dish's versions, keeping their regions", () => {
    const recipes = [
      recipe('1', 'Chicken Adobo', 'adobo', 'filipino'),
      recipe('2', 'Adobong Dilaw', 'adobo', 'filipino', 'batangas'),
      recipe('3', 'Humba', 'humba', 'filipino'),
    ]
    const plan = planMerge(adobo, humba, recipes, regions)
    expect(plan.source).toBe(adobo)
    expect(plan.moves.updates.map((update) => update.id)).toEqual(['1', '2'])
    expect(plan.moves.updates[1]!.input).toMatchObject({ dishId: 'humba', regionId: 'batangas' })
    expect(plan.moves.losesRegion).toEqual([])
  })

  it('plans just the delete for a dish with no versions', () => {
    expect(planMerge(adobo, humba, [], regions).moves.updates).toEqual([])
  })

  it('has the target remember the source and whatever was merged into it before', () => {
    const merged = { ...adobo, mergedFrom: [{ id: 'old-adobo', name: 'Adobo (old)' }] }
    const target = { ...humba, mergedFrom: [{ id: 'pork-humba', name: 'Pork Humba' }] }
    expect(planMerge(merged, target, [], regions).mergedFrom).toEqual([
      { id: 'pork-humba', name: 'Pork Humba' },
      { id: 'adobo', name: 'Adobo' },
      { id: 'old-adobo', name: 'Adobo (old)' },
    ])
  })

  it('refuses dishes of different cuisines', () => {
    expect(() => planMerge(adobo, ramen, [], regions)).toThrow()
  })
})

describe('undo', () => {
  const regional = recipe('2', 'Adobong Dilaw', 'adobo', 'filipino', 'batangas')

  it('remembers each recipe as it was, so a move across cuisines comes back whole (region too)', () => {
    const plan = planMove([regional], ramen, regions)
    const [restored] = restoreRecipes(undoMove(plan, 0).recipes)
    expect(restored).toMatchObject({ id: '2', input: { dishId: 'adobo', cuisineId: 'filipino', regionId: 'batangas' } })
  })

  it('points restored recipes at a recreated dish when given its new id', () => {
    const plan = planMerge(adobo, humba, [regional], regions)
    expect(restoreRecipes(plan.moves.updates, 'adobo-2')[0]!.input.dishId).toBe('adobo-2')
  })

  it('is offered only for a while', () => {
    const undo = undoMove(planMove([regional], humba, regions), 1000)
    expect(canUndo(undo, 1000 + UNDO_WINDOW_MS - 1)).toBe(true)
    expect(canUndo(undo, 1000 + UNDO_WINDOW_MS)).toBe(false)
  })
})

describe('undoneMessage', () => {
  it('says what came back', () => {
    const one = recipe('1', 'Chicken Adobo', 'adobo', 'filipino')
    const two = recipe('2', 'Adobong Dilaw', 'adobo', 'filipino')
    expect(undoneMessage(undoMove(planMove([one], humba, regions), 0))).toBe('Undone: Chicken Adobo is back where it was.')
    expect(undoneMessage(undoMove(planMove([one, two], humba, regions), 0))).toBe('Undone: 2 recipes are back where they were.')
    expect(undoneMessage(undoMerge(planMerge(adobo, humba, [one, two], regions), 0))).toBe('Undone: Adobo is back, with its 2 versions.')
    expect(undoneMessage(undoMerge(planMerge(adobo, humba, [], regions), 0))).toBe('Undone: Adobo is back.')
  })
})

describe('findRestoredDish', () => {
  it('finds the copy an unfinished undo created, but never the dish it was merged into', () => {
    const undo = undoMerge(planMerge(adobo, humba, [], regions), 0)
    const target = { ...humba, mergedFrom: [{ id: 'adobo', name: 'Adobo' }] }
    const copy = { ...adobo, id: 'adobo-2', mergedFrom: [{ id: 'adobo', name: 'Adobo' }] }
    expect(findRestoredDish([target], undo)).toBeUndefined()
    expect(findRestoredDish([target, copy], undo)).toBe(copy)
  })
})
