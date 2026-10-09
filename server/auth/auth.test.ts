import { describe, expect, it } from 'vitest'
import { requiresAdmin } from './access'
import { handleLogin, isAdmin } from './handlers'
import { hashPassword, verifyPassword } from './password'
import { createRateLimiter } from './rateLimit'
import { createSessionToken, parseCookies, SESSION_TTL_SECONDS, verifySessionToken } from './session'

const SECRET = 'a-test-session-secret-that-is-at-least-32-chars'

describe('password hashing', () => {
  it('verifies the right password and rejects others', () => {
    const stored = hashPassword('adobo-sa-gata')
    expect(stored).toMatch(/^scrypt:/)
    expect(stored).not.toContain('adobo')
    expect(verifyPassword('adobo-sa-gata', stored)).toBe(true)
    expect(verifyPassword('adobo', stored)).toBe(false)
  })

  it('salts each hash, so the same password hashes differently', () => {
    expect(hashPassword('same')).not.toBe(hashPassword('same'))
  })

  it('rejects malformed stored values', () => {
    expect(verifyPassword('x', 'plaintext-password')).toBe(false)
  })
})

describe('session tokens', () => {
  const now = Date.UTC(2026, 9, 2)

  it('accepts a fresh token and rejects it after it expires', () => {
    const token = createSessionToken(SECRET, now)
    expect(verifySessionToken(token, SECRET, now + 1000)).toBe(true)
    expect(verifySessionToken(token, SECRET, now + SESSION_TTL_SECONDS * 1000 + 1)).toBe(false)
  })

  it('rejects tokens signed with another secret or edited by hand', () => {
    const token = createSessionToken(SECRET, now)
    expect(verifySessionToken(token, 'another-secret', now)).toBe(false)

    // Try to extend the expiry without re-signing.
    const [, signature] = token.split('.')
    const forgedPayload = Buffer.from(JSON.stringify({ exp: now * 2 })).toString('base64url')
    expect(verifySessionToken(`${forgedPayload}.${signature}`, SECRET, now)).toBe(false)
    expect(verifySessionToken('garbage', SECRET, now)).toBe(false)
    expect(verifySessionToken(undefined, SECRET, now)).toBe(false)
  })

  it('parses cookie headers', () => {
    expect(parseCookies('a=1; fa_session=abc.def; b=2')).toEqual({ a: '1', fa_session: 'abc.def', b: '2' })
  })
})

describe('rate limiter', () => {
  it('allows the limit, blocks the next attempt, and resets after the window', () => {
    const allow = createRateLimiter({ limit: 2, windowMs: 1000 })
    expect([allow('ip', 0), allow('ip', 10), allow('ip', 20)]).toEqual([true, true, false])
    expect(allow('other-ip', 20)).toBe(true)
    expect(allow('ip', 1000)).toBe(true)
  })
})

describe('access rules', () => {
  it('lets anyone read and only the admin write', () => {
    expect(['GET', 'HEAD', 'OPTIONS', 'get'].map((m) => requiresAdmin(m))).toEqual([false, false, false, false])
    expect(['POST', 'PUT', 'PATCH', 'DELETE'].map((m) => requiresAdmin(m))).toEqual([true, true, true, true])
  })

  it('lets anyone send a review for moderation, but only the admin see or change the queue', () => {
    expect(requiresAdmin('POST', '/submissions')).toBe(false)
    expect(requiresAdmin('GET', '/submissions')).toBe(true)
    expect(requiresAdmin('GET', '/submissions/abc')).toBe(true)
    expect(requiresAdmin('DELETE', '/submissions/abc')).toBe(true)
    expect(requiresAdmin('PUT', '/submissions/abc')).toBe(true)
    expect(requiresAdmin('POST', '/submissions/abc')).toBe(true)
    expect(requiresAdmin('POST', '/ratings')).toBe(true) // approved reviews are still admin-only
    expect(requiresAdmin('GET', '/recipes/1?_embed=ratings')).toBe(false)
  })
})

describe('login', () => {
  const config = { passwordHash: hashPassword('right-password'), sessionSecret: SECRET }
  const options = { ip: '1.2.3.4', secure: false, config, allow: () => true }

  it('sets an HttpOnly, SameSite=Strict session cookie for the right password', () => {
    const response = handleLogin({ password: 'right-password' }, options)
    expect(response.status).toBe(200)
    expect(response.setCookie).toMatch(/^fa_session=.+; Path=\/; HttpOnly; SameSite=Strict; Max-Age=\d+$/)
    expect(isAdmin(response.setCookie!.split(';')[0], config)).toBe(true)
  })

  it('adds Secure over HTTPS', () => {
    expect(handleLogin({ password: 'right-password' }, { ...options, secure: true }).setCookie).toContain('Secure')
  })

  it('rejects a wrong or missing password without a cookie', () => {
    for (const body of [{ password: 'wrong' }, {}, null, 'right-password']) {
      const response = handleLogin(body, options)
      expect(response.status).toBe(401)
      expect(response.setCookie).toBeUndefined()
    }
  })

  it('refuses when rate limited, even with the right password', () => {
    expect(handleLogin({ password: 'right-password' }, { ...options, allow: () => false }).status).toBe(429)
  })

  it('is closed when not configured, and nobody counts as admin', () => {
    expect(handleLogin({ password: 'x' }, { ...options, config: {} }).status).toBe(503)
    expect(isAdmin(`fa_session=${createSessionToken(SECRET)}`, { sessionSecret: SECRET })).toBe(false)
  })
})

describe('hardening (from the security review)', () => {
  it('treats a malformed cookie as logged out instead of crashing', () => {
    expect(parseCookies('fa_session=%; other=1')).toEqual({ fa_session: '%', other: '1' })
    expect(isAdmin('fa_session=%', { passwordHash: hashPassword('x'), sessionSecret: SECRET })).toBe(false)
  })

  it('forgets ended windows so memory does not grow per IP', () => {
    const allow = createRateLimiter({ limit: 5, windowMs: 1000 })
    for (let i = 0; i < 100; i++) allow(`ip-${i}`, 0)
    expect(allow.size()).toBe(100)
    allow('late', 5000)
    expect(allow.size()).toBe(1)
  })

  it('refuses a session secret shorter than 32 characters', () => {
    const config = { passwordHash: hashPassword('right-password'), sessionSecret: 'short' }
    expect(handleLogin({ password: 'right-password' }, { ip: 'x', secure: false, config, allow: () => true }).status).toBe(503)
  })
})
