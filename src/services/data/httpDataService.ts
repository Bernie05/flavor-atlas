import { z } from 'zod'
import { cuisineSchema } from '@/features/cuisines/schema'
import { recipeSchema, recipeWithRatingsSchema } from '@/features/recipes/schema'
import { config } from '@/lib/config'
import type { DataService } from './DataService'
import { ApiError, NotFoundError } from './errors'

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

/** Send a request to json-server and turn HTTP failures into typed errors. */
async function request(method: Method, path: string, body?: unknown): Promise<Response> {
  const response = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 404) {
    throw new NotFoundError("We couldn't find what you were looking for.")
  }
  if (!response.ok) {
    throw new ApiError(response.status, `The recipe server responded with error ${response.status}.`)
  }
  return response
}

/**
 * Request JSON and validate it with a Zod schema. Parsing at the boundary
 * means the rest of the app can trust the types: if the server sends
 * something unexpected, it fails here, loudly.
 */
async function requestJson<T>(method: Method, path: string, schema: z.ZodType<T>, body?: unknown): Promise<T> {
  const response = await request(method, path, body)
  return schema.parse(await response.json())
}

const recipePath = (id: string) => `/recipes/${encodeURIComponent(id)}`

export const httpDataService: DataService = {
  listCuisines() {
    return requestJson('GET', '/cuisines', z.array(cuisineSchema))
  },

  getCuisine(id) {
    return requestJson('GET', `/cuisines/${encodeURIComponent(id)}`, cuisineSchema)
  },

  listRecipes(filters = {}) {
    const params = new URLSearchParams({ _embed: 'ratings' })
    if (filters.cuisineId) params.set('cuisineId', filters.cuisineId)
    return requestJson('GET', `/recipes?${params}`, z.array(recipeWithRatingsSchema))
  },

  getRecipe(id) {
    return requestJson('GET', `${recipePath(id)}?_embed=ratings`, recipeWithRatingsSchema)
  },

  createRecipe(input) {
    // json-server assigns the id; we stamp the creation time.
    return requestJson('POST', '/recipes', recipeSchema, {
      ...input,
      createdAt: new Date().toISOString(),
    })
  },

  updateRecipe(id, input) {
    // PATCH changes only the submitted fields, so id and createdAt survive.
    return requestJson('PATCH', recipePath(id), recipeSchema, input)
  },

  async deleteRecipe(id) {
    // _dependent cascades the delete to ratings with this recipeId.
    await request('DELETE', `${recipePath(id)}?_dependent=ratings`)
  },
}
