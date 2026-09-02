import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Auth helpers for server-side authentication
 * 
 * These functions replace the Clerk-based auth helpers.
 * All database operations use the service role client.
 */

interface SessionUser {
  id: string
  email: string
  name: string | null
  image: string | null
}

interface Session {
  user: SessionUser
  session: {
    id: string
    expiresAt: Date
  }
}

/**
 * Get the current session from Better Auth cookies
 */
export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('better-auth.session_token')?.value

    if (!sessionToken) {
      return null
    }

    const supabase = createServiceClient()
    
    // Look up session in database
    const { data: session, error: sessionError } = await supabase
      .from('session')
      .select('id, userId:userId, expiresAt:expiresAt')
      .eq('token', sessionToken)
      .single()

    if (sessionError || !session) {
      return null
    }

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      return null
    }

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('id, email, name, image')
      .eq('id', session.userId)
      .single()

    if (userError || !user) {
      return null
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
      session: {
        id: session.id,
        expiresAt: new Date(session.expiresAt),
      },
    }
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

/**
 * Get the current user's auth ID
 */
export async function getAuthUserId(): Promise<string | null> {
  const session = await getSession()
  return session?.user.id ?? null
}

/**
 * Get or create profile for the current user
 * On sign-up, creates a profile row with default mentee role
 */
export async function getCurrentProfile() {
  const session = await getSession()
  if (!session) {
    return null
  }

  const supabase = createServiceClient()

  // First, try to find profile by auth_user_id
  let { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .single()

  if (!error && profile) {
    return profile
  }

  // Profile doesn't exist - create it
  // First, ensure user record exists in our users table
  let { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('better_auth_user_id', session.user.id)
    .single()

  if (!user) {
    // Create user record
    const { data: newUser, error: createUserError } = await supabase
      .from('users')
      .insert({
        better_auth_user_id: session.user.id,
        email: session.user.email,
      })
      .select()
      .single()

    if (createUserError) {
      console.error('Error creating user:', createUserError)
      return null
    }

    user = newUser
  }

  if (!user) {
    console.error('Failed to create or find user')
    return null
  }

  // Create profile
  const displayName = session.user.name || session.user.email.split('@')[0]

  const { data: newProfile, error: createProfileError } = await supabase
    .from('profiles')
    .insert({
      user_id: user.id,
      auth_user_id: session.user.id,
      display_name: displayName,
      avatar_url: session.user.image,
      is_mentee: true,
      is_mentor: false,
    })
    .select()
    .single()

  if (createProfileError) {
    console.error('Error creating profile:', createProfileError)
    return null
  }

  return newProfile
}

/**
 * Get the current user's profile ID
 */
export async function getProfileId(): Promise<string | null> {
  const profile = await getCurrentProfile()
  return profile?.id ?? null
}

/**
 * Check if current user is a mentor
 */
export async function isMentor(): Promise<boolean> {
  const profile = await getCurrentProfile()
  return profile?.is_mentor ?? false
}

/**
 * Check if current user is a mentee
 */
export async function isMentee(): Promise<boolean> {
  const profile = await getCurrentProfile()
  return profile?.is_mentee ?? false
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(): Promise<string> {
  const userId = await getAuthUserId()
  if (!userId) {
    throw new Error('Unauthorized')
  }
  return userId
}

/**
 * Require mentor role
 */
export async function requireMentor(options?: { redirectTo?: string }) {
  const { redirect } = await import('next/navigation')
  
  await requireAuth()
  const profile = await getCurrentProfile()
  
  if (!profile?.is_mentor) {
    if (options?.redirectTo) {
      redirect(options.redirectTo)
    }
    throw new Error('Forbidden: Must be a mentor')
  }
  
  return profile
}

/**
 * Require mentee role
 */
export async function requireMentee() {
  await requireAuth()
  const mentee = await isMentee()
  if (!mentee) {
    throw new Error('Forbidden: Must be a mentee')
  }
}

/**
 * Alias for getCurrentProfile for backward compatibility
 * (used in API routes that previously called ensureUserAndProfile)
 */
export const ensureUserAndProfile = getCurrentProfile

/**
 * Check if email domain is allowed for an organization
 */
export async function checkEmailDomainAllowed(email: string, orgId?: string): Promise<boolean> {
  if (!orgId) return true // No org restriction
  
  const supabase = createServiceClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('allowed_domains')
    .eq('id', orgId)
    .single()

  if (!org?.allowed_domains || org.allowed_domains.length === 0) {
    return true // No domain restriction
  }

  const emailDomain = email.split('@')[1]?.toLowerCase()
  return org.allowed_domains.some((domain: string) => {
    const normalizedDomain = domain.toLowerCase()
    return emailDomain === normalizedDomain || emailDomain.endsWith(`.${normalizedDomain}`)
  })
}
