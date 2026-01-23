import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

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

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

