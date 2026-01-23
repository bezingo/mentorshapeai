/**
 * Brandfetch Logo API Integration
 * 
 * Documentation: https://developers.brandfetch.com/reference/logo-api
 * 
 * Usage:
 * - For direct image URLs: Use getBrandfetchLogoUrl()
 * - For React components: Use BrandfetchLogo component
 */

export interface BrandfetchLogoOptions {
  /** Domain (e.g., 'nike.com'), Brand ID, ISIN, or Stock Ticker */
  identifier: string
  /** Logo type: icon (default), logo, or symbol */
  type?: 'icon' | 'logo' | 'symbol'
  /** Theme: light or dark */
  theme?: 'light' | 'dark'
  /** Width in pixels */
  w?: number
  /** Height in pixels */
  h?: number
  /** Fallback behavior */
  fallback?: 'brandfetch' | 'transparent' | 'lettermark' | '404'
}

/**
 * Generate a Brandfetch logo URL
 * 
 * @param options Logo configuration options
 * @returns Brandfetch CDN URL for the logo
 * 
 * @example
 * // Simple usage with domain
 * const logoUrl = getBrandfetchLogoUrl({ identifier: 'nike.com' })
 * 
 * @example
 * // Full configuration
 * const logoUrl = getBrandfetchLogoUrl({
 *   identifier: 'nike.com',
 *   type: 'logo',
 *   theme: 'dark',
 *   w: 400,
 *   h: 400
 * })
 */
export function getBrandfetchLogoUrl(options: BrandfetchLogoOptions): string {
  const { identifier, type = 'icon', theme, w, h, fallback } = options
  
  // Client ID must be public since it's used in client-side img src URLs
  // Add NEXT_PUBLIC_ prefix to BRANDFETCH_CLIENT_ID in .env.local for client-side usage
  const clientId = 
    process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID || 
    (typeof window !== 'undefined' ? '' : process.env.BRANDFETCH_CLIENT_ID)
  
  if (!clientId) {
    if (typeof window !== 'undefined') {
      console.warn('NEXT_PUBLIC_BRANDFETCH_CLIENT_ID not found. Add NEXT_PUBLIC_ prefix to BRANDFETCH_CLIENT_ID in .env.local')
    }
    return ''
  }

  const baseUrl = 'https://cdn.brandfetch.io'
  const parts: string[] = [identifier]

  if (type && type !== 'icon') {
    parts.push(`type/${type}`)
  }

  if (theme) {
    parts.push(`theme/${theme}`)
  }

  if (w) {
    parts.push(`w/${w}`)
  }

  if (h) {
    parts.push(`h/${h}`)
  }

  if (fallback) {
    parts.push(`fallback/${fallback}`)
  }

  const path = parts.join('/')
  return `${baseUrl}/${path}?c=${clientId}`
}

/**
 * Get logo URL for a company domain
 * Convenience function for common use case
 */
export function getCompanyLogoUrl(
  domain: string,
  options?: Omit<BrandfetchLogoOptions, 'identifier'>
): string {
  return getBrandfetchLogoUrl({
    identifier: domain,
    ...options,
  })
}

/**
 * Get organization logo URL
 * Handles common organization domain formats
 */
export function getOrganizationLogoUrl(
  domainOrName: string,
  options?: Omit<BrandfetchLogoOptions, 'identifier'>
): string {
  // If it's already a domain, use as-is
  if (domainOrName.includes('.')) {
    return getCompanyLogoUrl(domainOrName, options)
  }

  // Otherwise, try to construct domain
  // This is a fallback - ideally domains should be stored in the database
  const domain = domainOrName.toLowerCase().replace(/\s+/g, '') + '.com'
  return getCompanyLogoUrl(domain, options)
}

