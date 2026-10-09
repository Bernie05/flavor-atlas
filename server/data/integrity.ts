/**
 * Data rules json-server doesn't know. Deleting a record makes json-server set
 * every reference to it to null (a recipe's `cuisineId: null`), and a recipe in
 * that shape fails validation and breaks the recipe list for every visitor. So
 * a cuisine, dish or region can't be deleted while a recipe still uses it.
 * The app checks this first to explain it; this is the protection.
 */

/** The collections a recipe points at, and the field it points with. */
const RECIPE_REFERENCES: Record<string, string> = {
  cuisines: 'cuisineId',
  dishes: 'dishId',
  regions: 'regionId',
}

export interface Refusal {
  status: number
  body: { error: string; message: string }
}

/**
 * Whether a request would leave recipes pointing at nothing. `path` is the
 * request path inside /api/data ("/cuisines/thai?_dependent=dishes").
 */
export function checkIntegrity(method: string | undefined, path: string | undefined, data: Record<string, unknown>): Refusal | null {
  if ((method ?? '').toUpperCase() !== 'DELETE' || !path) return null
  const [collection, rawId] = path.split('?')[0]!.split('/').filter(Boolean)
  const field = collection && RECIPE_REFERENCES[collection]
  if (!field || !rawId) return null
  const id = decodeURIComponent(rawId)
  const recipes = Array.isArray(data.recipes) ? (data.recipes as Record<string, unknown>[]) : []
  const using = recipes.filter((recipe) => recipe[field] === id).length
  if (using === 0) return null
  return {
    status: 409,
    body: {
      error: 'conflict',
      message: `${using} ${using === 1 ? 'recipe still uses' : 'recipes still use'} this. Delete or move ${using === 1 ? 'it' : 'them'} first.`,
    },
  }
}
