import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Support both new (PUBLISHABLE_DEFAULT_KEY) and legacy (ANON_KEY) variable names
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file:\n' +
      `NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✓' : '✗ Missing'}\n` +
      `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: ${supabasePublishableKey ? '✓' : '✗ Missing'}`
    )
  }

  return createBrowserClient(supabaseUrl, supabasePublishableKey)
}

