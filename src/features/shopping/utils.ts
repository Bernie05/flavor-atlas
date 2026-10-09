import type { Recipe } from '@/features/recipes/schema'
import { formatIngredient, ingredientBaseName, scaleQuantity, singularUnit } from '@/features/recipes/utils'
import { EMPTY_SHOPPING_STATE, shoppingStateSchema, type ShoppingState } from './schema'

/** One thing to buy: everything the chosen recipes need of one ingredient, in one kind of unit. */
export interface ShoppingLine {
  /** Stable across servings changes, so a ticked line stays ticked: "onion|count". */
  key: string
  name: string
  amount: string
  /** Titles of the recipes that use it. */
  recipes: string[]
}

export interface ShoppingEntry {
  recipe: Pick<Recipe, 'id' | 'title' | 'servings' | 'ingredients'>
  /** How many the cook is making it for. */
  people: number
}

/**
 * Amounts can only be added within a group of units that convert into each
 * other. Each unit maps to its group and how many base units it holds:
 * spoons and cups in teaspoons, metric volume in ml, weight in grams.
 * "1 head" and "3 cloves" of garlic stay on separate lines rather than
 * being added into a total that would be wrong.
 */
function unitGroup(unit: string): { group: string; perBase: number } {
  const u = unit.trim().toLowerCase()
  const groups: Record<string, [group: string, perBase: number]> = {
    tsp: ['spoon', 1],
    tbsp: ['spoon', 3],
    cup: ['spoon', 48],
    cups: ['spoon', 48],
    ml: ['ml', 1],
    l: ['ml', 1000],
    liter: ['ml', 1000],
    liters: ['ml', 1000],
    g: ['g', 1],
    kg: ['g', 1000],
    '': ['count', 1],
    whole: ['count', 1],
  }
  const known = groups[u]
  return known ? { group: known[0], perBase: known[1] } : { group: `unit:${singularUnit(u)}`, perBase: 1 }
}

/** Things a recipe calls for that nobody shops for. */
export const NOT_BOUGHT = new Set(['water'])

/** US teaspoons to millilitres, for adding cups to litres of the same thing. */
const ML_PER_TSP = 4.929

const isWhole = (value: number, step: number) => Math.abs(Math.round(value / step) * step - value) < 0.01

/**
 * A total back in the unit a cook would buy or measure it in. Spoons become
 * cups only on a clean quarter or third of a cup, so 6 tbsp isn't rounded to
 * "⅓ cup"; formatIngredient does the rest (grams to kilos, plurals).
 */
function fromBase(group: string, total: number): { quantity: number; unit: string } {
  switch (group) {
    case 'spoon':
      if (total >= 12 && (isWhole(total / 48, 0.25) || isWhole(total / 48, 1 / 3))) return { quantity: total / 48, unit: 'cup' }
      return total >= 3 ? { quantity: total / 3, unit: 'tbsp' } : { quantity: total, unit: 'tsp' }
    case 'ml':
      return { quantity: total, unit: 'ml' }
    case 'g':
      return { quantity: total, unit: 'g' }
    case 'count':
      return { quantity: total, unit: '' }
    default:
      return { quantity: total, unit: group.slice('unit:'.length) }
  }
}

/**
 * One shopping list from several recipes, each scaled to its own servings:
 * the same ingredient is added up across recipes ("onion, quartered" and
 * "onions, sliced" are both onions), in units a cook can buy, sorted by name.
 */
export function buildShoppingList(entries: ShoppingEntry[]): ShoppingLine[] {
  const lines = new Map<string, { name: string; group: string; total: number; units: Set<string>; recipes: Set<string> }>()

  for (const { recipe, people } of entries) {
    for (const ingredient of recipe.ingredients) {
      if (NOT_BOUGHT.has(ingredientBaseName(ingredient.name))) continue
      const { group, perBase } = ingredient.quantity === undefined ? { group: 'none', perBase: 0 } : unitGroup(ingredient.unit)
      const key = `${ingredientBaseName(ingredient.name)}|${group}`
      const line = lines.get(key) ?? {
        name: ingredient.name.split(',')[0]!.trim(),
        group,
        total: 0,
        units: new Set<string>(),
        recipes: new Set<string>(),
      }
      if (ingredient.quantity !== undefined) {
        line.total += scaleQuantity(ingredient.quantity, recipe.servings, people) * perBase
      } else if (ingredient.unit) {
        line.units.add(ingredient.unit) // "to taste"
      }
      line.recipes.add(recipe.title)
      lines.set(key, line)
    }
  }

  // Spoons and millilitres convert exactly, so the same ingredient in both becomes one line in ml.
  for (const [key, line] of lines) {
    if (line.group !== 'spoon') continue
    const metricKey = key.replace(/\|spoon$/, '|ml')
    const metric = lines.get(metricKey)
    if (!metric) continue
    metric.total += line.total * ML_PER_TSP
    line.recipes.forEach((title) => metric.recipes.add(title))
    lines.delete(key)
  }

  return [...lines]
    .map(([key, line]): ShoppingLine => {
      if (line.group === 'none') return { key, name: line.name, amount: [...line.units].join(', '), recipes: [...line.recipes] }
      // Past a cup, an uneven spoon total reads best as cups plus tablespoons: "1 cup + 1 tbsp", not "17 tbsp".
      const cups = Math.floor(line.total / 48)
      const restTbsp = Math.round((line.total - cups * 48) / 3)
      if (line.group === 'spoon' && cups >= 1 && fromBase('spoon', line.total).unit !== 'cup' && restTbsp > 0 && restTbsp < 16) {
        const cupPart = formatIngredient({ quantity: cups, unit: 'cup', name: line.name }, 1, 1).amount
        return { key, name: line.name, amount: `${cupPart} + ${restTbsp} tbsp`, recipes: [...line.recipes] }
      }
      const { amount, name } = formatIngredient({ ...fromBase(line.group, line.total), name: line.name }, 1, 1)
      return { key, name, amount, recipes: [...line.recipes] }
    })
    .toSorted((a, b) => a.name.localeCompare(b.name))
}

/** The list as plain text, one item per line, for pasting into a notes or messages app. */
export function toShoppingText(lines: ShoppingLine[]): string {
  return lines
    .map(({ name, amount }) => {
      if (!amount) return `- ${name}`
      // "to taste" reads after the name; a measured amount reads before it.
      return /^[\d⅛¼⅓½⅔¾]/.test(amount) ? `- ${amount} ${name}` : `- ${name}, ${amount}`
    })
    .join('\n')
}

/** Read the stored settings; anything missing or invalid starts from an empty list. */
export function parseShoppingState(raw: string | null): ShoppingState {
  if (!raw) return EMPTY_SHOPPING_STATE
  try {
    const parsed = shoppingStateSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : EMPTY_SHOPPING_STATE
  } catch {
    return EMPTY_SHOPPING_STATE
  }
}

/** Tick a line off, or back on. */
export const toggleChecked = (state: ShoppingState, key: string): ShoppingState => ({
  ...state,
  checked: state.checked.includes(key) ? state.checked.filter((k) => k !== key) : [...state.checked, key],
})
