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

/** Turn any thrown value into a sentence a person can act on. */
export function describeError(error: unknown): string {
  if (error instanceof NotFoundError || error instanceof ApiError || error instanceof UnauthorizedError) {
    return error.message
  }
  // fetch() rejects with a TypeError when the server can't be reached at all.
  if (error instanceof TypeError) {
    return "Can't reach the recipe server. Start it with `npm run dev`, then try again."
  }
  if (error instanceof ZodError) return 'The server sent recipe data in an unexpected format.'
  return 'Something went wrong. Please try again.'
}
