import type { SupabaseClient } from '@supabase/supabase-js'

export type OrgMemberRole = 'admin' | 'mentor' | 'mentee'

export async function getOrgMembership(
  supabase: SupabaseClient,
  orgId: string,
  profileId: string
) {
  const { data, error } = await supabase
    .from('org_members')
    .select('id, org_id, profile_id, role')
    .eq('org_id', orgId)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function requireOrgMember(
  supabase: SupabaseClient,
  orgId: string,
  profileId: string
) {
  const membership = await getOrgMembership(supabase, orgId, profileId)
  if (!membership) {
    return null
  }
  return membership
}

export async function requireOrgAdmin(
  supabase: SupabaseClient,
  orgId: string,
  profileId: string
) {
  const membership = await getOrgMembership(supabase, orgId, profileId)
  if (!membership || membership.role !== 'admin') {
    return null
  }
  return membership
}

export async function getProgramOrgId(
  supabase: SupabaseClient,
  programId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('programs')
    .select('org_id')
    .eq('id', programId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data.org_id
}
