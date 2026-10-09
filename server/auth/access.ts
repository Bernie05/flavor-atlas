/**
 * The access rules for the data API, in one place. Anyone may read the
 * atlas; only the admin may change it. One exception, for visitor reviews:
 * anyone may send a review to /submissions, but only the admin may read,
 * approve or reject what's there. Nothing a visitor sends is public until
 * the admin approves it (it then becomes a rating).
 */
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** `path` is the request path inside /api/data ("/submissions", "/recipes/3?_embed=ratings"). */
export function requiresAdmin(method: string | undefined, path = '/'): boolean {
  const verb = (method ?? 'GET').toUpperCase()
  const segments = path.split('?')[0]!.split('/').filter(Boolean)
  if (segments[0] === 'submissions') return !(verb === 'POST' && segments.length === 1)
  return !READ_METHODS.has(verb)
}
