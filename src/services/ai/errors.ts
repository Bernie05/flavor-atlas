export type AiErrorCode =
  | 'unavailable' // AI can't run here at all: hide the feature
  | 'not_configured'
  | 'invalid_request'
  | 'refused'
  | 'rate_limited'
  | 'invalid_output'
  | 'cancelled'
  | 'failed'

/** Every AI failure, from either backend, as one error type with readable copy. */
export class AiError extends Error {
  readonly code: AiErrorCode

  constructor(code: AiErrorCode, message: string) {
    super(message)
    this.name = 'AiError'
    this.code = code
  }
}
