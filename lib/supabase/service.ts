import { createClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client with service/secret key
 * Use this for server-side operations that need to bypass RLS
 * (e.g., webhooks, admin operations)
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  // Support both new (SECRET_KEY) and legacy (SERVICE_ROLE_KEY) variable names
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      'Missing Supabase environment variables for service client. Please check your .env.local file:\n' +
        `NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✓' : '✗ Missing'}\n` +
        `SUPABASE_SECRET_KEY: ${supabaseSecretKey ? '✓' : '✗ Missing'}`
    )
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

