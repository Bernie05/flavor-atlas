import { buildPrompt } from '@/features/ai/prompts'
import { aiRequestSchema } from '@/features/ai/schema'
import type { AiService } from './AiService'
import { AiError } from './errors'
import { parseSuggestion } from './parse'

// The small part of the claude.ai viewer's `sample` capability we use.
interface SampleOptions {
  signal?: AbortSignal
  modelTier?: 'quick' | 'default' | 'complex'
  cache?: boolean
}
interface Sample {
  json<T = unknown>(input: string, options?: SampleOptions): Promise<T>
}
interface ClaudeRuntime {
  use(name: 'sample'): Promise<Sample | null>
}
interface SampleError {
  code: string
  message: string
}

const runtime = () => (window as Window & { claude?: ClaudeRuntime }).claude

// use() is memoized by the viewer; resolves null where Claude isn't reachable.
let samplePromise: Promise<Sample | null> | undefined
const getSample = () => (samplePromise ??= runtime()?.use('sample') ?? Promise.resolve(null))

const isSampleError = (error: unknown): error is SampleError =>
  typeof error === 'object' && error !== null && 'code' in error

/** Map the viewer's error codes (never its messages) to ours. */
function toAiError(error: unknown): AiError {
  const code = isSampleError(error) ? error.code : 'upstream_error'
  switch (code) {
    case 'cancelled':
      return new AiError('cancelled', 'Stopped.')
    case 'not_granted':
    case 'sampling_disabled':
    case 'not_declared':
    case 'capability_disabled':
    case 'capability_removed':
      return new AiError('unavailable', "AI isn't available in this view.")
    case 'rate_limited':
      return new AiError('rate_limited', 'Too many AI requests right now. Wait a minute and try again.')
    case 'refused':
      return new AiError('refused', "Claude couldn't help with this draft. Try rewording the title or notes.")
    case 'invalid_json':
    case 'empty_completion':
      return new AiError('invalid_output', 'The AI reply was incomplete. Try again.')
    case 'session_expired':
      return new AiError('failed', 'Sign in to Claude again, then try once more.')
    default:
      return new AiError('failed', "Couldn't reach Claude. Try again in a moment.")
  }
}

/**
 * Asks Claude through the claude.ai viewer, on the viewer's own account.
 * Used by the phone preview, which has no server and must never hold a key.
 */
export const artifactAiService: AiService = {
  async isAvailable() {
    return (await getSample()) !== null
  },

  async suggest(task, draft, signal) {
    const request = aiRequestSchema.safeParse({ task, draft })
    if (!request.success) {
      throw new AiError('invalid_request', request.error.issues[0]?.message ?? 'Fill in the recipe first.')
    }

    const sample = await getSample()
    if (!sample) throw new AiError('unavailable', "AI isn't available in this view.")

    try {
      const data = await sample.json(buildPrompt(task, request.data.draft), {
        // Short writing tasks: the quick tier answers in seconds.
        modelTier: 'quick',
        signal,
        // "Try again" should ask again, not replay the cached answer.
        cache: false,
      })
      return parseSuggestion(task, data)
    } catch (error) {
      throw error instanceof AiError ? error : toAiError(error)
    }
  },
}
