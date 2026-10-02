import type { Cuisine } from '@/features/cuisines/schema'
import type { RecipeFormValues } from '@/features/recipes/form'
import type { AiDraft } from './schema'

/** Turn the form's current values into what the AI gets to see. */
export function toAiDraft(values: RecipeFormValues, cuisines: Cuisine[]): AiDraft {
  return {
    title: values.title.trim(),
    cuisineName: cuisines.find((c) => c.id === values.cuisineId)?.name ?? '',
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
