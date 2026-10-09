import { z } from 'zod'
import { cuisineSchema } from '@/features/cuisines/schema'
import { dishSchema, regionSchema } from '@/features/dishes/schema'
import { ratingSchema, submissionSchema } from '@/features/ratings/schema'
import { recipeSchema, recipeWithRatingsSchema } from '@/features/recipes/schema'
import { config } from '@/lib/config'
import type { DataService } from './DataService'
import { cuisineIdFor } from '@/features/cuisines/utils'
import { ApiError, cuisineExists, cuisineNameInvalid, NotFoundError, UnauthorizedError } from './errors'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** Send a request to json-server and turn HTTP failures into typed errors. */
async function request(method: Method, path: string, body?: unknown): Promise<Response> {
  const response = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 401) throw new UnauthorizedError()
  if (response.status === 429) {
    const body = (await response.json().catch(() => null)) as { message?: unknown } | null
    throw new ApiError(429, typeof body?.message === 'string' ? body.message : 'Too many requests. Try again in a few minutes.')
  }
  if (response.status === 404) {
    throw new NotFoundError("We couldn't find what you were looking for.")
  }
  // A refused change (409) carries the server's reason, written for people.
  if (response.status === 409) {
    const body = (await response.json().catch(() => null)) as { message?: unknown } | null
    throw new ApiError(409, typeof body?.message === 'string' ? body.message : 'That change conflicts with other data.')
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

  async createCuisine(input) {
    const id = cuisineIdFor(input.name)
    if (!id) throw cuisineNameInvalid()
    // json-server would accept a second record with the same id, so check first.
    // (Two admins racing is not a concern for a one-admin site.)
    const taken = await request('GET', `/cuisines/${encodeURIComponent(id)}`).then(
      () => true,
      (error: unknown) => {
        if (error instanceof NotFoundError) return false
        throw error
      },
    )
    if (taken) throw cuisineExists(input.name)
    return requestJson('POST', '/cuisines', cuisineSchema, { ...input, id })
  },

  updateCuisine(id, input) {
    // PUT replaces the record: a seed cuisine that keeps its own colors sends no hue.
    return requestJson('PUT', `/cuisines/${encodeURIComponent(id)}`, cuisineSchema, { ...input, id })
  },

  async deleteCuisine(id) {
    // The server refuses (409) while a recipe uses the cuisine; _dependent removes its
    // empty dishes and its regions with it, which json-server would otherwise null out.
    await request('DELETE', `/cuisines/${encodeURIComponent(id)}?_dependent=dishes&_dependent=regions`)
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

  async submitReview(input) {
    // The server checks it, sets its id and date, and keeps it out of sight until approved.
    await request('POST', '/submissions', input)
  },

  async listSubmissions() {
    const queue = await requestJson('GET', '/submissions', z.array(submissionSchema))
    return queue.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async approveSubmission(id) {
    const path = `/submissions/${encodeURIComponent(id)}`
    const submission = await requestJson('GET', path, submissionSchema)
    const { recipeId, score, comment, createdAt } = submission
    // The rating first: if the delete fails, the review is published and merely still queued.
    const rating = await requestJson('POST', '/ratings', ratingSchema, { recipeId, score, comment, createdAt })
    await request('DELETE', path)
    return rating
  },

  async rejectSubmission(id) {
    await request('DELETE', `/submissions/${encodeURIComponent(id)}`)
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
