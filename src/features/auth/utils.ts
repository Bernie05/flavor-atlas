/**
 * Where to go after logging in. Only same-site paths are allowed: accepting
 * any ?next= value would let a crafted link send you to another website right
 * after you log in (an "open redirect").
 */
export function safeNextPath(next: string | null): string {
  // Control characters too: browsers drop tabs and newlines from URLs, so "/\t/evil.example" would become "//evil.example".
  // eslint-disable-next-line no-control-regex
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\') || /[\u0000-\u001f\u007f]/.test(next)) return '/'
  return next
}
