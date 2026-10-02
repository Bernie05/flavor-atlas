/**
 * Where to go after logging in. Only same-site paths are allowed: accepting
 * any ?next= value would let a crafted link send you to another website right
 * after you log in (an "open redirect").
 */
export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return '/'
  return next
}
