import type { Cuisine } from '@/features/cuisines/schema'
import type { Dish, Region } from '@/features/dishes/schema'
import { NEW_DISH, type RecipeFormValues } from '@/features/recipes/form'
import type { AiDraft } from './schema'

interface Lookups {
  cuisines: Cuisine[]
  dishes?: Dish[]
  regions?: Region[]
}

/** Turn the form's current values into what the AI gets to see. */
export function toAiDraft(values: RecipeFormValues, { cuisines, dishes = [], regions = [] }: Lookups): AiDraft {
  return {
    title: values.title.trim(),
    cuisineName: cuisines.find((c) => c.id === values.cuisineId)?.name ?? '',
    dishName:
      values.dishId === NEW_DISH ? values.newDishName.trim() : (dishes.find((d) => d.id === values.dishId)?.name ?? ''),
    variant: values.variant.trim(),
    regionName: regions.find((r) => r.id === values.regionId)?.name ?? '',
    servings: Number.isFinite(values.servings) && values.servings > 0 ? values.servings : 4,
    description: values.description.trim(),
    // Drop blank rows the cook hasn't filled in yet.
    ingredients: values.ingredients
      .filter((ingredient) => ingredient.name.trim())
      .map((ingredient) => ({
        name: ingredient.name.trim(),
        unit: ingredient.unit.trim(),
        quantity: Number.isFinite(ingredient.quantity) ? ingredient.quantity : undefined,
      })),
    steps: values.steps.map((step) => step.text.trim()).filter(Boolean),
  }
}
