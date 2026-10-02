import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { buildPrompt } from '@/features/ai/prompts'
import { aiOutputSchemas, aiRequestSchema, type AiTask } from '@/features/ai/schema'

/**
 * Server side of the AI features. It runs only on the server, so the API key
 * never reaches the browser: anything shipped in the client bundle is public.
 */

export const AI_MODEL = 'claude-opus-5-5'

export type AiErrorCode =
  | 'invalid_request'
  | 'not_configured'
  | 'refused'
  | 'rate_limited'
  | 'invalid_output'
  | 'upstream_error'

export type GenerateResult = { ok: true; output: unknown } | { ok: false; code: AiErrorCode }

/** One call to the model. Injected into the handler so tests can fake it. */
export type Generate = (task: AiTask, prompt: string) => Promise<GenerateResult>

export interface AiHttpResponse {
  status: number
  body: unknown
}

const ERRORS: Record<AiErrorCode, { status: number; message: string }> = {
  invalid_request: { status: 400, message: 'The request was not valid.' },
  not_configured: {
    status: 503,
    message: 'AI is not set up on this server. Add ANTHROPIC_API_KEY to .env and restart `npm run dev`.',
  },
  refused: { status: 422, message: "Claude couldn't help with this draft. Try rewording the title or notes." },
  rate_limited: { status: 429, message: 'Too many AI requests right now. Wait a minute and try again.' },
  invalid_output: { status: 502, message: 'The AI reply was incomplete. Try again.' },
  upstream_error: { status: 502, message: "Couldn't reach Claude. Check your connection and try again." },
}

const errorResponse = (code: AiErrorCode, message = ERRORS[code].message): AiHttpResponse => ({
  status: ERRORS[code].status,
  body: { error: code, message },
})

/** Validate the request, ask the model, and turn the outcome into an HTTP response. */
export async function handleAiRequest(body: unknown, generate: Generate): Promise<AiHttpResponse> {
  // Never trust the browser: validate exactly as the form would.
  const request = aiRequestSchema.safeParse(body)
  if (!request.success) {
    return errorResponse('invalid_request', request.error.issues[0]?.message)
  }

  const { task, draft } = request.data
  const result = await generate(task, buildPrompt(task, draft))
  return result.ok ? { status: 200, body: result.output } : errorResponse(result.code)
}

/**
 * The real model call, through the Anthropic SDK. Takes a client factory so
 * the client is created inside the try: the SDK throws at construction when
 * it can't find credentials, and that should read as "not configured".
 */
export function createClaudeGenerate(createClient: () => Anthropic): Generate {
  let client: Anthropic | undefined
  return async (task, prompt) => {
    try {
      client ??= createClient()
      const message = await client.beta.messages.parse({
        model: AI_MODEL,
        max_tokens: 16000,
        output_config: {
          // Short writing tasks: low effort keeps them quick and cheap.
          effort: 'low',
          // Structured outputs: the reply is constrained to this schema.
          format: betaZodOutputFormat(aiOutputSchemas[task]),
        },
        // If Claude declines on safety grounds, retry on the recommended model.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        messages: [{ role: 'user', content: prompt }],
      })

      // Always check why it stopped before reading the output.
      if (message.stop_reason === 'refusal') return { ok: false, code: 'refused' }
      if (message.stop_reason === 'max_tokens' || message.parsed_output == null) {
        return { ok: false, code: 'invalid_output' }
      }
      return { ok: true, output: message.parsed_output }
    } catch (error) {
      return { ok: false, code: toErrorCode(error) }
    }
  }
}

/** Map SDK errors (typed classes, never message strings) to app error codes. */
function toErrorCode(error: unknown): AiErrorCode {
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return 'not_configured'
  }
  if (error instanceof Anthropic.RateLimitError) return 'rate_limited'
  if (error instanceof Anthropic.APIError) return 'upstream_error'
  // Thrown before any request is sent, e.g. no API key could be found.
  if (error instanceof Anthropic.AnthropicError) return 'not_configured'
  throw error
}

/**
 * Whether any credential source the SDK reads is present: an API key, an auth
 * token, or a profile saved by `ant auth login`. Checked up front because the
 * SDK reports missing credentials with a plain Error, which we shouldn't
 * identify by its message text.
 */
function hasCredentials(apiKey: string | undefined): boolean {
  const env = process.env
  return Boolean(
    apiKey ||
      env.ANTHROPIC_API_KEY ||
      env.ANTHROPIC_AUTH_TOKEN ||
      env.ANTHROPIC_PROFILE ||
      existsSync(join(homedir(), '.config', 'anthropic')),
  )
}

/** Build the real generator, or one that explains AI isn't set up yet. */
export function createDefaultGenerate(apiKey?: string): Generate {
  if (!hasCredentials(apiKey)) return async () => ({ ok: false, code: 'not_configured' })
  return createClaudeGenerate(() => new Anthropic(apiKey ? { apiKey } : {}))
}
