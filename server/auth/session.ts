import { createHmac, timingSafeEqual } from 'node:crypto'

// A session is a signed token: "<payload>.<signature>". The payload says when
// it expires; the HMAC signature proves our server issued it, so nobody can
// forge or extend one without SESSION_SECRET. No session store needed.

export const SESSION_COOKIE = 'fa_session'
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60

const sign = (payload: string, secret: string) =>
  createHmac('sha256', secret).update(payload).digest('base64url')

export function createSessionToken(secret: string, nowMs = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ exp: nowMs + SESSION_TTL_SECONDS * 1000 })).toString('base64url')
  return `${payload}.${sign(payload, secret)}`
}

export function verifySessionToken(token: string | undefined, secret: string, nowMs = Date.now()): boolean {
  if (!token) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false

  const expected = Buffer.from(sign(payload, secret))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false

  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: unknown }
    return typeof exp === 'number' && exp > nowMs
  } catch {
    return false
  }
}

/** Parse a Cookie header into name → value. */
export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {}
  for (const part of header?.split(';') ?? []) {
    const index = part.indexOf('=')
    if (index <= 0) continue
    const raw = part.slice(index + 1).trim()
    // A malformed value (e.g. "%") must not crash the request; keep it raw.
    try {
      cookies[part.slice(0, index).trim()] = decodeURIComponent(raw)
    } catch {
      cookies[part.slice(0, index).trim()] = raw
    }
  }
  return cookies
}

/**
 * HttpOnly: page JavaScript can't read it, so an XSS bug can't steal it.
 * SameSite=Strict: other sites can't make the browser send it.
 * Secure (over HTTPS): never sent unencrypted.
 */
export function sessionCookie(token: string, { secure }: { secure: boolean }): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${SESSION_TTL_SECONDS}`,
    secure && 'Secure',
  ]
    .filter(Boolean)
    .join('; ')
}

export const clearedSessionCookie = `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
