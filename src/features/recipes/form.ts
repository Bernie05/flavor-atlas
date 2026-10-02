import { z } from 'zod'
import { recipeInputSchema, type Recipe, type RecipeInput } from './schema'

/**
 * The form's shape differs from the API's in one place: steps are objects
 * ({ text }) because React Hook Form's useFieldArray needs objects to track
 * rows. toFormValues / fromFormValues translate at the edges, so the rest
 * of the app only ever sees RecipeInput.
 */
export const recipeFormSchema = recipeInputSchema.extend({
  steps: z
    .array(z.object({ text: z.string().trim().min(1, 'Describe this step') }))
    .min(1, 'Add at least one step'),
})

export type RecipeFormValues = z.infer<typeof recipeFormSchema>

export const emptyIngredient = (): RecipeFormValues['ingredients'][number] => ({
  name: '',
  quantity: undefined,
  unit: '',
})

export const emptyStep = (): RecipeFormValues['steps'][number] => ({ text: '' })

/** Form values for editing an existing recipe, or a blank recipe to create. */
export function toFormValues(recipe?: Recipe, defaults: { cuisineId?: string } = {}): RecipeFormValues {
  if (!recipe) {
    return {
      title: '',
      emoji: '',
      cuisineId: defaults.cuisineId ?? '',
      description: '',
      imageUrl: '',
      prepMinutes: 15,
      cookMinutes: 30,
      servings: 4,
      difficulty: 'easy',
      ingredients: [emptyIngredient()],
      steps: [emptyStep()],
    }
  }

  // Copy input fields explicitly. Spreading the whole recipe would carry
  // id, createdAt and embedded ratings into the form, and then into the PATCH.
  return {
    title: recipe.title,
    emoji: recipe.emoji,
    cuisineId: recipe.cuisineId,
    description: recipe.description,
    imageUrl: recipe.imageUrl,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient })),
    steps: recipe.steps.map((text) => ({ text })),
  }
}

/** Convert submitted form values into what the API accepts. */
export function fromFormValues({ steps, ...values }: RecipeFormValues): RecipeInput {
  return { ...values, steps: steps.map((step) => step.text) }
}

/**
 * Count individual field errors in a React Hook Form errors object, including
 * errors nested in field arrays (ingredients.2.name). Each error is an object
 * with a message; everything else is a container to look inside.
 */
export function countFieldErrors(errors: unknown): number {
  if (typeof errors !== 'object' || errors === null) return 0
  if ('message' in errors && typeof errors.message === 'string') return 1
  return Object.values(errors).reduce<number>((total, value) => total + countFieldErrors(value), 0)
}
