/**
 * The access rules for the data API, in one place: anyone may read,
 * only the admin may change anything (recipes and ratings alike).
 */
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export const requiresAdmin = (method: string | undefined) => !READ_METHODS.has((method ?? 'GET').toUpperCase())
