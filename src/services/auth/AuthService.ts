export interface Session {
  /** May this visitor create, edit, delete, rate and use AI? */
  admin: boolean
  /** How admin access is granted here: a password login, or being the preview's owner. */
  mode: 'password' | 'owner'
}

/**
 * Who is allowed to change things. Like DataService and AiService, the UI
 * depends on this interface; the server enforces the same rules on its side.
 */
export interface AuthService {
  getSession(): Promise<Session>
  /** Rejects with AuthError. Only in 'password' mode. */
  login(password: string): Promise<void>
  logout(): Promise<void>
}

export type AuthErrorCode = 'wrong_password' | 'rate_limited' | 'not_configured' | 'unsupported' | 'failed'

export class AuthError extends Error {
  readonly code: AuthErrorCode

  constructor(code: AuthErrorCode, message: string) {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}
