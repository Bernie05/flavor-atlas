import { config } from '@/lib/config'
import { artifactAuthService } from './artifactAuthService'
import type { AuthService } from './AuthService'
import { httpAuthService } from './httpAuthService'

export const authService: AuthService = config.authSource === 'artifact' ? artifactAuthService : httpAuthService

export { AuthError, type AuthService, type Session } from './AuthService'
