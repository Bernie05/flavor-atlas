/**
 * The access rules for the data API, in one place. Anyone may read the
 * atlas; only the admin may change it. One exception, for visitor reviews:
 * anyone may send a review to /submissions, but only the admin may read,
 * approve or reject what's there. Nothing a visitor sends is public until
 * the admin approves it (it then becomes a rating). The change history
 * (/activity) is the admin's alone, to read as well as to write.
 */
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Collections only the admin may read. */
const PRIVATE_COLLECTIONS = new Set(['submissions', 'activity'])

/**
 * Collections a request pulls in alongside its own: json-server's `_embed`
 * (and `_expand`) attach related records, so `/recipes?_embed=submissions`
 * would hand anyone the private review queue under a public path.
 */
const embedded = (query: string) => {
  const params = new URLSearchParams(query)
  return [...params.getAll('_embed'), ...params.getAll('_expand')].flatMap((value) => value.split(',').map((name) => name.trim()))
}

/** `path` is the request path inside /api/data ("/submissions", "/recipes/3?_embed=ratings"). */
export function requiresAdmin(method: string | undefined, path = '/'): boolean {
  const verb = (method ?? 'GET').toUpperCase()
  const [pathname = '', query = ''] = path.split('?')
  const segments = pathname.split('/').filter(Boolean)
  if (embedded(query).some((name) => PRIVATE_COLLECTIONS.has(name))) return true
  if (segments[0] === 'submissions') return !(verb === 'POST' && segments.length === 1)
  if (segments[0] === 'activity') return true
  return !READ_METHODS.has(verb)
}
