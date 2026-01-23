/**
 * Utility functions for generating and validating URL slugs/handles
 */

const RESERVED_WORDS = [
  'admin',
  'api',
  'dashboard',
  'settings',
  'sign-in',
  'sign-up',
  'pricing',
  'g',
  'm',
  'app',
  'www',
  'mail',
  'ftp',
  'localhost',
  'test',
  'staging',
  'production',
]

/**
 * Generate a URL-safe slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50) // Max 50 characters
}

/**
 * Validate slug format
 */
export function isValidSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug || slug.length < 3) {
    return { valid: false, error: 'Slug must be at least 3 characters' }
  }

  if (slug.length > 50) {
    return { valid: false, error: 'Slug must be 50 characters or less' }
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return {
      valid: false,
      error: 'Slug can only contain lowercase letters, numbers, and hyphens',
    }
  }

  if (slug.startsWith('-') || slug.endsWith('-')) {
    return { valid: false, error: 'Slug cannot start or end with a hyphen' }
  }

  if (RESERVED_WORDS.includes(slug)) {
    return { valid: false, error: 'This slug is reserved and cannot be used' }
  }

  return { valid: true }
}

/**
 * Generate a unique slug by checking availability
 */
export async function generateUniqueSlug(
  baseText: string,
  checkAvailability: (slug: string) => Promise<boolean>
): Promise<string> {
  let slug = generateSlug(baseText)

  // If base slug is empty or invalid, use a default
  if (!slug) {
    slug = 'goal'
  }

  let isAvailable = await checkAvailability(slug)

  // If available, return it
  if (isAvailable) {
    return slug
  }

  // Otherwise, try with numbers appended
  let counter = 1
  while (!isAvailable && counter < 1000) {
    const newSlug = `${slug}-${counter}`
    isAvailable = await checkAvailability(newSlug)
    if (isAvailable) {
      return newSlug
    }
    counter++
  }

  // Fallback: use timestamp
  return `${slug}-${Date.now().toString(36)}`
}

/**
 * Generate a handle (similar to slug but for profiles)
 */
export function generateHandle(text: string): string {
  return generateSlug(text)
}

/**
 * Validate handle format (same as slug)
 */
export function isValidHandle(handle: string): { valid: boolean; error?: string } {
  return isValidSlug(handle)
}

/**
 * Generate a unique handle
 */
export async function generateUniqueHandle(
  baseText: string,
  checkAvailability: (handle: string) => Promise<boolean>
): Promise<string> {
  return generateUniqueSlug(baseText, checkAvailability)
}





