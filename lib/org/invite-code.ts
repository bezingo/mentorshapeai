import * as crypto from 'crypto'

/** Generate a short, URL-safe organization invite code. */
export function generateOrgInviteCode(): string {
  return crypto.randomBytes(5).toString('hex')
}
