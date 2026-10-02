import { verifyPassword } from './password'
import { createRateLimiter } from './rateLimit'
import {
  clearedSessionCookie,
  createSessionToken,
  parseCookies,
  SESSION_COOKIE,
  sessionCookie,
  verifySessionToken,
} from './session'

export interface AuthConfig {
  /** scrypt hash from `npm run auth:hash`. */
  passwordHash?: string
  /** Random secret that signs session tokens. */
  sessionSecret?: string
}

export interface AuthResponse {
  status: number
  body: unknown
  setCookie?: string
}

/** At least 32 bytes, like the secret `npm run auth:hash` generates. Shorter is guessable. */
const MIN_SECRET_LENGTH = 32

const isConfigured = (config: AuthConfig): config is Required<AuthConfig> =>
  Boolean(config.passwordHash && config.sessionSecret && config.sessionSecret.length >= MIN_SECRET_LENGTH)

/** Is this request from a logged-in admin? False whenever auth isn't set up (secure by default). */
export function isAdmin(cookieHeader: string | undefined, config: AuthConfig, nowMs = Date.now()): boolean {
  if (!isConfigured(config)) return false
  return verifySessionToken(parseCookies(cookieHeader)[SESSION_COOKIE], config.sessionSecret, nowMs)
}

const loginLimiter = createRateLimiter({ limit: 5, windowMs: 60_000 })

export function handleLogin(
  body: unknown,
  { ip, secure, config, allow = loginLimiter }: {
    ip: string
    secure: boolean
    config: AuthConfig
    allow?: (key: string) => boolean
  },
): AuthResponse {
  if (!isConfigured(config)) {
    return {
      status: 503,
      body: { error: 'not_configured', message: 'Admin login isn’t set up. Run `npm run auth:hash` and add the values to .env.' },
    }
  }
  // Count every attempt, right or wrong, before checking the password.
  if (!allow(ip)) {
    return { status: 429, body: { error: 'rate_limited', message: 'Too many attempts. Wait a minute and try again.' } }
  }

  const password = typeof body === 'object' && body !== null && 'password' in body ? body.password : undefined
  if (typeof password !== 'string' || !verifyPassword(password, config.passwordHash)) {
    return { status: 401, body: { error: 'wrong_password', message: 'That password isn’t right.' } }
  }

  return {
    status: 200,
    body: { admin: true },
    setCookie: sessionCookie(createSessionToken(config.sessionSecret), { secure }),
  }
}

export const handleLogout = (): AuthResponse => ({ status: 200, body: { admin: false }, setCookie: clearedSessionCookie })

export const handleSession = (cookieHeader: string | undefined, config: AuthConfig): AuthResponse => ({
  status: 200,
  body: { admin: isAdmin(cookieHeader, config) },
})
