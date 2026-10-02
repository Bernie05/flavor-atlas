import { z } from 'zod'
import { AuthError, type AuthErrorCode, type AuthService } from './AuthService'

const CODES: readonly AuthErrorCode[] = ['wrong_password', 'rate_limited', 'not_configured']

async function post(path: string, body?: unknown) {
  try {
    return await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
  } catch {
    throw new AuthError('failed', "Couldn't reach the server. Is `npm run dev` running?")
  }
}

/**
 * Talks to /api/auth. The session lives in an HttpOnly cookie that this code
 * never sees: the browser stores it and sends it with every same-origin
 * request, and only the server can read it.
 */
export const httpAuthService: AuthService = {
  async getSession() {
    const response = await fetch('/api/auth/session')
    const { admin } = z.object({ admin: z.boolean() }).parse(await response.json())
    return { admin, mode: 'password' }
  },

  async login(password) {
    const response = await post('/api/auth/login', { password })
    if (response.ok) return
    const { error, message } = ((await response.json().catch(() => null)) ?? {}) as { error?: string; message?: string }
    throw new AuthError(CODES.find((code) => code === error) ?? 'failed', message ?? 'Login failed. Try again.')
  },

  async logout() {
    await post('/api/auth/logout')
  },
}
