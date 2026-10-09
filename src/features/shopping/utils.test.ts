import { describe, expect, it } from 'vitest'
import { buildShoppingList, parseShoppingState, toShoppingText } from './utils'

const recipe = (id: string, servings: number, ingredients: { name: string; quantity?: number; unit: string }[]) => ({
  id,
  title: `Recipe ${id}`,
  servings,
  ingredients,
})

const line = (lines: ReturnType<typeof buildShoppingList>, name: string) => lines.filter((l) => l.name.startsWith(name))

describe('buildShoppingList', () => {
  it('adds up the same ingredient across recipes, ignoring how it is prepared', () => {
    const lines = buildShoppingList([
      { recipe: recipe('a', 4, [{ name: 'onion, quartered', quantity: 1, unit: '' }]), people: 4 },
      { recipe: recipe('b', 4, [{ name: 'onions, sliced', quantity: 2, unit: '' }]), people: 4 },
    ])
    expect(lines).toEqual([{ key: 'onion|count', name: 'onions', amount: '3', recipes: ['Recipe a', 'Recipe b'] }])
  })

  it('converts spoons and cups to one unit before adding, without rounding the total away', () => {
    const [soy] = buildShoppingList([
      { recipe: recipe('a', 4, [{ name: 'soy sauce', quantity: 2, unit: 'tbsp' }]), people: 4 },
      { recipe: recipe('b', 4, [{ name: 'soy sauce', quantity: 0.25, unit: 'cup' }]), people: 4 },
    ])
    expect(soy!.amount).toBe('6 tbsp') // ⅜ cup would round to ⅓
    const [vinegar] = buildShoppingList([
      { recipe: recipe('a', 4, [{ name: 'cane vinegar', quantity: 0.5, unit: 'cup' }]), people: 4 },
      { recipe: recipe('b', 4, [{ name: 'cane vinegar', quantity: 4, unit: 'tbsp' }]), people: 4 },
    ])
    expect(vinegar!.amount).toBe('¾ cup')
  })

  it('writes a spoon total past a cup as cups plus tablespoons', () => {
    const [vinegar] = buildShoppingList([
      { recipe: recipe('a', 4, [{ name: 'cane vinegar', quantity: 1, unit: 'cup' }]), people: 4 },
      { recipe: recipe('b', 4, [{ name: 'cane vinegar', quantity: 1, unit: 'tbsp' }]), people: 4 },
    ])
    expect(vinegar!.amount).toBe('1 cup + 1 tbsp') // not 17 tbsp
  })

  it('scales each recipe to the servings chosen for it', () => {
    const [pork] = buildShoppingList([
      { recipe: recipe('a', 4, [{ name: 'pork belly', quantity: 400, unit: 'g' }]), people: 8 },
      { recipe: recipe('b', 2, [{ name: 'pork belly, cubed', quantity: 200, unit: 'g' }]), people: 2 },
    ])
    expect(pork!.amount).toBe('1 kg')
  })

  it('keeps amounts that cannot be added honestly on separate lines', () => {
    const lines = buildShoppingList([
      { recipe: recipe('a', 4, [{ name: 'garlic, crushed', quantity: 1, unit: 'head' }]), people: 4 },
      { recipe: recipe('b', 4, [{ name: 'garlic, minced', quantity: 3, unit: 'cloves' }]), people: 4 },
    ])
    expect(line(lines, 'garlic').map((l) => l.amount)).toEqual(['1 head', '3 cloves'])
  })

  it('adds cups to litres of the same ingredient, in millilitres', () => {
    const [stock] = buildShoppingList([
      { recipe: recipe('a', 4, [{ name: 'chicken stock', quantity: 1, unit: 'cup' }]), people: 4 },
      { recipe: recipe('b', 4, [{ name: 'chicken stock', quantity: 1, unit: 'l' }]), people: 4 },
    ])
    expect(stock).toMatchObject({ key: 'chicken stock|ml', amount: '1.2 l', recipes: ['Recipe b', 'Recipe a'] })
  })

  it('leaves out water, which nobody shops for', () => {
    const lines = buildShoppingList([
      { recipe: recipe('a', 4, [{ name: 'water', quantity: 2, unit: 'cups' }, { name: 'eggs', quantity: 2, unit: '' }]), people: 4 },
    ])
    expect(lines.map((l) => l.name)).toEqual(['eggs'])
  })

  it('lists an ingredient without a quantity once', () => {
    const lines = buildShoppingList([
      { recipe: recipe('a', 4, [{ name: 'salt', unit: 'to taste' }]), people: 4 },
      { recipe: recipe('b', 4, [{ name: 'Salt', unit: 'to taste' }]), people: 4 },
    ])
    expect(lines).toEqual([{ key: 'salt|none', name: 'salt', amount: 'to taste', recipes: ['Recipe a', 'Recipe b'] }])
  })

  it('sorts by name and returns nothing for no recipes', () => {
    const lines = buildShoppingList([
      { recipe: recipe('a', 1, [{ name: 'rice', quantity: 1, unit: 'cup' }, { name: 'eggs', quantity: 2, unit: '' }]), people: 1 },
    ])
    expect(lines.map((l) => l.name)).toEqual(['eggs', 'rice'])
    expect(buildShoppingList([])).toEqual([])
  })
})

describe('toShoppingText', () => {
  it('writes one line per item, ready to paste into a notes app', () => {
    const lines = [
      { key: 'onion|count', name: 'onions', amount: '3', recipes: [] },
      { key: 'salt|none', name: 'salt', amount: 'to taste', recipes: [] },
    ]
    expect(toShoppingText(lines)).toBe('- 3 onions\n- salt, to taste')
  })
})

describe('parseShoppingState', () => {
  it('reads valid settings and falls back to empty ones for anything else', () => {
    const valid = { servings: { '1': 6 }, excluded: ['2'], checked: ['onion|count'] }
    expect(parseShoppingState(JSON.stringify(valid))).toEqual(valid)
    expect(parseShoppingState('{"servings":{"1":500}}')).toEqual({ servings: {}, excluded: [], checked: [] })
    expect(parseShoppingState('nope')).toEqual({ servings: {}, excluded: [], checked: [] })
  })
})
