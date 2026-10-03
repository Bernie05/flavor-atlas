import { describe, expect, it } from 'vitest'
import { NEW_DISH, toFormValues } from '@/features/recipes/form'
import { toAiDraft } from './draft'
import { buildPrompt } from './prompts'
import { aiRequestSchema, aiSuggestionSchemas, type AiDraft } from './schema'

const draft: AiDraft = {
  title: 'Sinigang na Hipon',
  cuisineName: 'Filipino',
  dishName: 'Sinigang',
  variant: 'na Hipon',
  regionName: '',
  servings: 4,
  description: '',
  ingredients: [
    { name: 'shrimp', quantity: 500, unit: 'g' },
    { name: 'tamarind soup base', quantity: 0.5, unit: 'packet' },
  ],
  steps: [],
}

describe('buildPrompt', () => {
  it('puts the draft inside tags and asks for the task JSON shape', () => {
    const prompt = buildPrompt('description', draft)
    expect(prompt).toContain('<draft>\nTitle: Sinigang na Hipon')
    expect(prompt).toContain('- ½ packet tamarind soup base')
    expect(prompt).toContain('{"description": "..."}')
    expect(prompt).toContain('Dish: Sinigang (version: na Hipon)')
    expect(prompt).not.toContain('Regional version')
  })

  it('asks to write steps from scratch or rewrite existing ones', () => {
    expect(buildPrompt('steps', draft)).toContain('write the cooking steps')
    expect(buildPrompt('steps', { ...draft, steps: ['boil shrimp'] })).toContain('rewrite the steps')
  })
})

describe('toAiDraft', () => {
  it('drops blank rows and resolves the cuisine name', () => {
    const values = toFormValues(undefined, { cuisineId: 'filipino' })
    values.title = '  Halo-Halo '
    values.servings = Number.NaN
    const result = toAiDraft(values, {
      cuisines: [
        { id: 'filipino', name: 'Filipino', emoji: '🥭', countryCode: 'ph', description: '', origin: 'Manila', latitude: 14.6, longitude: 120.98 },
      ],
    })
    expect(result).toMatchObject({ title: 'Halo-Halo', cuisineName: 'Filipino', servings: 4, ingredients: [], steps: [] })
  })

  it('names the dish, a new dish and the region', () => {
    const values = toFormValues(undefined, { cuisineId: 'filipino', dishId: 'adobo' })
    values.variant = ' Dilaw '
    values.regionId = 'batangas'
    const lookups = {
      cuisines: [],
      dishes: [{ id: 'adobo', cuisineId: 'filipino', name: 'Adobo', description: '' }],
      regions: [{ id: 'batangas', cuisineId: 'filipino', name: 'Batangas', latitude: 13.8, longitude: 121.1 }],
    }
    expect(toAiDraft(values, lookups)).toMatchObject({ dishName: 'Adobo', variant: 'Dilaw', regionName: 'Batangas' })
    values.dishId = NEW_DISH
    values.newDishName = ' Kinilaw '
    expect(toAiDraft(values, lookups).dishName).toBe('Kinilaw')
  })
})

describe('aiRequestSchema', () => {
  it('rejects a draft without a title, with a message the form can show', () => {
    const result = aiRequestSchema.safeParse({ task: 'description', draft: { ...draft, title: '' } })
    expect(result.error?.issues[0]?.message).toBe('Give the recipe a name first')
  })
})

describe('aiSuggestionSchemas', () => {
  it('turns null quantities into undefined and trims steps', () => {
    const ingredients = aiSuggestionSchemas.ingredients.parse({
      ingredients: [{ name: 'salt', quantity: null, unit: '' }],
    })
    expect(ingredients.ingredients[0]).toEqual({ name: 'salt', quantity: undefined, unit: '' })
    expect(aiSuggestionSchemas.steps.parse({ steps: ['  Boil water. '] }).steps).toEqual(['Boil water.'])
  })

  it('rejects output that breaks recipe rules', () => {
    expect(aiSuggestionSchemas.steps.safeParse({ steps: [] }).success).toBe(false)
    expect(aiSuggestionSchemas.description.safeParse({ description: 'x'.repeat(600) }).success).toBe(false)
    expect(aiSuggestionSchemas.ingredients.safeParse({ ingredients: [{ name: '', quantity: 1, unit: 'g' }] }).success).toBe(false)
  })
})
