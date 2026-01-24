import * as crypto from 'crypto'

/**
 * Token encryption utilities using AES-256-GCM
 * Used for encrypting OAuth tokens at rest in the database
 *
 * Key must be 32 bytes (256 bits) for AES-256
 * Set ENCRYPTION_KEY environment variable with a base64-encoded 32-byte key
 *
 * Generate a key with: node -e "console.log(crypto.randomBytes(32).toString('base64'))"
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 128 bits
const AUTH_TAG_LENGTH = 16 // 128 bits

/**
 * Get the encryption key from environment
 * Validates that the key is the correct length
 */
function getEncryptionKey(): Buffer {
  const keyBase64 = process.env.ENCRYPTION_KEY

  if (!keyBase64) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    )
  }

  const key = Buffer.from(keyBase64, 'base64')

  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be 32 bytes (256 bits) when decoded from base64. ` +
        `Got ${key.length} bytes. Generate a new key with: ` +
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    )
  }

  return key
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 *
 * @param plaintext - The string to encrypt
 * @returns Base64-encoded string containing: IV (16 bytes) + ciphertext + auth tag (16 bytes)
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey()

  // Generate a random initialization vector
  const iv = crypto.randomBytes(IV_LENGTH)

  // Create cipher with the key and IV
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  // Encrypt the plaintext
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  // Get the authentication tag
  const authTag = cipher.getAuthTag()

  // Combine IV + ciphertext + authTag and encode as base64
  const combined = Buffer.concat([iv, encrypted, authTag])

  return combined.toString('base64')
}

/**
 * Decrypt a ciphertext string using AES-256-GCM
 *
 * @param ciphertext - Base64-encoded string containing: IV + ciphertext + auth tag
 * @returns The decrypted plaintext string
 * @throws Error if decryption fails (invalid key, tampered data, etc.)
 */
export function decryptToken(ciphertext: string): string {
  const key = getEncryptionKey()

  // Decode the combined data
  const combined = Buffer.from(ciphertext, 'base64')

  // Validate minimum length: IV (16) + at least 1 byte ciphertext + auth tag (16)
  if (combined.length < IV_LENGTH + 1 + AUTH_TAG_LENGTH) {
    throw new Error('Invalid ciphertext: too short')
  }

  // Extract components
  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH)
  const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH)

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  // Decrypt
  try {
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ])

    return decrypted.toString('utf8')
  } catch {
    throw new Error('Decryption failed: invalid key or tampered data')
  }
}

/**
 * Encrypt OAuth tokens for storage
 * Encrypts both access_token and refresh_token
 *
 * @param tokens - Object containing access_token and refresh_token
 * @returns Object with encrypted tokens
 */
export function encryptOAuthTokens(tokens: {
  access_token: string
  refresh_token: string
}): {
  access_token: string
  refresh_token: string
} {
  return {
    access_token: encryptToken(tokens.access_token),
    refresh_token: encryptToken(tokens.refresh_token),
  }
}

/**
 * Decrypt OAuth tokens retrieved from storage
 *
 * @param encryptedTokens - Object containing encrypted access_token and refresh_token
 * @returns Object with decrypted tokens
 */
export function decryptOAuthTokens(encryptedTokens: {
  access_token: string
  refresh_token: string
}): {
  access_token: string
  refresh_token: string
} {
  return {
    access_token: decryptToken(encryptedTokens.access_token),
    refresh_token: decryptToken(encryptedTokens.refresh_token),
  }
}

/**
 * Generate a CSRF token for OAuth state parameter
 * Uses cryptographically secure random bytes
 *
 * @returns A URL-safe base64-encoded random string
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/**
 * Create an OAuth state parameter
 * Combines profile_id and CSRF token, then encrypts the whole thing
 *
 * @param profileId - The user's profile ID
 * @returns Encrypted state string
 */
export function createOAuthState(profileId: string): string {
  const csrfToken = generateCsrfToken()
  const state = JSON.stringify({
    profile_id: profileId,
    csrf_token: csrfToken,
    timestamp: Date.now(),
  })

  return encryptToken(state)
}

/**
 * Parse and validate an OAuth state parameter
 *
 * @param encryptedState - The encrypted state string from the callback
 * @returns The parsed state object, or null if invalid
 */
export function parseOAuthState(encryptedState: string): {
  profile_id: string
  csrf_token: string
  timestamp: number
} | null {
  try {
    const decrypted = decryptToken(encryptedState)
    const state = JSON.parse(decrypted)

    // Validate required fields
    if (
      typeof state.profile_id !== 'string' ||
      typeof state.csrf_token !== 'string' ||
      typeof state.timestamp !== 'number'
    ) {
      return null
    }

    // Check if state is too old (10 minutes max)
    const TEN_MINUTES_MS = 10 * 60 * 1000
    if (Date.now() - state.timestamp > TEN_MINUTES_MS) {
      return null
    }

    return state
  } catch {
    return null
  }
}
