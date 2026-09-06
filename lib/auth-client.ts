import { createAuthClient } from 'better-auth/react'

/**
 * Better Auth client for browser-side authentication
 * 
 * Uses same-origin /api/auth endpoint - no need to hardcode baseURL.
 * The client automatically uses the current origin for API calls.
 */
export const authClient = createAuthClient({
  // Use relative path for same-origin requests
  // This works correctly in production (Vercel) and development (localhost)
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient
