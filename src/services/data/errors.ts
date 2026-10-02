import { ZodError } from 'zod'

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
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
  if (error instanceof NotFoundError || error instanceof ApiError) return error.message
  // fetch() rejects with a TypeError when the server can't be reached at all.
  if (error instanceof TypeError) {
    return "Can't reach the recipe server. Start it with `npm run api`, then try again."
  }
  if (error instanceof ZodError) return 'The server sent recipe data in an unexpected format.'
  return 'Something went wrong. Please try again.'
}
