import { auth, currentUser } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Get the current user's Clerk user ID
 */
export async function getClerkUserId() {
  const { userId } = await auth()
  return userId
}

/**
 * Get the current user's Supabase user ID from Clerk user ID
 */
export async function getSupabaseUserId() {
  const clerkUserId = await getClerkUserId()
  if (!clerkUserId) return null

  // Use service client since RLS policies expect Clerk JWT claims
  // which Supabase doesn't receive when using Clerk authentication
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (error || !data) return null
  return data.id
}

/**
 * Ensure user and profile exist in Supabase (create if missing)
 * This is a fallback in case the webhook didn't fire
 */
export async function ensureUserAndProfile() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return null

  const supabase = createServiceClient() // Use service role to bypass RLS

  // Check if user exists
  let { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('clerk_user_id', clerkUserId)
    .single()

  // If user doesn't exist by clerk_user_id, create or update
  if (userError || !user) {
    // Get user info from Clerk
    const clerkUser = await currentUser()

    if (!clerkUser) {
      console.error('No Clerk user found')
      return null
    }

    const primaryEmail = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId
    )?.emailAddress

    if (!primaryEmail) {
      console.error('No email found for Clerk user')
      return null
    }

    // First, check if a user with this email already exists (from a previous Clerk account)
    const { data: existingUserByEmail } = await supabase
      .from('users')
      .select('id, email, clerk_user_id')
      .eq('email', primaryEmail)
      .single()

    if (existingUserByEmail) {
      // Update the existing user's clerk_user_id to the new one
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ clerk_user_id: clerkUserId })
        .eq('id', existingUserByEmail.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating user clerk_user_id:', updateError)
        return null
      }

      user = updatedUser
    } else {
      // Create new user
      const { data: newUser, error: createUserError } = await supabase
        .from('users')
        .insert({
          clerk_user_id: clerkUserId,
          email: primaryEmail,
        })
        .select()
        .single()

      if (createUserError) {
        console.error('Error creating user:', JSON.stringify(createUserError, null, 2))
        console.error('Error details:', {
          code: createUserError.code,
          message: createUserError.message,
          details: createUserError.details,
          hint: createUserError.hint,
        })
        return null
      }

      user = newUser
    }
  }

  // Check if profile exists
  let { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // If profile doesn't exist, create it
  if (profileError || !profile) {
    const clerkUser = await currentUser()
    
    if (!clerkUser) {
      console.error('No Clerk user found for profile creation')
      return null
    }

    const displayName = clerkUser.firstName && clerkUser.lastName
      ? `${clerkUser.firstName} ${clerkUser.lastName}`.trim()
      : clerkUser.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User'

    const { data: newProfile, error: createProfileError } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        display_name: displayName,
        is_mentee: true, // Default to mentee
        is_mentor: false,
      })
      .select()
      .single()

    if (createProfileError) {
      console.error('Error creating profile:', createProfileError)
      return null
    }

    profile = newProfile
  }

  return profile
}

/**
 * Get the current user's profile ID
 */
export async function getProfileId() {
  const userId = await getSupabaseUserId()
  if (!userId) return null

  // Use service client since RLS policies expect Clerk JWT claims
  // which Supabase doesn't receive when using Clerk authentication
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  return data.id
}

/**
 * Get the current user's profile with role information
 * Creates profile if it doesn't exist (fallback for webhook failures)
 */
export async function getCurrentProfile() {
  // First try to ensure user and profile exist (handles webhook delays)
  const ensuredProfile = await ensureUserAndProfile()
  if (ensuredProfile) {
    return ensuredProfile
  }

  // Fallback: try to get existing profile using service client
  // (RLS policies expect Clerk JWT claims which Supabase doesn't receive)
  const clerkUserId = await getClerkUserId()
  if (!clerkUserId) {
    return null
  }

  const supabase = createServiceClient() // Use service client to bypass RLS
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!user) {
    return null
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error || !profile) {
    return null
  }

  return profile
}

/**
 * Check if current user is a mentor
 */
export async function isMentor() {
  const profile = await getCurrentProfile()
  return profile?.is_mentor ?? false
}

/**
 * Check if current user is a mentee
 */
export async function isMentee() {
  const profile = await getCurrentProfile()
  return profile?.is_mentee ?? false
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth() {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Unauthorized')
  }
  return userId
}

/**
 * Require mentor role - redirects or throws error if not mentor
 * @param options.redirectTo - If provided, redirect to this URL instead of throwing
 * @returns The current profile if user is a mentor
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
 * Require mentee role - throws error if not mentee
 */
export async function requireMentee() {
  await requireAuth()
  const mentee = await isMentee()
  if (!mentee) {
    throw new Error('Forbidden: Must be a mentee')
  }
}
