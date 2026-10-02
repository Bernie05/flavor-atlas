import { describe, expect, it } from 'vitest'
import type { RecipeWithRatings } from '@/features/recipes/schema'
import { countVersions, groupVersions, otherVersions } from './utils'

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
