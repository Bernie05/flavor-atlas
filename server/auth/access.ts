/**
 * The access rules for the data API, in one place. Anyone may read the
 * atlas; only the admin may change it. One exception, for visitor reviews:
 * anyone may send a review to /submissions, but only the admin may read,
 * approve or reject what's there. Nothing a visitor sends is public until
 * the admin approves it (it then becomes a rating).
 *
 * Deny by default: a read is public only for the collections listed here.
 * A collection added later (like the change history, /activity) is the
 * admin's until someone decides otherwise, so forgetting it can't leak it.
 */
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** The atlas itself: what anyone may read, and pull into each other with `_embed`. */
const PUBLIC_COLLECTIONS = new Set(['cuisines', 'dishes', 'regions', 'recipes', 'ratings'])

/** json-server's parameters that attach another collection's records to a response. */
const isEmbedParam = (name: string) => name.startsWith('_embed') || name.startsWith('_expand')

/**
 * The path as json-server will read it. It decodes the URL, so `/%73ubmissions`
 * reaches the review queue: checking the raw text once let anyone read it.
 * A path that can't be decoded is refused (null) rather than guessed at.
 */
function decodeSegments(pathname: string): string[] | null {
  try {
    return pathname.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment))
  } catch {
    return null
  }
}

/**
 * One spelling for every request path: decoded, then encoded the standard way
 * ("/%73ubmissions//" becomes "/submissions"). The gateway rewrites the URL to
 * it before anything reads it, so the access check, the review validator and
 * json-server all see the same path; two layers reading two spellings is how
 * these holes happen. Null for a path that can't be decoded.
 */
export function canonicalPath(path: string): string | null {
  const queryStart = path.indexOf('?')
  const segments = decodeSegments(queryStart === -1 ? path : path.slice(0, queryStart))
  if (!segments) return null
  return `/${segments.map(encodeURIComponent).join('/')}${queryStart === -1 ? '' : path.slice(queryStart)}`
}

/** `path` is the request path inside /api/data ("/submissions", "/recipes/3?_embed=ratings"). */
export function requiresAdmin(method: string | undefined, path = '/'): boolean {
  const verb = (method ?? 'GET').toUpperCase()
  const queryStart = path.indexOf('?')
  const segments = decodeSegments(queryStart === -1 ? path : path.slice(0, queryStart))
  if (!segments) return true

  // Sending a review: the one write anyone may make (checked in server/data/submissions.ts).
  if (verb === 'POST' && segments.length === 1 && segments[0] === 'submissions') return false

  if (!READ_METHODS.has(verb)) return true
  if (!PUBLIC_COLLECTIONS.has(segments[0] ?? '')) return true
  // A public read may only pull in other public collections: `/recipes?_embed=submissions`
  // once handed anyone the review queue under a public path.
  const params = new URLSearchParams(queryStart === -1 ? '' : path.slice(queryStart + 1))
  for (const [name, value] of params) {
    if (isEmbedParam(name) && value.split(',').some((embedded) => !PUBLIC_COLLECTIONS.has(embedded.trim()))) return true
  }
  return false
}
