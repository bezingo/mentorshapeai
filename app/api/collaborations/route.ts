import { NextResponse, NextRequest } from 'next/server'
import { requireAuth, ensureUserAndProfile } from '@/lib/clerk'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import {
  CreateCollaborationSchema,
  ListCollaborationsQuerySchema,
} from '@/lib/validations/collaboration'

/**
 * GET /api/collaborations
 * List user's collaborations with filters (as_mentor, as_mentee, status)
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

    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const queryParams = {
      as_mentor: searchParams.get('as_mentor') ?? undefined,
      as_mentee: searchParams.get('as_mentee') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      limit: searchParams.get('limit') ?? '50',
      offset: searchParams.get('offset') ?? '0',
    }

    const parseResult = ListCollaborationsQuerySchema.safeParse(queryParams)
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

    const { as_mentor, as_mentee, status, limit = 50, offset = 0 } = parseResult.data

    const supabase = createServiceClient()

    // Build query with related data
    let query = supabase
      .from('collaborations')
      .select(
        `
        *,
        goal:goals!collaborations_goal_id_fkey(
          id,
          title,
          description,
          status,
          category
        ),
        mentor_profile:profiles!collaborations_mentor_profile_id_fkey(
          id,
          display_name,
          avatar_url,
          handle
        ),
        mentee_profile:profiles!collaborations_mentee_profile_id_fkey(
          id,
          display_name,
          avatar_url,
          handle
        ),
        offer:mentor_offers!collaborations_offer_id_fkey(
          id,
          title,
          type,
          duration_minutes
        )
      `
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply role filters
    if (as_mentor && !as_mentee) {
      // Only collaborations where user is mentor
      query = query.eq('mentor_profile_id', profile.id)
    } else if (as_mentee && !as_mentor) {
      // Only collaborations where user is mentee
      query = query.eq('mentee_profile_id', profile.id)
    } else {
      // Default: all collaborations for this user (as either mentor or mentee)
      query = query.or(
        `mentor_profile_id.eq.${profile.id},mentee_profile_id.eq.${profile.id}`
      )
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
    }

    const { data: collaborations, error } = await query

    if (error) {
      console.error('Error fetching collaborations:', error)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    // Add role context to each collaboration
    const collaborationsWithRole = (collaborations || []).map((collab) => ({
      ...collab,
      user_role:
        collab.mentor_profile_id === profile.id
          ? 'mentor'
          : collab.mentee_profile_id === profile.id
            ? 'mentee'
            : null,
    }))

    return NextResponse.json({ data: collaborationsWithRole })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/collaborations:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch collaborations' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/collaborations
 * Create a new collaboration request from mentee to mentor
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

    const body = await request.json()

    // Validate input
    const parseResult = CreateCollaborationSchema.safeParse(body)
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

    const { goal_id, mentor_profile_id, offer_id, request_message } = parseResult.data

    const supabase = createServiceClient()

    // Validate: Cannot request collaboration with yourself
    if (mentor_profile_id === profile.id) {
      return NextResponse.json(
        {
          error: {
            code: 'SELF_COLLABORATION',
            message: 'Cannot create a collaboration with yourself',
          },
        },
        { status: 400 }
      )
    }

    // Validate: Goal must exist and belong to the requesting user
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('id, profile_id, status')
      .eq('id', goal_id)
      .single()

    if (goalError || !goal) {
      return NextResponse.json(
        { error: { code: 'GOAL_NOT_FOUND', message: 'Goal not found' } },
        { status: 404 }
      )
    }

    if (goal.profile_id !== profile.id) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You can only request collaboration for your own goals',
          },
        },
        { status: 403 }
      )
    }

    // Validate: Goal should be active
    if (goal.status !== 'active' && goal.status !== 'draft') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_GOAL_STATUS',
            message: 'Can only request collaboration for active or draft goals',
          },
        },
        { status: 400 }
      )
    }

    // Validate: Mentor profile must exist and be a mentor
    const { data: mentorProfile, error: mentorError } = await supabase
      .from('profiles')
      .select('id, is_mentor, display_name')
      .eq('id', mentor_profile_id)
      .single()

    if (mentorError || !mentorProfile) {
      return NextResponse.json(
        { error: { code: 'MENTOR_NOT_FOUND', message: 'Mentor profile not found' } },
        { status: 404 }
      )
    }

    if (!mentorProfile.is_mentor) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_A_MENTOR',
            message: 'The selected user is not registered as a mentor',
          },
        },
        { status: 400 }
      )
    }

    // Validate: If offer_id is provided, it must belong to the mentor
    if (offer_id) {
      const { data: offer, error: offerError } = await supabase
        .from('mentor_offers')
        .select('id, mentor_profile_id, is_active')
        .eq('id', offer_id)
        .single()

      if (offerError || !offer) {
        return NextResponse.json(
          { error: { code: 'OFFER_NOT_FOUND', message: 'Offer not found' } },
          { status: 404 }
        )
      }

      if (offer.mentor_profile_id !== mentor_profile_id) {
        return NextResponse.json(
          {
            error: {
              code: 'OFFER_MISMATCH',
              message: 'The offer does not belong to the selected mentor',
            },
          },
          { status: 400 }
        )
      }

      if (!offer.is_active) {
        return NextResponse.json(
          {
            error: {
              code: 'OFFER_INACTIVE',
              message: 'This offer is not currently active',
            },
          },
          { status: 400 }
        )
      }
    }

    // Check for existing collaboration between this mentee, mentor, and goal
    const { data: existingCollab, error: existingError } = await supabase
      .from('collaborations')
      .select('id, status')
      .eq('goal_id', goal_id)
      .eq('mentor_profile_id', mentor_profile_id)
      .single()

    if (existingCollab) {
      // Check if we can create a new request
      if (['pending', 'accepted', 'active'].includes(existingCollab.status)) {
        return NextResponse.json(
          {
            error: {
              code: 'COLLABORATION_EXISTS',
              message: `A collaboration already exists for this goal and mentor (status: ${existingCollab.status})`,
              existing_id: existingCollab.id,
            },
          },
          { status: 409 }
        )
      }
      // If previous collaboration was declined, cancelled, or completed, allow a new request
    }

    // Create the collaboration request
    const { data: newCollab, error: createError } = await supabase
      .from('collaborations')
      .insert({
        goal_id,
        mentor_profile_id,
        mentee_profile_id: profile.id,
        offer_id: offer_id || null,
        request_message: request_message || null,
        status: 'pending',
      })
      .select(
        `
        *,
        goal:goals!collaborations_goal_id_fkey(
          id,
          title,
          description,
          status,
          category
        ),
        mentor_profile:profiles!collaborations_mentor_profile_id_fkey(
          id,
          display_name,
          avatar_url,
          handle
        ),
        mentee_profile:profiles!collaborations_mentee_profile_id_fkey(
          id,
          display_name,
          avatar_url,
          handle
        ),
        offer:mentor_offers!collaborations_offer_id_fkey(
          id,
          title,
          type,
          duration_minutes
        )
      `
      )
      .single()

    if (createError) {
      console.error('Error creating collaboration:', createError)
      return NextResponse.json(
        { error: { code: 'CREATE_FAILED', message: createError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: {
          ...newCollab,
          user_role: 'mentee',
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

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0].message,
            details: error.errors,
          },
        },
        { status: 400 }
      )
    }

    console.error('Error in POST /api/collaborations:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create collaboration' } },
      { status: 500 }
    )
  }
}
