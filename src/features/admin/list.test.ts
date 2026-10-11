import { describe, expect, it } from 'vitest'
import type { RecipeWithRatings } from '@/features/recipes/schema'
import { pageNumbers, paginate, parsePage, sortAdminRecipes } from './list'

const recipe = (title: string, createdAt: string, scores: number[] = []) =>
  ({
    id: title,
    title,
    createdAt,
    ratings: scores.map((score, i) => ({ id: `${title}-${i}`, recipeId: title, score, comment: '', createdAt })),
  }) as unknown as RecipeWithRatings

const adobo = recipe('Adobo', '2026-01-03T00:00:00Z', [5, 4])
const bibimbap = recipe('Bibimbap', '2026-01-01T00:00:00Z', [2])
const congee = recipe('Congee', '2026-01-02T00:00:00Z')
const dumplings = recipe('Dumplings', '2026-01-02T00:00:00Z', [5])
const all = [congee, adobo, dumplings, bibimbap]
const titles = (list: RecipeWithRatings[]) => list.map((r) => r.title)

describe('sortAdminRecipes', () => {
  it('orders by date both ways, breaking ties by name', () => {
    expect(titles(sortAdminRecipes(all, 'newest'))).toEqual(['Adobo', 'Congee', 'Dumplings', 'Bibimbap'])
    expect(titles(sortAdminRecipes(all, 'oldest'))).toEqual(['Bibimbap', 'Congee', 'Dumplings', 'Adobo'])
  })

  it('orders by name', () => {
    expect(titles(sortAdminRecipes(all, 'name'))).toEqual(['Adobo', 'Bibimbap', 'Congee', 'Dumplings'])
  })

  it('orders by rating either way, with unrated recipes last both times', () => {
    expect(titles(sortAdminRecipes(all, 'top-rated'))).toEqual(['Dumplings', 'Adobo', 'Bibimbap', 'Congee'])
    expect(titles(sortAdminRecipes(all, 'lowest-rated'))).toEqual(['Bibimbap', 'Adobo', 'Dumplings', 'Congee'])
  })

  it('never changes the list it was given', () => {
    sortAdminRecipes(all, 'name')
    expect(titles(all)).toEqual(['Congee', 'Adobo', 'Dumplings', 'Bibimbap'])
  })
})

describe('paginate', () => {
  const items = Array.from({ length: 27 }, (_, i) => i + 1)

  it('cuts a page and says where it is', () => {
    expect(paginate(items, 2, 12)).toEqual({ items: items.slice(12, 24), page: 2, pageCount: 3, first: 13, last: 24, total: 27 })
    expect(paginate(items, 3, 12)).toMatchObject({ items: [25, 26, 27], first: 25, last: 27 })
  })

  it('shows the last page for a page past the end (e.g. after deleting), and page 1 for nonsense', () => {
    expect(paginate(items, 9, 12).page).toBe(3)
    expect(paginate(items, 0, 12).page).toBe(1)
    expect(paginate(items, Number.NaN, 12).page).toBe(1)
  })

  it('is one empty page for an empty list', () => {
    expect(paginate([], 1, 12)).toEqual({ items: [], page: 1, pageCount: 1, first: 0, last: 0, total: 0 })
  })
})

describe('parsePage', () => {
  it('accepts whole numbers from 1 and falls back to 1', () => {
    expect(['2', '1', '0', '-3', '1.5', 'two', null].map(parsePage)).toEqual([2, 1, 1, 1, 1, 1, 1])
  })
})

describe('pageNumbers', () => {
  it('lists every page when there are few', () => {
    expect(pageNumbers(2, 3)).toEqual([1, 2, 3])
  })

  it('keeps the ends and the neighbourhood of the current page', () => {
    expect(pageNumbers(5, 20)).toEqual([1, 'gap', 4, 5, 6, 'gap', 20])
    expect(pageNumbers(1, 20)).toEqual([1, 2, 'gap', 20])
    expect(pageNumbers(20, 20)).toEqual([1, 'gap', 19, 20])
    expect(pageNumbers(3, 20)).toEqual([1, 2, 3, 4, 'gap', 20])
  })
})
