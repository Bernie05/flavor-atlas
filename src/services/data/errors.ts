import { ZodError } from 'zod'

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

/** The server refused a change because nobody is logged in as the admin (HTTP 401). */
export class UnauthorizedError extends Error {
  constructor(message = 'Your session ended. Log in again to save changes.') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Whether trying again might help. Only transient failures qualify: the
 * network (fetch rejects with a TypeError) or a 5xx from the server. A
 * missing record, a refused session, a 4xx or data in the wrong shape will
 * fail the same way every time, so retrying only delays the error message.
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof ApiError) return error.status >= 500
  return error instanceof TypeError
}

/** Turn any thrown value into a sentence a person can act on. */
export function describeError(error: unknown): string {
  if (error instanceof NotFoundError || error instanceof ApiError || error instanceof UnauthorizedError) {
    return error.message
  }
  // fetch() rejects with a TypeError when the server can't be reached at all.
  if (error instanceof TypeError) {
    return "Can't reach the recipe server. Check your connection, then try again."
  }
  if (error instanceof ZodError) return 'The server sent recipe data in an unexpected format.'
  return 'Something went wrong. Please try again.'
}

/** A cuisine id is already taken (HTTP 409 semantics, in every data service). */
export const cuisineExists = (name: string) =>
  new ApiError(409, `There's already a cuisine called “${name}”. Pick another name.`)

/** A cuisine name that makes no id (no Latin letters or digits). The form checks first; this is the backstop. */
export const cuisineNameInvalid = () => new ApiError(400, 'Use Latin letters in the cuisine name.')

/** A cuisine still has recipes, so deleting it would leave them pointing at nothing (409). */
export const cuisineInUse = (recipes: number) =>
  new ApiError(409, `${recipes} ${recipes === 1 ? 'recipe still uses' : 'recipes still use'} this cuisine. Delete or move ${recipes === 1 ? 'it' : 'them'} first.`)

/** A dish or region still has recipes, so deleting it would leave them pointing at nothing (409). */
export const stillUsed = (what: 'dish' | 'region', recipes: number) =>
  new ApiError(409, `${recipes} ${recipes === 1 ? 'recipe still uses' : 'recipes still use'} this ${what}. Move ${recipes === 1 ? 'it' : 'them'} first.`)
