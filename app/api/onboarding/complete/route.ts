import { NextResponse } from 'next/server'
import { getSession, getCurrentProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'

type Role = 'mentee' | 'mentor' | 'both' | 'org_admin'
type GoalCategory = 'finance' | 'career' | 'personal_growth' | 'entrepreneurship'

interface OnboardingData {
  role: Role
  displayName: string
  avatarUrl?: string
  orgInviteCode?: string
  skipOrg: boolean
  goals: Array<{ category: GoalCategory; description: string }>
  dateOfBirth?: string
  guardianEmail?: string
  consented: boolean
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data: OnboardingData = await request.json()
    const supabase = createServiceClient()

    // Get or create the profile
    const profile = await getCurrentProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check if user is a minor
    let isMinor = false
    if (data.dateOfBirth) {
      const birthDate = new Date(data.dateOfBirth)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      isMinor = age < 18
    }

    // Determine safe defaults for minors
    const recordingConsent = isMinor ? false : true
    const inviteOnlyOnelink = isMinor ? true : false

    // Update profile with onboarding data
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        display_name: data.displayName,
        avatar_url: data.avatarUrl || profile.avatar_url,
        role: data.role,
        is_mentor: data.role === 'mentor' || data.role === 'both',
        is_mentee: data.role === 'mentee' || data.role === 'both',
        date_of_birth: data.dateOfBirth || null,
        consent_given: data.consented,
        consent_given_at: data.consented ? new Date().toISOString() : null,
        parent_email: data.guardianEmail || null,
        guardian_consent_pending: isMinor && data.guardianEmail ? true : false,
        guardian_consent_sent_at: isMinor && data.guardianEmail ? new Date().toISOString() : null,
        recording_consent: recordingConsent,
        invite_only_onelink: inviteOnlyOnelink,
        onboarding_state: 'completed',
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    // Handle organization join if invite code provided
    if (data.orgInviteCode && !data.skipOrg) {
      const { data: invite, error: inviteError } = await supabase
        .from('org_invites')
        .select('id, org_id, role, status, expires_at')
        .eq('invite_code', data.orgInviteCode.toUpperCase())
        .eq('status', 'pending')
        .single()

      if (!inviteError && invite) {
        // Check if invite is not expired
        const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date()
        
        if (!isExpired) {
          // Create org membership
          await supabase
            .from('org_members')
            .insert({
              org_id: invite.org_id,
              profile_id: profile.id,
              role: invite.role || 'mentee',
              status: 'active',
              joined_at: new Date().toISOString(),
            })

          // Mark invite as claimed
          await supabase
            .from('org_invites')
            .update({
              status: 'claimed',
              claimed_by: profile.id,
              claimed_at: new Date().toISOString(),
            })
            .eq('id', invite.id)
        }
      }
    }

    // Save onboarding goals if any
    if (data.goals && data.goals.length > 0) {
      const goalsToInsert = data.goals.map((goal, index) => ({
        profile_id: profile.id,
        category: goal.category,
        description: goal.description,
        priority: index,
      }))

      const { error: goalsError } = await supabase
        .from('onboarding_goals')
        .upsert(goalsToInsert, {
          onConflict: 'profile_id,category',
        })

      if (goalsError) {
        console.error('Error saving onboarding goals:', goalsError)
      }
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        role: data.role,
        onboardingCompleted: true,
      },
    })
  } catch (error) {
    console.error('Error completing onboarding:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
