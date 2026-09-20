import type { SupabaseClient } from '@supabase/supabase-js'

export async function resolveProfileIdByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<string | null> {
  const normalized = email.trim().toLowerCase()

  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .ilike('email', normalized)
    .maybeSingle()

  if (error || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return null
  }

  return profile.id
}
