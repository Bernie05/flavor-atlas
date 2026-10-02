import { aiRequestSchema } from '@/features/ai/schema'
import type { AiService } from './AiService'
import { AiError, type AiErrorCode } from './errors'
import { parseSuggestion } from './parse'

const SERVER_CODES: readonly AiErrorCode[] = [
  'not_configured',
  'unauthorized',
  'invalid_request',
  'refused',
  'rate_limited',
  'invalid_output',
]

/** Calls our own server at /api/ai, which holds the API key. */
export const httpAiService: AiService = {
  async isAvailable() {
    return true
  },

  async suggest(task, draft, signal) {
    // Check locally first: no point sending a draft the server will reject.
    const request = aiRequestSchema.safeParse({ task, draft })
    if (!request.success) {
      throw new AiError('invalid_request', request.error.issues[0]?.message ?? 'Fill in the recipe first.')
    }

    let response: Response
    try {
      response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.data),
        signal,
      })
    } catch {
      if (signal?.aborted) throw new AiError('cancelled', 'Stopped.')
      throw new AiError('failed', "Couldn't reach the AI server. Is `npm run dev` running?")
    }

    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const { error, message } = (body ?? {}) as { error?: string; message?: string }
      const code = SERVER_CODES.find((c) => c === error) ?? 'failed'
      throw new AiError(code, message ?? 'The AI request failed. Try again.')
    }
    return parseSuggestion(task, body)
  },
}
