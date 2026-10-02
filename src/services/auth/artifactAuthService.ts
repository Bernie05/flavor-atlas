import { AuthError, type AuthService } from './AuthService'

interface UserCapability {
  isOwner(): Promise<boolean>
}
interface ClaudeRuntime {
  use(name: 'user'): Promise<UserCapability | null>
}

const runtime = () => (window as Window & { claude?: ClaudeRuntime }).claude

/**
 * The phone preview has no server to check a password. Instead it asks the
 * claude.ai viewer who is looking: only the artifact's owner gets editing.
 * The platform knows who is signed in, so this can't be faked from the page.
 */
export const artifactAuthService: AuthService = {
  async getSession() {
    const user = await (runtime()?.use('user') ?? Promise.resolve(null))
    return { admin: (await user?.isOwner()) ?? false, mode: 'owner' }
  },

  async login() {
    throw new AuthError('unsupported', 'In this preview, only its owner can edit.')
  },

  async logout() {},
}
