import { describe, expect, it } from 'vitest'
import type { RecipeWithRatings } from '@/features/recipes/schema'
import { compareVersions, countVersions, findMergedInto, groupVersions, ingredientKey, otherVersions } from './utils'

const recipe = (id: string, title: string, dishId: string, regionId = '') =>
  ({ id, title, dishId, regionId }) as RecipeWithRatings

const classic = recipe('1', 'Chicken Adobo', 'adobo')
const dilaw = recipe('2', 'Adobong Dilaw', 'adobo', 'batangas')
const gata = recipe('3', 'Adobo sa Gata', 'adobo', 'bicol')
const sinigang = recipe('4', 'Sinigang na Baboy', 'sinigang')

describe('groupVersions', () => {
  it('splits everyday from regional versions, sorted by name', () => {
    const groups = groupVersions([dilaw, classic, gata])
    expect(groups.everyday.map((r) => r.id)).toEqual(['1'])
    expect(groups.regional.map((r) => r.id)).toEqual(['3', '2'])
  })
})

describe('otherVersions', () => {
  it('returns the rest of the same dish only', () => {
    expect(otherVersions(classic, [classic, dilaw, gata, sinigang]).map((r) => r.id)).toEqual(['2', '3'])
  })
})

describe('countVersions', () => {
  it('counts recipes per dish', () => {
    expect(Object.fromEntries(countVersions([classic, dilaw, gata, sinigang]))).toEqual({ adobo: 3, sinigang: 1 })
  })
})

describe('compareVersions', () => {
  const version = (title: string, names: string[]) => ({ title, ingredients: names.map((name) => ({ name })) })

  it('finds shared ingredients, what each version adds and what it leaves out', () => {
    const baboy = version('Baboy', ['pork belly', 'Tamarind soup base', 'tomatoes, quartered', 'onion'])
    const hipon = version('Hipon', ['shrimp', 'tamarind soup base', 'Tomatoes', 'okra'])
    const bayabas = version('Bayabas', ['ripe guavas', 'tomatoes', 'onion'])
    const result = compareVersions([baboy, hipon, bayabas])

    expect(result.shared).toEqual(['tomatoes'])
    expect(result.versions.map((v) => [v.recipe.title, v.only, v.without])).toEqual([
      ['Baboy', ['pork belly'], []],
      ['Hipon', ['shrimp', 'okra'], ['onion']],
      ['Bayabas', ['ripe guavas'], ['Tamarind soup base']],
    ])
  })

  it('ignores water and salt', () => {
    const result = compareVersions([version('A', ['water', 'salt', 'rice']), version('B', ['rice'])])
    expect(result.shared).toEqual(['rice'])
    expect(result.versions.every((v) => v.only.length === 0 && v.without.length === 0)).toBe(true)
  })

  it('compares nothing with fewer than two versions', () => {
    expect(compareVersions([version('Solo', ['rice'])])).toEqual({ shared: [], versions: [] })
  })
})

describe('ingredientKey', () => {
  it('drops preparation notes and case', () => {
    expect(ingredientKey('Garlic, crushed')).toBe('garlic')
  })
})

describe('findMergedInto', () => {
  const humba = { id: 'humba', cuisineId: 'filipino', name: 'Humba', description: '', mergedFrom: [{ id: 'adobo', name: 'Adobo' }] }
  const pancit = { id: 'pancit', cuisineId: 'filipino', name: 'Pancit', description: '' }

  it('finds the dish an old id was merged into, with its old name', () => {
    expect(findMergedInto([pancit, humba], 'adobo')).toEqual({ dish: humba, oldName: 'Adobo' })
  })

  it('finds nothing for an id that was never merged', () => {
    expect(findMergedInto([pancit, humba], 'ramen')).toBeUndefined()
  })
})
