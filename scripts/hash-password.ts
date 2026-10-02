// Usage: npm run auth:hash
// Prints the two lines to add to .env: the password hash and a session secret.
import { randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline/promises'
import { hashPassword } from '../server/auth/password.ts'

const rl = createInterface({ input: process.stdin, output: process.stdout })
const password = await rl.question('Choose an admin password (12+ characters): ')
rl.close()

if (password.length < 12) {
  console.error('\nUse at least 12 characters. A short phrase is easier to remember than a short password.')
  process.exit(1)
}

console.log('\nAdd these lines to .env (never commit .env), then restart `npm run dev`:\n')
console.log(`ADMIN_PASSWORD_HASH=${hashPassword(password)}`)
console.log(`SESSION_SECRET=${randomBytes(32).toString('base64url')}`)
