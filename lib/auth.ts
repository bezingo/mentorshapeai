import { betterAuth } from 'better-auth'
import { Pool } from 'pg'

/**
 * Better Auth configuration
 * 
 * Authentication is handled via:
 * - Email/password (always available)
 * - Google OAuth (optional, requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
 * 
 * Database: Postgres via Supabase (using SUPABASE_DB_URL with pg Pool)
 */

// Determine if we're in a local development environment
const isLocalhost = process.env.SUPABASE_DB_URL?.includes('localhost') ||
                    process.env.SUPABASE_DB_URL?.includes('127.0.0.1')

// Create pg Pool for Better Auth database adapter
// Better Auth 1.7+ requires a native pg Pool instance, not a URL string
const createDatabasePool = (): Pool | undefined => {
  const connectionString = process.env.SUPABASE_DB_URL
  if (!connectionString) {
    return undefined
  }
  
  return new Pool({
    connectionString,
    // SSL configuration for Supabase from Vercel serverless
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
    // Conservative pool settings for serverless (Vercel functions)
    max: 3,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
  })
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
const pool = createDatabasePool()
export const auth = betterAuth({
  database: pool,
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
  trustedOrigins: Array.from(
    new Set(
      [
        process.env.BETTER_AUTH_URL,
        process.env.NEXT_PUBLIC_APP_URL,
        'http://localhost:3000',
      ].filter((origin): origin is string => Boolean(origin))
    )
  ),
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
