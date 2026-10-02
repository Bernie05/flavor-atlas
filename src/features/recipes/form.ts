import { z } from 'zod'
import type { Dish } from '@/features/dishes/schema'
import { recipeInputSchema, type Recipe, type RecipeInput } from './schema'

/**
 * The form's shape differs from the API's in one place: steps are objects
 * ({ text }) because React Hook Form's useFieldArray needs objects to track
 * rows. toFormValues / fromFormValues translate at the edges, so the rest
 * of the app only ever sees RecipeInput.
 */
/** dishId value meaning "create a new dish along with this recipe". */
export const NEW_DISH = '__new__'

export const recipeFormSchema = recipeInputSchema
  .extend({
    steps: z
      .array(z.object({ text: z.string().trim().min(1, 'Describe this step') }))
      .min(1, 'Add at least one step'),
    /** Form-only: the name of a dish created together with this recipe. */
    newDishName: z.string().trim().max(60),
  })
  // A rule across two fields: the name is required only when "New dish" is chosen.
  .superRefine((values, ctx) => {
    if (values.dishId === NEW_DISH && values.newDishName.length < 2) {
      ctx.addIssue({ code: 'custom', path: ['newDishName'], message: 'Name the new dish' })
    }
  })

export type RecipeFormValues = z.infer<typeof recipeFormSchema>

export const emptyIngredient = (): RecipeFormValues['ingredients'][number] => ({
  name: '',
  quantity: undefined,
  unit: '',
})

export const emptyStep = (): RecipeFormValues['steps'][number] => ({ text: '' })

/** Form values for editing an existing recipe, or a blank recipe to create. */
export function toFormValues(
  recipe?: Recipe,
  defaults: { cuisineId?: string; dishId?: string } = {},
): RecipeFormValues {
  if (!recipe) {
    return {
      title: '',
      emoji: '',
      cuisineId: defaults.cuisineId ?? '',
      dishId: defaults.dishId ?? '',
      newDishName: '',
      variant: '',
      mainIngredient: '',
      regionId: '',
      variantNote: '',
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
    dishId: recipe.dishId,
    newDishName: '',
    variant: recipe.variant,
    mainIngredient: recipe.mainIngredient,
    regionId: recipe.regionId,
    variantNote: recipe.variantNote,
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

export interface RecipeSubmission {
  input: RecipeInput
  /** Set when the cook chose "New dish": create this dish first, then the recipe in it. */
  newDishName: string | null
}

/** Convert submitted form values into what the API accepts. */
export function fromFormValues({ steps, newDishName, ...values }: RecipeFormValues): RecipeSubmission {
  const isNewDish = values.dishId === NEW_DISH
  return {
    input: { ...values, dishId: isNewDish ? '' : values.dishId, steps: steps.map((step) => step.text) },
    newDishName: isNewDish ? newDishName : null,
  }
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

/**
 * A "new" dish whose name already exists in the cuisine is that dish: file the
 * recipe under it instead of creating a duplicate.
 */
export function reuseExistingDish(submission: RecipeSubmission, dishes: Dish[]): RecipeSubmission {
  const name = submission.newDishName?.toLowerCase()
  if (!name) return submission
  const existing = dishes.find((d) => d.cuisineId === submission.input.cuisineId && d.name.toLowerCase() === name)
  return existing ? { input: { ...submission.input, dishId: existing.id }, newDishName: null } : submission
}
