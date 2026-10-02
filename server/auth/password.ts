import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

// Passwords are never stored, only a salted scrypt hash. scrypt is slow and
// memory-hungry on purpose, so guessing passwords from a leaked hash is costly.
// Format: scrypt:<salt base64>:<hash base64>

const KEY_LENGTH = 64

export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, KEY_LENGTH)
  return `scrypt:${salt.toString('base64')}:${hash.toString('base64')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split(':')
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false

  const expected = Buffer.from(hashB64, 'base64')
  const actual = scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length)
  // Constant-time comparison: === would stop at the first different byte,
  // and that timing difference can leak how close a guess was.
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
