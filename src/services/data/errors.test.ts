import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ApiError, isRetryable, NotFoundError, UnauthorizedError } from './errors'

const zodError = () => z.object({ countryCode: z.string() }).safeParse({}).error

describe('isRetryable', () => {
  it('retries failures that might go away: the network and 5xx', () => {
    expect(isRetryable(new TypeError('Failed to fetch'))).toBe(true)
    expect(isRetryable(new ApiError(503, 'Unavailable'))).toBe(true)
  })

  it('never retries failures that repeat: 4xx, missing records, bad data', () => {
    expect(isRetryable(new ApiError(400, 'Bad request'))).toBe(false)
    expect(isRetryable(new NotFoundError('Recipe not found'))).toBe(false)
    expect(isRetryable(new UnauthorizedError())).toBe(false)
    expect(isRetryable(zodError())).toBe(false)
  })
})
