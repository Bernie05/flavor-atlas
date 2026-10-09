/**
 * json-server gives every created record a random id ("rfl5HXgFYfk") and
 * ignores the one sent. A cuisine's id is its page address and names its CSS
 * colors, so it must be the slug the app chose: these collections are created
 * here instead, keeping the id. (A random id also fails the app's schema, and
 * one invalid cuisine stops the whole list from loading.)
 */

/** Collections created with the id the app sends. */
export const SLUG_COLLECTIONS = new Set(['cuisines'])

/** The same rule as CUISINE_ID in src/features/cuisines/palette.ts. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type SlugCreateResult =
  | { status: 201; item: Record<string, unknown> }
  | { status: 400 | 409; body: { error: string; message: string } }

/** Add `body` to `collection` under its own id, or say why not. Mutates `data` on success. */
export function createWithSlug(data: Record<string, unknown>, collection: string, body: unknown): SlugCreateResult {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { status: 400, body: { error: 'invalid_request', message: 'Send the record as a JSON object.' } }
  }
  const item = body as Record<string, unknown>
  if (typeof item.id !== 'string' || !SLUG.test(item.id)) {
    return { status: 400, body: { error: 'invalid_request', message: 'The id must be a lowercase slug, like "vietnamese".' } }
  }
  const items = Array.isArray(data[collection]) ? (data[collection] as Record<string, unknown>[]) : []
  if (items.some((existing) => existing.id === item.id)) {
    return { status: 409, body: { error: 'conflict', message: `There's already a record with the id “${item.id}”.` } }
  }
  data[collection] = [...items, item]
  return { status: 201, item }
}
