/**
 * Organization access control utilities
 * 
 * M2: Role-based access for school tenancy
 */

import { createServiceClient } from '@/lib/supabase/service'

export type OrgRole = 'admin' | 'mentor' | 'mentee'

export interface OrgMembership {
  id: string
  org_id: string
  profile_id: string
  role: OrgRole
  status: string
  org: {
    id: string
    name: string
    domain: string | null
    is_school: boolean
    require_consent: boolean
    min_age: number
    allowed_domains: string[]
  }
}

/**
 * Get the user's org membership (if any)
 * A user belongs to at most one org for the pilot.
 */
export async function getOrgMembership(profileId: string): Promise<OrgMembership | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('org_members')
    .select(`
      id,
      org_id,
      profile_id,
      role,
      status,
      org:organizations!org_members_org_id_fkey(
        id,
        name,
        domain,
        is_school,
        require_consent,
        min_age,
        allowed_domains
      )
    `)
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  const org = Array.isArray(data.org) ? data.org[0] : data.org

  return {
    id: data.id,
    org_id: data.org_id,
    profile_id: data.profile_id,
    role: data.role as OrgRole,
    status: data.status,
    org: {
      id: org.id,
      name: org.name,
      domain: org.domain,
      is_school: org.is_school,
      require_consent: org.require_consent,
      min_age: org.min_age,
      allowed_domains: org.allowed_domains || [],
    },
  }
}

/**
 * Check if a user is an org admin (school-admin / counselor)
 */
export async function isOrgAdmin(profileId: string): Promise<boolean> {
  const membership = await getOrgMembership(profileId)
  return membership?.role === 'admin'
}

/**
 * Check if a user belongs to the same org as another user
 */
export async function areInSameOrg(profileId1: string, profileId2: string): Promise<boolean> {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('org_members')
    .select('org_id')
    .in('profile_id', [profileId1, profileId2])
    .eq('status', 'active')

  if (!data || data.length < 2) {
    return false
  }

  // Check if they share an org
  const orgIds = new Set(data.map(m => m.org_id))
  return orgIds.size < data.length // If fewer unique orgs than members, they share one
}

/**
 * Check if an email domain is allowed for an org
 */
export function isEmailDomainAllowed(email: string, allowedDomains: string[]): boolean {
  if (allowedDomains.length === 0) {
    return true // No restrictions
  }

  const emailDomain = email.split('@')[1]?.toLowerCase()
  if (!emailDomain) {
    return false
  }

  return allowedDomains.some(domain => 
    emailDomain === domain.toLowerCase() || 
    emailDomain.endsWith(`.${domain.toLowerCase()}`)
  )
}

/**
 * Get available mentors for a mentee in an org
 * Only returns approved mentors from the roster (invite-only, no marketplace)
 */
export async function getAvailableMentors(
  orgId: string,
  excludeProfileId?: string
): Promise<Array<{
  profile_id: string
  display_name: string
  avatar_url: string | null
  headline: string | null
}>> {
  const supabase = createServiceClient()

  let query = supabase
    .from('org_members')
    .select(`
      profile_id,
      profile:profiles!org_members_profile_id_fkey(
        id,
        display_name,
        avatar_url,
        headline,
        invite_only
      )
    `)
    .eq('org_id', orgId)
    .eq('status', 'active')
    .in('role', ['mentor', 'admin'])

  if (excludeProfileId) {
    query = query.neq('profile_id', excludeProfileId)
  }

  const { data } = await query

  return (data || []).map(m => {
    const p = Array.isArray(m.profile) ? m.profile[0] : m.profile
    return {
      profile_id: m.profile_id,
      display_name: p?.display_name || 'Unknown',
      avatar_url: p?.avatar_url || null,
      headline: p?.headline || null,
    }
  })
}

/**
 * Check if a user has given consent and can participate
 */
export async function canUserParticipate(profileId: string): Promise<{
  can_participate: boolean
  reason?: string
}> {
  const supabase = createServiceClient()

  // Get profile consent data
  const { data: profile } = await supabase
    .from('profiles')
    .select('date_of_birth, consent_given, parent_consent_given')
    .eq('id', profileId)
    .single()

  if (!profile) {
    return { can_participate: false, reason: 'Profile not found' }
  }

  // Get org requirements
  const membership = await getOrgMembership(profileId)
  
  // If not in an org with consent requirements, allow
  if (!membership || !membership.org.require_consent) {
    return { can_participate: true }
  }

  // Check consent
  if (!profile.consent_given) {
    return { can_participate: false, reason: 'User consent required' }
  }

  // Check age and parent consent
  if (profile.date_of_birth) {
    const dob = new Date(profile.date_of_birth)
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const monthDiff = today.getMonth() - dob.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--
    }

    if (age < membership.org.min_age) {
      return { can_participate: false, reason: `Minimum age is ${membership.org.min_age}` }
    }

    if (age < 18 && !profile.parent_consent_given) {
      return { can_participate: false, reason: 'Parent/guardian consent required' }
    }
  }

  return { can_participate: true }
}
