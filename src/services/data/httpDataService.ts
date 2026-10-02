import { z } from 'zod'
import { cuisineSchema } from '@/features/cuisines/schema'
import { recipeWithRatingsSchema } from '@/features/recipes/schema'
import { config } from '@/lib/config'
import type { DataService } from './DataService'
import { ApiError, NotFoundError } from './errors'

/**
 * GET a path from json-server and validate the response with a Zod schema.
 * Parsing at the boundary means the rest of the app can trust the types:
 * if the server sends something unexpected, it fails here, loudly.
 */
async function getJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(`${config.apiUrl}${path}`)

  if (response.status === 404) {
    throw new NotFoundError("We couldn't find what you were looking for.")
  }
  if (!response.ok) {
    throw new ApiError(response.status, `The recipe server responded with error ${response.status}.`)
  }
  return schema.parse(await response.json())
}

export const httpDataService: DataService = {
  listCuisines() {
    return getJson('/cuisines', z.array(cuisineSchema))
  },

  getCuisine(id) {
    return getJson(`/cuisines/${encodeURIComponent(id)}`, cuisineSchema)
  },

  listRecipes(filters = {}) {
    const params = new URLSearchParams({ _embed: 'ratings' })
    if (filters.cuisineId) params.set('cuisineId', filters.cuisineId)
    return getJson(`/recipes?${params}`, z.array(recipeWithRatingsSchema))
  },

  getRecipe(id) {
    return getJson(`/recipes/${encodeURIComponent(id)}?_embed=ratings`, recipeWithRatingsSchema)
  },
}
