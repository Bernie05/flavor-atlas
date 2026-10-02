import { z } from 'zod'
import { cuisineSchema } from '@/features/cuisines/schema'
import { dishSchema, regionSchema } from '@/features/dishes/schema'
import { ratingSchema } from '@/features/ratings/schema'
import { recipeSchema, recipeWithRatingsSchema } from '@/features/recipes/schema'
import { config } from '@/lib/config'
import type { DataService } from './DataService'
import { ApiError, NotFoundError, UnauthorizedError } from './errors'

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

/** Send a request to json-server and turn HTTP failures into typed errors. */
async function request(method: Method, path: string, body?: unknown): Promise<Response> {
  const response = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 401) throw new UnauthorizedError()
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

  listDishes() {
    return requestJson('GET', '/dishes', z.array(dishSchema))
  },

  getDish(id) {
    return requestJson('GET', `/dishes/${encodeURIComponent(id)}`, dishSchema)
  },

  createDish(input) {
    return requestJson('POST', '/dishes', dishSchema, input)
  },

  listRegions() {
    return requestJson('GET', '/regions', z.array(regionSchema))
  },

  listRecipes(filters = {}) {
    const params = new URLSearchParams({ _embed: 'ratings' })
    if (filters.cuisineId) params.set('cuisineId', filters.cuisineId)
    if (filters.dishId) params.set('dishId', filters.dishId)
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

  async deleteRating(id) {
    await request('DELETE', `/ratings/${encodeURIComponent(id)}`)
  },

  createRating(input) {
    return requestJson('POST', '/ratings', ratingSchema, {
      ...input,
      createdAt: new Date().toISOString(),
    })
  },
}
