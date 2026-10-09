/**
 * Visitor reviews waiting for the admin: the one write the public may make,
 * so everything is checked here, on the server, whatever the page sent.
 * Only known fields are kept, the server sets the id and date, and a filled
 * honeypot (a field people never see) is accepted silently and dropped, so
 * a bot learns nothing.
 */

export const MAX_COMMENT = 300

/** The hidden field bots fill in. People never see it. */
export const HONEYPOT = 'website'

export type SubmissionResult =
  | { status: 201; item: Record<string, unknown> | null }
  | { status: 400; body: { error: string; message: string } }

const invalid = (message: string): SubmissionResult => ({ status: 400, body: { error: 'invalid_request', message } })

/** Validate a visitor's review and add it to `data.submissions`. Mutates `data` on success. */
export function createSubmission(
  data: Record<string, unknown>,
  body: unknown,
  { now = new Date(), id = crypto.randomUUID() }: { now?: Date; id?: string } = {},
): SubmissionResult {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return invalid('Send the review as a JSON object.')
  const input = body as Record<string, unknown>

  // A bot filled the field no person can see: say thanks, keep nothing.
  if (typeof input[HONEYPOT] === 'string' && input[HONEYPOT] !== '') return { status: 201, item: null }

  const recipes = Array.isArray(data.recipes) ? (data.recipes as { id?: unknown }[]) : []
  if (typeof input.recipeId !== 'string' || !recipes.some((recipe) => recipe.id === input.recipeId)) {
    return invalid("That recipe isn't in the atlas.")
  }
  if (typeof input.score !== 'number' || !Number.isInteger(input.score) || input.score < 1 || input.score > 5) {
    return invalid('Choose from 1 to 5 stars.')
  }
  const comment = typeof input.comment === 'string' ? input.comment.trim() : ''
  if (input.comment !== undefined && typeof input.comment !== 'string') return invalid('The review must be text.')
  if (comment.length > MAX_COMMENT) return invalid(`Keep your review under ${MAX_COMMENT} characters.`)

  const item = { id, recipeId: input.recipeId, score: input.score, comment, createdAt: now.toISOString() }
  data.submissions = [...(Array.isArray(data.submissions) ? data.submissions : []), item]
  return { status: 201, item }
}
