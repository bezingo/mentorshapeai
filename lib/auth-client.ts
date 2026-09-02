import { createAuthClient } from 'better-auth/react'

/**
 * Better Auth client for browser-side authentication
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient
