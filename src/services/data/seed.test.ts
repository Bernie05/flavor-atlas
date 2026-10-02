import { describe, expect, it } from 'vitest'
import seed from '../../../db.seed.json'
import { dbSchema } from './mockDataService'

// The seed is hand-written data with many cross-references. These checks catch
// a typo'd id before it becomes a blank page.
const db = dbSchema.parse(seed)
// Vite lists the files at build time, so the test needs no Node fs types.
const bundledPhotos = new Set(Object.keys(import.meta.glob('../../../public/photos/*')).map((path) => path.replace('../../../public', '')))

describe('db.seed.json', () => {
  const cuisineIds = new Set(db.cuisines.map((c) => c.id))
  const dishes = new Map(db.dishes.map((d) => [d.id, d]))
  const regions = new Map(db.regions.map((r) => [r.id, r]))
  const recipeIds = new Set(db.recipes.map((r) => r.id))

  it('has unique ids in every collection', () => {
    for (const items of [db.cuisines, db.dishes, db.regions, db.recipes, db.ratings]) {
      const ids = items.map((item) => item.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('links every dish and region to a real cuisine', () => {
    for (const item of [...db.dishes, ...db.regions]) expect(cuisineIds).toContain(item.cuisineId)
  })

  it('puts every recipe in a dish of the same cuisine', () => {
    for (const recipe of db.recipes) {
      expect(dishes.get(recipe.dishId)?.cuisineId, recipe.title).toBe(recipe.cuisineId)
    }
  })

  it('gives regional versions a region of the same cuisine and a note', () => {
    for (const recipe of db.recipes.filter((r) => r.regionId)) {
      expect(regions.get(recipe.regionId)?.cuisineId, recipe.title).toBe(recipe.cuisineId)
      expect(recipe.variantNote, recipe.title).not.toBe('')
    }
  })

  it('credits every photo and ships every bundled one', () => {
    for (const recipe of db.recipes.filter((r) => r.imageUrl)) {
      expect(recipe.imageCredit, recipe.title).not.toBe('')
      expect(recipe.imageSourceUrl, recipe.title).not.toBe('')
      if (recipe.imageUrl.startsWith('/photos/')) {
        expect(bundledPhotos, recipe.imageUrl).toContain(recipe.imageUrl)
      }
    }
  })

  it('attaches every rating to a recipe', () => {
    for (const rating of db.ratings) expect(recipeIds).toContain(rating.recipeId)
  })

  it('uses non-numeric dish and region ids (json-server filters treat "8" as a number)', () => {
    for (const id of [...dishes.keys(), ...regions.keys()]) expect(id).toMatch(/[a-z]/)
  })
})
