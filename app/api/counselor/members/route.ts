import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/counselor/members
 * List all members in the counselor's organization
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const supabase = createServiceClient()

    // Check if user is an org admin
    const { data: adminMembership } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('profile_id', profile.id)
      .eq('role', 'admin')
      .single()

    if (!adminMembership) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only school administrators can view members' } },
        { status: 403 }
      )
    }

    const orgId = adminMembership.org_id

    // Get URL params for filtering
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const status = searchParams.get('status')

    // Build query
    let query = supabase
      .from('org_members')
      .select(`
        id,
        role,
        status,
        year_grade,
        invited_email,
        invited_at,
        joined_at,
        metadata,
        profile:profiles!org_members_profile_id_fkey(
          id,
          display_name,
          avatar_url,
          headline,
          consent_given,
          parent_consent_given
        )
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (role) {
      query = query.eq('role', role)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: members, error } = await query

    if (error) {
      console.error('Error fetching members:', error)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch members' } },
        { status: 500 }
      )
    }

    // Group by role
    const mentors = (members || []).filter(m => m.role === 'mentor')
    const mentees = (members || []).filter(m => m.role === 'mentee')
    const admins = (members || []).filter(m => m.role === 'admin')

    return NextResponse.json({
      data: {
        all: members || [],
        mentors,
        mentees,
        admins,
        stats: {
          total: members?.length || 0,
          active: members?.filter(m => m.status === 'active').length || 0,
          pending: members?.filter(m => m.status === 'pending').length || 0,
          mentors: mentors.length,
          mentees: mentees.length,
          admins: admins.length,
        },
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/counselor/members:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch members' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/counselor/members
 * Add a single member to the organization
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const profile = await ensureUserAndProfile()

    if (!profile || !profile.id) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      )
    }

    const supabase = createServiceClient()

    // Check if user is an org admin
    const { data: adminMembership } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('profile_id', profile.id)
      .eq('role', 'admin')
      .single()

    if (!adminMembership) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only school administrators can add members' } },
        { status: 403 }
      )
    }

    const orgId = adminMembership.org_id
    const body = await request.json()
    const { email, name, role, year_grade } = body

    // Validate input
    if (!email || !role) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'email and role are required' } },
        { status: 400 }
      )
    }

    if (!['mentor', 'mentee', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'role must be mentor, mentee, or admin' } },
        { status: 400 }
      )
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', orgId)
      .eq('invited_email', email.toLowerCase())
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: { code: 'ALREADY_EXISTS', message: 'This email is already a member or invited' } },
        { status: 409 }
      )
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, profiles!profiles_user_id_fkey(id)')
      .eq('email', email.toLowerCase())
      .single()

    let memberId: string

    if (existingUser?.profiles) {
      const profiles = Array.isArray(existingUser.profiles) ? existingUser.profiles : [existingUser.profiles]
      const userProfile = profiles[0]

      if (userProfile) {
        // Check if already a member by profile
        const { data: existingByProfile } = await supabase
          .from('org_members')
          .select('id')
          .eq('org_id', orgId)
          .eq('profile_id', userProfile.id)
          .single()

        if (existingByProfile) {
          return NextResponse.json(
            { error: { code: 'ALREADY_EXISTS', message: 'This user is already a member' } },
            { status: 409 }
          )
        }

        // Add as active member
        const { data: newMember, error: createError } = await supabase
          .from('org_members')
          .insert({
            org_id: orgId,
            profile_id: userProfile.id,
            role,
            status: 'active',
            year_grade,
            joined_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (createError) {
          return NextResponse.json(
            { error: { code: 'CREATE_FAILED', message: createError.message } },
            { status: 500 }
          )
        }

        memberId = newMember.id
      } else {
        return NextResponse.json(
          { error: { code: 'CREATE_FAILED', message: 'User has no profile' } },
          { status: 500 }
        )
      }
    } else {
      // Create pending invite
      const { data: newMember, error: createError } = await supabase
        .from('org_members')
        .insert({
          org_id: orgId,
          profile_id: null,
          role,
          status: 'pending',
          invited_email: email.toLowerCase(),
          invited_at: new Date().toISOString(),
          year_grade,
          metadata: name ? { imported_name: name } : {},
        })
        .select('id')
        .single()

      if (createError) {
        return NextResponse.json(
          { error: { code: 'CREATE_FAILED', message: createError.message } },
          { status: 500 }
        )
      }

      memberId = newMember.id
    }

    return NextResponse.json(
      {
        data: {
          member_id: memberId,
          status: existingUser ? 'active' : 'pending',
          message: existingUser
            ? 'Member added successfully'
            : 'Invitation created. The user will be added when they sign up.',
        },
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in POST /api/counselor/members:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to add member' } },
      { status: 500 }
    )
  }
}
