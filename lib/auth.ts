import { betterAuth } from 'better-auth'

/**
 * Better Auth configuration
 * 
 * Authentication is handled via:
 * - Email/password (always available)
 * - Google OAuth (optional, requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
 * 
 * Database: Postgres via Supabase (using SUPABASE_DB_URL)
 */

// Get connection string for Better Auth
const getConnectionString = (): string => {
  // Direct database connection is required for Better Auth
  if (process.env.SUPABASE_DB_URL) {
    return process.env.SUPABASE_DB_URL
  }
  
  // During build or when env vars are missing, use a placeholder
  // The actual auth will use the service client pattern in auth-helpers.ts
  return 'placeholder://build-time'
}

// Build social providers configuration
const getSocialProviders = () => {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      },
    }
  }
  return undefined
}

// Better Auth instance
export const auth = betterAuth({
  database: {
    type: 'postgres',
    url: getConnectionString(),
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: getSocialProviders(),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET || 'placeholder-secret-for-build',
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  ],
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
