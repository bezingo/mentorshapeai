import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

/**
 * Schema for creating a pair
 */
const CreatePairSchema = z.object({
  mentor_profile_id: z.string().uuid('Invalid mentor profile ID'),
  mentee_profile_id: z.string().uuid('Invalid mentee profile ID'),
  goal_id: z.string().uuid('Invalid goal ID').optional(),
  program_id: z.string().uuid('Invalid program ID').optional(),
  notes: z.string().max(1000).optional(),
})

/**
 * GET /api/counselor/pairs
 * List all pairs/matches in the counselor's org
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
        { error: { code: 'FORBIDDEN', message: 'Only school administrators can view pairs' } },
        { status: 403 }
      )
    }

    const orgId = adminMembership.org_id

    // Get URL params for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const programId = searchParams.get('program_id')

    // Fetch matches with related data
    let query = supabase
      .from('matches')
      .select(`
        id,
        status,
        match_score,
        notes,
        created_at,
        collaboration_id,
        program:programs!matches_program_id_fkey(id, name),
        mentor:profiles!matches_mentor_profile_id_fkey(id, display_name, avatar_url, public_handle),
        mentee:profiles!matches_mentee_profile_id_fkey(id, display_name, avatar_url, public_handle),
        collaboration:collaborations!matches_collaboration_id_fkey(
          id,
          status,
          goal:goals!collaborations_goal_id_fkey(id, title, category)
        )
      `)
      .eq('program.org_id', orgId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }
    if (programId) {
      query = query.eq('program_id', programId)
    }

    const { data: matches, error } = await query

    if (error) {
      console.error('Error fetching matches:', error)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch pairs' } },
        { status: 500 }
      )
    }

    // Also fetch collaborations in the org that may not have matches
    const { data: collaborations } = await supabase
      .from('collaborations')
      .select(`
        id,
        status,
        created_at,
        goal:goals!collaborations_goal_id_fkey(id, title, category),
        mentor:profiles!collaborations_mentor_profile_id_fkey(id, display_name, avatar_url),
        mentee:profiles!collaborations_mentee_profile_id_fkey(id, display_name, avatar_url)
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      data: {
        matches: matches || [],
        collaborations: collaborations || [],
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/counselor/pairs:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch pairs' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/counselor/pairs
 * Create a new mentor-mentee pair (manual matching)
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
        { error: { code: 'FORBIDDEN', message: 'Only school administrators can create pairs' } },
        { status: 403 }
      )
    }

    const orgId = adminMembership.org_id

    // Parse and validate request
    const body = await request.json()
    const parseResult = CreatePairSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors[0].message,
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      )
    }

    const { mentor_profile_id, mentee_profile_id, goal_id, program_id, notes } = parseResult.data

    // Verify both profiles are in the org
    const { data: mentorMember } = await supabase
      .from('org_members')
      .select('id, role')
      .eq('org_id', orgId)
      .eq('profile_id', mentor_profile_id)
      .single()

    const { data: menteeMember } = await supabase
      .from('org_members')
      .select('id, role')
      .eq('org_id', orgId)
      .eq('profile_id', mentee_profile_id)
      .single()

    if (!mentorMember) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Mentor is not a member of this organization' } },
        { status: 400 }
      )
    }

    if (!menteeMember) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Mentee is not a member of this organization' } },
        { status: 400 }
      )
    }

    // Validate roles
    if (mentorMember.role !== 'mentor' && mentorMember.role !== 'admin') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Selected mentor does not have mentor role' } },
        { status: 400 }
      )
    }

    if (menteeMember.role !== 'mentee') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Selected mentee does not have mentee role' } },
        { status: 400 }
      )
    }

    // Get or use program_id (use first active program if not specified)
    let finalProgramId = program_id
    if (!finalProgramId) {
      const { data: defaultProgram } = await supabase
        .from('programs')
        .select('id')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!defaultProgram) {
        // Create a default program
        const { data: newProgram, error: programError } = await supabase
          .from('programs')
          .insert({
            org_id: orgId,
            name: 'Default Program',
            is_active: true,
          })
          .select('id')
          .single()

        if (programError) {
          return NextResponse.json(
            { error: { code: 'CREATE_FAILED', message: 'Failed to create default program' } },
            { status: 500 }
          )
        }
        finalProgramId = newProgram.id
      } else {
        finalProgramId = defaultProgram.id
      }
    }

    // Get or create a goal for the mentee
    let finalGoalId = goal_id
    if (!finalGoalId) {
      // Check if mentee has an active goal
      const { data: existingGoal } = await supabase
        .from('goals')
        .select('id')
        .eq('profile_id', mentee_profile_id)
        .in('status', ['draft', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (existingGoal) {
        finalGoalId = existingGoal.id
      } else {
        // Create a placeholder goal
        const { data: newGoal, error: goalError } = await supabase
          .from('goals')
          .insert({
            profile_id: mentee_profile_id,
            title: 'Mentorship Goal',
            status: 'active',
            category: 'Personal Growth',
          })
          .select('id')
          .single()

        if (goalError) {
          return NextResponse.json(
            { error: { code: 'CREATE_FAILED', message: 'Failed to create goal for mentee' } },
            { status: 500 }
          )
        }
        finalGoalId = newGoal.id
      }
    }

    // Create the match record
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        program_id: finalProgramId,
        mentor_profile_id,
        mentee_profile_id,
        status: 'confirmed',
        created_by: profile.id,
        notes,
      })
      .select('id')
      .single()

    if (matchError) {
      console.error('Error creating match:', matchError)
      return NextResponse.json(
        { error: { code: 'CREATE_FAILED', message: 'Failed to create match' } },
        { status: 500 }
      )
    }

    // Create the collaboration
    const { data: collaboration, error: collabError } = await supabase
      .from('collaborations')
      .insert({
        goal_id: finalGoalId,
        mentor_profile_id,
        mentee_profile_id,
        org_id: orgId,
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (collabError) {
      console.error('Error creating collaboration:', collabError)
      return NextResponse.json(
        { error: { code: 'CREATE_FAILED', message: 'Failed to create collaboration' } },
        { status: 500 }
      )
    }

    // Link match to collaboration
    await supabase
      .from('matches')
      .update({ collaboration_id: collaboration.id })
      .eq('id', match.id)

    return NextResponse.json(
      {
        data: {
          match_id: match.id,
          collaboration_id: collaboration.id,
          goal_id: finalGoalId,
          program_id: finalProgramId,
          message: 'Pair created successfully',
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

    console.error('Error in POST /api/counselor/pairs:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create pair' } },
      { status: 500 }
    )
  }
}
