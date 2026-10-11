// Usage: npm run auth:hash
// Asks for the admin's username and password, then prints the three lines to add
// to .env: the username, the password's hash (never the password) and a session secret.
import { randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline/promises'
import { hashPassword, normalizeUsername, USERNAME_PATTERN } from '../server/auth/password.ts'

const rl = createInterface({ input: process.stdin, output: process.stdout })
const username = normalizeUsername(await rl.question('Choose an admin username (3–32 letters, digits, . _ -): '))
const password = await rl.question('Choose an admin password (12+ characters): ')
rl.close()

if (!USERNAME_PATTERN.test(username)) {
  console.error('\nUse 3 to 32 letters, digits, dots, dashes or underscores, like "bernie" or "atlas.admin".')
  process.exit(1)
}
if (password.length < 12) {
  console.error('\nUse at least 12 characters. A short phrase is easier to remember than a short password.')
  process.exit(1)
}

console.log('\nAdd these lines to .env (never commit .env), then restart `npm run dev`:\n')
console.log(`ADMIN_USERNAME=${username}`)
console.log(`ADMIN_PASSWORD_HASH=${hashPassword(password)}`)
console.log(`SESSION_SECRET=${randomBytes(32).toString('base64url')}`)
